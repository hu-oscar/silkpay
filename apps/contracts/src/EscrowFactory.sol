// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

import {TradeEscrow} from "./TradeEscrow.sol";

/**
 * @title EscrowFactory — singleton that spawns one `TradeEscrow` per Yuán tx.
 * @notice The Server Action calls `create()` instead of deploying TradeEscrow
 *         directly. Benefits :
 *           - The frontend only needs the factory's address (one env var)
 *           - Every escrow is discoverable via the `EscrowCreated` event
 *           - The arbiter is fixed at the factory level, can't be spoofed
 *             by the buyer
 *
 *         The factory deployer is permanently the arbiter for every escrow
 *         it spawns. In V1 prod this would be a Safe multi-sig 3-of-5 ; in
 *         hackathon we use a single EOA stored in env (`ARBITER_PRIVATE_KEY`).
 */
contract EscrowFactory {
    address public immutable arbiter;

    event EscrowCreated(
        address indexed escrow,
        address indexed buyer,
        address indexed seller,
        uint256 totalAmount,
        bytes32 transactionRef
    );

    constructor(address arbiter_) {
        require(arbiter_ != address(0), "arbiter zero");
        arbiter = arbiter_;
    }

    /// @notice Deploy a new escrow. The caller (typically the Yuán backend
    ///         signing as the buyer) is NOT the arbiter — that's `arbiter`
    ///         set at construction.
    /// @param buyer The importer EOA — must approve + fund the escrow next.
    /// @param seller The supplier EOA — will receive each tranche on claim.
    /// @param token ERC-20 used for the escrow (test mUSDT for hackathon).
    /// @param amounts 3-tranche split (e.g. [30%, 50%, 20%] of total).
    /// @param deadlines Per-tranche refund deadlines (unix seconds).
    /// @param transactionRef Yuán transaction UUID (bytes32) — emitted on the
    ///         event so the frontend can map an on-chain escrow back to its
    ///         row in `transactions`.
    function create(
        address buyer,
        address seller,
        IERC20 token,
        uint128[3] calldata amounts,
        uint64[3] calldata deadlines,
        bytes32 transactionRef
    ) external returns (address escrow) {
        TradeEscrow e = new TradeEscrow(buyer, seller, arbiter, token, amounts, deadlines);
        uint256 total = uint256(amounts[0]) + uint256(amounts[1]) + uint256(amounts[2]);
        escrow = address(e);
        emit EscrowCreated(escrow, buyer, seller, total, transactionRef);
    }
}
