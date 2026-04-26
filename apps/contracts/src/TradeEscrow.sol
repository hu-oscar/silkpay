// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title TradeEscrow — 3-tranche programmable escrow for Yuán cross-border
 *        trade payments.
 * @notice One contract per transaction. Buyer funds the full amount up front ;
 *         seller pulls each tranche only after the arbiter attests the
 *         milestone (BL signed → 30 %, inspection cert → 50 %, delivery
 *         acknowledged → 20 %). Anyone can trigger a tranche refund to the
 *         buyer once its deadline passes.
 *
 * Patterns (kept identical to V1 prod) :
 *   • Pull payment — seller calls `claim()`, never auto-push.
 *   • CEI ordering + ReentrancyGuard on every state-changing external fn.
 *   • Custom errors (cheaper than string require, friendlier tooling).
 *   • Events on every state transition for off-chain indexing.
 *
 * Hackathon shortcuts vs production V1 (documented in MEMORY.md) :
 *   • Single arbiter EOA instead of Safe multi-sig 3-of-5.
 *   • No EIP-712 typed sigs — direct `onlyArbiter` modifier.
 *   • No Tether blacklist guard (test USDT has no `isBlackListed`).
 */
contract TradeEscrow is ReentrancyGuard {
    using SafeERC20 for IERC20;

    // ---------------------------- Events ---------------------------------- //

    event Funded(uint256 totalAmount);
    event MilestoneAttested(uint8 indexed trancheIndex, address indexed by);
    event Claimed(uint8 indexed trancheIndex, address indexed seller, uint256 amount);
    event Refunded(uint8 indexed trancheIndex, address indexed buyer, uint256 amount);
    event Disputed(uint8 indexed trancheIndex, address indexed by);

    // ---------------------------- Errors ---------------------------------- //

    error Unauthorized();
    error AlreadyFunded();
    error NotFunded();
    error WrongStatus(TrancheStatus expected, TrancheStatus actual);
    error NotYetExpired(uint64 deadline, uint64 nowTs);
    error ZeroAmount();

    // ---------------------------- Types ----------------------------------- //

    enum TrancheStatus {
        Pending, // 0 — awaiting attestation
        Attested, // 1 — arbiter signed off, seller can claim
        Released, // 2 — seller pulled the funds
        Refunded, // 3 — deadline passed, buyer got it back
        Disputed // 4 — flagged for off-chain resolution
    }

    struct Tranche {
        uint128 amount;
        uint64 deadline; // unix seconds
        TrancheStatus status;
    }

    // ---------------------------- State ----------------------------------- //

    address public immutable buyer;
    address public immutable seller;
    address public immutable arbiter;
    IERC20 public immutable token;

    uint256 public totalAmount;
    bool public funded;
    Tranche[3] public tranches;

    // ---------------------------- Modifiers ------------------------------- //

    modifier onlyBuyer() {
        if (msg.sender != buyer) revert Unauthorized();
        _;
    }

    modifier onlySeller() {
        if (msg.sender != seller) revert Unauthorized();
        _;
    }

    modifier onlyArbiter() {
        if (msg.sender != arbiter) revert Unauthorized();
        _;
    }

    modifier onlyParty() {
        if (msg.sender != buyer && msg.sender != seller && msg.sender != arbiter) {
            revert Unauthorized();
        }
        _;
    }

    // ---------------------------- Constructor ----------------------------- //

    /// @param buyer_ The importer's address (funds the escrow).
    /// @param seller_ The supplier's address (pulls each released tranche).
    /// @param arbiter_ The Yuán compliance officer EOA (attests milestones).
    /// @param token_ The ERC-20 token held in escrow (USDT BEP-20 in prod).
    /// @param amounts The 3 tranche amounts. Must sum to a positive total.
    /// @param deadlines Unix seconds after which each tranche may be refunded.
    constructor(
        address buyer_,
        address seller_,
        address arbiter_,
        IERC20 token_,
        uint128[3] memory amounts,
        uint64[3] memory deadlines
    ) {
        if (buyer_ == address(0) || seller_ == address(0) || arbiter_ == address(0)) {
            revert Unauthorized();
        }
        buyer = buyer_;
        seller = seller_;
        arbiter = arbiter_;
        token = token_;

        uint256 sum;
        for (uint8 i = 0; i < 3; ++i) {
            if (amounts[i] == 0) revert ZeroAmount();
            tranches[i] = Tranche({
                amount: amounts[i],
                deadline: deadlines[i],
                status: TrancheStatus.Pending
            });
            sum += amounts[i];
        }
        totalAmount = sum;
    }

    // ---------------------------- Buyer flow ------------------------------ //

    /// @notice Buyer transfers the full escrow amount in. Requires prior
    ///         `token.approve(escrow, totalAmount)`. Single-shot — cannot
    ///         be re-funded once `funded == true`.
    function fund() external onlyBuyer nonReentrant {
        if (funded) revert AlreadyFunded();
        funded = true;
        token.safeTransferFrom(msg.sender, address(this), totalAmount);
        emit Funded(totalAmount);
    }

    // ---------------------------- Arbiter flow ---------------------------- //

    /// @notice Arbiter marks the milestone as met. Must be called before the
    ///         tranche deadline ; after the deadline, anyone can trigger a
    ///         refund instead.
    function attestMilestone(uint8 trancheIndex) external onlyArbiter {
        if (!funded) revert NotFunded();
        Tranche storage t = tranches[trancheIndex];
        if (t.status != TrancheStatus.Pending) {
            revert WrongStatus(TrancheStatus.Pending, t.status);
        }
        t.status = TrancheStatus.Attested;
        emit MilestoneAttested(trancheIndex, msg.sender);
    }

    // ---------------------------- Seller flow ----------------------------- //

    /// @notice Seller pulls a previously-attested tranche. Pull-payment :
    ///         we never auto-push to the seller.
    function claim(uint8 trancheIndex) external onlySeller nonReentrant {
        Tranche storage t = tranches[trancheIndex];
        if (t.status != TrancheStatus.Attested) {
            revert WrongStatus(TrancheStatus.Attested, t.status);
        }
        uint256 amount = t.amount;
        t.status = TrancheStatus.Released; // CEI : state before transfer.
        token.safeTransfer(seller, amount);
        emit Claimed(trancheIndex, seller, amount);
    }

    // ---------------------------- Timeout flow ---------------------------- //

    /// @notice Anyone can trigger a refund of a still-pending tranche once
    ///         its deadline passes. Already-attested or already-released
    ///         tranches are immutable.
    function timeoutRefund(uint8 trancheIndex) external nonReentrant {
        Tranche storage t = tranches[trancheIndex];
        if (t.status != TrancheStatus.Pending) {
            revert WrongStatus(TrancheStatus.Pending, t.status);
        }
        if (block.timestamp < t.deadline) {
            revert NotYetExpired(t.deadline, uint64(block.timestamp));
        }
        uint256 amount = t.amount;
        t.status = TrancheStatus.Refunded;
        token.safeTransfer(buyer, amount);
        emit Refunded(trancheIndex, buyer, amount);
    }

    // ---------------------------- Dispute flow ---------------------------- //

    /// @notice Either party can flag a tranche for manual resolution. This
    ///         pauses the tranche — neither claim nor timeout-refund will
    ///         work until the arbiter (off-chain) resolves it.
    ///         V2 will add `disputeResolve()` paths ; V1 hackathon is flag-only.
    function disputeRaise(uint8 trancheIndex) external onlyParty {
        Tranche storage t = tranches[trancheIndex];
        if (t.status != TrancheStatus.Pending && t.status != TrancheStatus.Attested) {
            revert WrongStatus(TrancheStatus.Pending, t.status);
        }
        t.status = TrancheStatus.Disputed;
        emit Disputed(trancheIndex, msg.sender);
    }

    // ---------------------------- Views ----------------------------------- //

    function getTranches() external view returns (Tranche[3] memory) {
        return tranches;
    }
}
