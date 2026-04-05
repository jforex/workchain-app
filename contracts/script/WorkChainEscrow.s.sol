// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "../src/WorkChainEscrow.sol";

contract DeployWorkChainEscrow is Script {
    // Base Sepolia USDC address
    address constant USDC = 0x036CbD53842c5426634e7929541eC2318f3dCF7e;

    function run() external {
        vm.startBroadcast();
        new WorkChainEscrow(USDC);
        vm.stopBroadcast();
    }
}