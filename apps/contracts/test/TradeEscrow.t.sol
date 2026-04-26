// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {Test} from "forge-std/Test.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

import {EscrowFactory} from "../src/EscrowFactory.sol";
import {MockUSDT} from "../src/MockUSDT.sol";
import {TradeEscrow} from "../src/TradeEscrow.sol";

contract TradeEscrowTest is Test {
    MockUSDT internal usdt;
    EscrowFactory internal factory;
    TradeEscrow internal escrow;

    // Deterministic test addresses — easier to reason about reverts than vm.addr().
    address internal buyer = makeAddr("buyer-chinedu");
    address internal seller = makeAddr("seller-yiwu");
    address internal arbiter = makeAddr("arbiter-yuan");
    address internal stranger = makeAddr("stranger");

    // 3-tranche split of 30 000 mUSDT (6 decimals) = 9 000 / 15 000 / 6 000.
    uint128 internal constant T0 = 9_000 * 1e6;
    uint128 internal constant T1 = 15_000 * 1e6;
    uint128 internal constant T2 = 6_000 * 1e6;
    uint256 internal constant TOTAL = uint256(T0) + uint256(T1) + uint256(T2);

    function setUp() public {
        usdt = new MockUSDT();
        factory = new EscrowFactory(arbiter);

        usdt.mint(buyer, TOTAL);

        uint128[3] memory amounts = [T0, T1, T2];
        uint64[3] memory deadlines = [
            uint64(block.timestamp + 30 days),
            uint64(block.timestamp + 45 days),
            uint64(block.timestamp + 60 days)
        ];
        vm.prank(buyer);
        address e = factory.create(buyer, seller, IERC20(address(usdt)), amounts, deadlines, bytes32(uint256(1)));
        escrow = TradeEscrow(e);
    }

    function _fund() internal {
        vm.startPrank(buyer);
        usdt.approve(address(escrow), TOTAL);
        escrow.fund();
        vm.stopPrank();
    }

    // ---------------------- Happy path : 3 tranches release ---------------- //

    function test_HappyPath_AllThreeTranchesReleaseToSeller() public {
        _fund();
        assertEq(usdt.balanceOf(address(escrow)), TOTAL, "escrow holds total after fund");
        assertEq(usdt.balanceOf(seller), 0, "seller has 0 before claims");

        for (uint8 i = 0; i < 3; ++i) {
            vm.prank(arbiter);
            escrow.attestMilestone(i);

            vm.prank(seller);
            escrow.claim(i);
        }

        assertEq(usdt.balanceOf(seller), TOTAL, "seller has total after all 3 claims");
        assertEq(usdt.balanceOf(address(escrow)), 0, "escrow drained");
    }

    // ---------------------- Auth checks (custom errors) -------------------- //

    function test_OnlyBuyer_CanFund() public {
        usdt.mint(stranger, TOTAL);
        vm.startPrank(stranger);
        usdt.approve(address(escrow), TOTAL);
        vm.expectRevert(TradeEscrow.Unauthorized.selector);
        escrow.fund();
        vm.stopPrank();
    }

    function test_OnlyArbiter_CanAttest() public {
        _fund();
        vm.expectRevert(TradeEscrow.Unauthorized.selector);
        vm.prank(stranger);
        escrow.attestMilestone(0);
        vm.expectRevert(TradeEscrow.Unauthorized.selector);
        vm.prank(buyer);
        escrow.attestMilestone(0);
    }

    function test_OnlySeller_CanClaim() public {
        _fund();
        vm.prank(arbiter);
        escrow.attestMilestone(0);

        vm.expectRevert(TradeEscrow.Unauthorized.selector);
        vm.prank(buyer);
        escrow.claim(0);
        vm.expectRevert(TradeEscrow.Unauthorized.selector);
        vm.prank(stranger);
        escrow.claim(0);
    }

    function test_CannotClaimWithoutAttest() public {
        _fund();
        vm.expectRevert(
            abi.encodeWithSelector(
                TradeEscrow.WrongStatus.selector,
                TradeEscrow.TrancheStatus.Attested,
                TradeEscrow.TrancheStatus.Pending
            )
        );
        vm.prank(seller);
        escrow.claim(0);
    }

    function test_CannotFundTwice() public {
        _fund();
        vm.startPrank(buyer);
        usdt.mint(buyer, TOTAL);
        usdt.approve(address(escrow), TOTAL);
        vm.expectRevert(TradeEscrow.AlreadyFunded.selector);
        escrow.fund();
        vm.stopPrank();
    }

    // ---------------------- Timeout refund flow --------------------------- //

    function test_TimeoutRefund_AfterDeadlineSendsToBuyer() public {
        _fund();
        // Fast-forward past tranche-0 deadline.
        vm.warp(block.timestamp + 31 days);

        uint256 buyerBefore = usdt.balanceOf(buyer);
        // Anyone can trigger — even a stranger.
        vm.prank(stranger);
        escrow.timeoutRefund(0);

        assertEq(usdt.balanceOf(buyer) - buyerBefore, T0, "buyer refunded T0");
    }

    function test_TimeoutRefund_BeforeDeadlineReverts() public {
        _fund();
        vm.expectRevert();
        escrow.timeoutRefund(0);
    }

    // ---------------------- Dispute -------------------------------------- //

    function test_Dispute_FreezesTranche() public {
        _fund();
        vm.prank(buyer);
        escrow.disputeRaise(0);
        // After dispute, neither attest nor claim works on this tranche.
        vm.expectRevert();
        vm.prank(arbiter);
        escrow.attestMilestone(0);
        // Other tranches stay live.
        vm.prank(arbiter);
        escrow.attestMilestone(1);
        vm.prank(seller);
        escrow.claim(1);
        assertEq(usdt.balanceOf(seller), T1);
    }

    // ---------------------- Invariant : conservation ---------------------- //

    function test_Invariant_TotalConserved() public {
        _fund();

        // Sequence : claim T0, refund T2, dispute T1.
        vm.prank(arbiter);
        escrow.attestMilestone(0);
        vm.prank(seller);
        escrow.claim(0);

        vm.warp(block.timestamp + 61 days);
        vm.prank(stranger);
        escrow.timeoutRefund(2);

        // T1 stays in escrow (still Pending) — verify conservation.
        uint256 escrowBal = usdt.balanceOf(address(escrow));
        uint256 sellerBal = usdt.balanceOf(seller);
        uint256 buyerBal = usdt.balanceOf(buyer);
        assertEq(sellerBal + buyerBal + escrowBal, TOTAL, "total mUSDT conserved");
        assertEq(escrowBal, T1, "T1 still held");
        assertEq(sellerBal, T0, "seller got T0");
        assertEq(buyerBal, T2, "buyer refunded T2");
    }
}
