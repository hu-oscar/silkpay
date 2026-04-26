// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {Script, console2} from "forge-std/Script.sol";

import {EscrowFactory} from "../src/EscrowFactory.sol";
import {MockUSDT} from "../src/MockUSDT.sol";

/**
 * @title Deploy — one-shot script to bring up MockUSDT + EscrowFactory on
 *        Sepolia testnet.
 * @notice Run with :
 *
 *     forge script script/Deploy.s.sol \
 *         --rpc-url $SEPOLIA_RPC \
 *         --broadcast \
 *         --private-key $DEPLOYER_PRIVATE_KEY
 *
 * The factory deployer becomes the permanent arbiter of every escrow it
 * spawns — set `ARBITER_PRIVATE_KEY=$DEPLOYER_PRIVATE_KEY` in your
 * `.env.local` so the Server Actions sign attestations from the same EOA.
 *
 * Outputs (paste into `apps/web/.env.local` + Vercel env vars) :
 *   NEXT_PUBLIC_MOCK_USDT_ADDRESS=0x...
 *   NEXT_PUBLIC_ESCROW_FACTORY_ADDRESS=0x...
 */
contract Deploy is Script {
    function run() external {
        uint256 pk = vm.envUint("DEPLOYER_PRIVATE_KEY");
        address deployer = vm.addr(pk);

        console2.log("Deployer (will be arbiter) :", deployer);
        console2.log("Chain ID                   :", block.chainid);

        vm.startBroadcast(pk);
        MockUSDT usdt = new MockUSDT();
        EscrowFactory factory = new EscrowFactory(deployer);
        vm.stopBroadcast();

        console2.log("");
        console2.log("=== paste into apps/web/.env.local + Vercel env vars ===");
        console2.log("NEXT_PUBLIC_MOCK_USDT_ADDRESS=%s", address(usdt));
        console2.log("NEXT_PUBLIC_ESCROW_FACTORY_ADDRESS=%s", address(factory));
        console2.log("ARBITER_PRIVATE_KEY=<same as DEPLOYER_PRIVATE_KEY>");
    }
}
