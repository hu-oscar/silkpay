// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

/// @title Phase 0 sanity contract — verifies Foundry + remappings work.
/// @notice This file is deleted in Phase 5 when TradeEscrow.sol lands.
contract Sanity {
    string public constant NAME = "Yuan";

    function ping() external pure returns (string memory) {
        return NAME;
    }
}
