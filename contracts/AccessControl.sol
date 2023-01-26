//SPDX-License-Identifier: Unlicense
pragma solidity 0.8.17;

import "./IMGD.sol";

error MGD__Unauthorized();

contract MGD_ACCESS_CONTROL is IMGD{
  
    address private owner;

    /// @dev Set contract deployer as SuperUser
    constructor() {
        owner = msg.sender; 
    }

    mapping(address => bool) private address_isArtist;
    mapping(address => bool) private address_isCollector;

    modifier isArtist() {
         if (address_isArtist[msg.sender] != true) {
            revert MGD__Unauthorized();
        }
        _;
    }

    modifier isCollector() {
         if (address_isCollector[msg.sender] != true) {
            revert MGD__Unauthorized();
        }
        _;
    }

    modifier isCurator() {
         if (address_isCollector[msg.sender] != true) {
            revert MGD__Unauthorized();
        }
        _;
    }

    modifier isOwner() {
        require(msg.sender == owner, "Caller is not owner");
        _;
    }  

    function setRole(address _address, uint256 _roleID, bool _state) public {
        if (_roleID == 0){
            address_isArtist[_address] = _state;
        }
        else if (_roleID == 1){
            address_isCollector[_address] = _state;
        }
        emit RoleAdded(_address, _roleID, _state);
    }

    function superUser() public view returns(address){
        return owner;
    }


}