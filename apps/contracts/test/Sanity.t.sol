// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {Test} from "forge-std/Test.sol";
import {Sanity} from "../src/Sanity.sol";

contract SanityTest is Test {
    Sanity internal sanity;

    function setUp() public {
        sanity = new Sanity();
    }

    function test_Ping() public view {
        assertEq(sanity.ping(), "Yuan");
    }
}
