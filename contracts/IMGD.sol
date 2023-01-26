//SPDX-License-Identifier: Unlicense
pragma solidity 0.8.17;

interface IMGD {
   
    event RoleAdded(address _address, uint256 _roleID, bool _state);

    event Minted(address _address, uint256 _tokenID, string _tokenUri);
}