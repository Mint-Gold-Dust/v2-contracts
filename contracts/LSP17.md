// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.17;

import "@openzeppelin/contracts/access/Ownable.sol";

import "hardhat/console.sol";

contract LSP17 {
  uint256 public val;

  constructor() {}

  mapping(bytes4 => address) public extensible;

  function addExtensible(bytes4 selector, address sm_contract) public {
    extensible[selector] = sm_contract;
  }

  function removeExtensible(bytes4 selector, address sm_contract) public {
    delete extensible[selector];
  }

  function updateExtensible(bytes4 selector, address new_sm_contract) public {
    extensible[selector] = new_sm_contract;
  }

  fallback() external payable {
    require(msg.data.length == 0);
    val = 10;
  }

  receive() external payable {
    val = 10;
  }
}
