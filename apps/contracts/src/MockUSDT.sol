// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/**
 * @title MockUSDT — testnet ERC20 standing in for USDT BEP-20.
 * @notice 6-decimal token with a public `mint` function so anyone can fund
 *         themselves on BSC testnet during the hackathon demo.
 *         In production we point at the real USDT BEP-20 at
 *         `0x55d398326f99059fF775485246999027B3197955`.
 * @dev    Real USDT also exposes `isBlackListed(address)`. We omit it here —
 *         the hackathon escrow doesn't need the guard since test funds are
 *         worthless ; production `TradeEscrow` will check it before transfer.
 */
contract MockUSDT is ERC20 {
    constructor() ERC20("Mock USD Tether", "mUSDT") {}

    /// @notice USDT uses 6 decimals.
    function decimals() public pure override returns (uint8) {
        return 6;
    }

    /// @notice Open-faucet mint. Test-only — never deploy the production
    ///         escrow against a token with this surface.
    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }
}
