// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "../src/WorkChainEscrow.sol";

contract DeployWorkChainEscrow is Script {
    address constant USDC = 0x036CbD53842c5426634e7929541eC2318f3dCF7e;

    function run() external {
        vm.startBroadcast();

        // Deployer wallet acts as oracle initially
        // Can be updated later via setOracle()
        address deployer = msg.sender;

        new WorkChainEscrow(USDC, deployer);

        vm.stopBroadcast();
    }
}