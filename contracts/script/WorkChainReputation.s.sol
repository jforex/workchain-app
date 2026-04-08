// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "../src/WorkChainReputation.sol";

contract DeployWorkChainReputation is Script {
    // Our deployed escrow contract on Base Sepolia
    address constant ESCROW = 0xEa04d926132eEA022E676B2A842E7CaD6Ec36aEF;

    function run() external {
        vm.startBroadcast();
        new WorkChainReputation(ESCROW);
        vm.stopBroadcast();
    }
}