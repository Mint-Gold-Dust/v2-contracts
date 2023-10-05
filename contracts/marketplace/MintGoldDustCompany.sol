// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.18;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts/utils/introspection/IERC165.sol";

/// @title A contract responsible by Mint Gold Dust management.
/// @notice Contains functions for access levels management.
/// @author Mint Gold Dust LLC
/// @custom:contact klvh@mintgolddust.io
contract MintGoldDustCompany is Initializable, IERC165, OwnableUpgradeable {
    /**
     * @dev all attributes are public to be accessible by the other contracts
     * that are composed by this one
     */
    bytes4 private constant ERC165_ID = 0x01ffc9a7; //ERC165
    mapping(address => bool) public isArtistApproved;
    mapping(address => bool) public isAddressValidator;

    event ArtistWhitelisted(address indexed artistAddress, bool state);

    event ValidatorAdded(address indexed validatorAddress, bool state);

    error Unauthorized();

    /// @notice that this modifier is used to check if the address is a validator or the owner
    modifier isValidatorOrOwner() {
        if (isAddressValidator[msg.sender] || msg.sender == owner()) {
            _;
        } else {
            revert Unauthorized();
        }
    }

    /// @notice that this modifier is used to check if the address is not zero address
    modifier isZeroAddress(address _address) {
        require(_address != address(0), "address is zero address");
        _;
    }

    /**
     * @param _owner is the address that should be the owner of the contract.
     */
    function initialize(
        address _owner
    ) external initializer isZeroAddress(_owner) {
        __Ownable_init();
        _transferOwnership(_owner);
    }

    /// @notice Add new validators to Mint Gold Dust Company
    function setValidator(
        address _address,
        bool _state
    ) external onlyOwner isZeroAddress(_address) {
        isAddressValidator[_address] = _state;
        emit ValidatorAdded(_address, _state);
    }

    /// @notice Whitelist/Blacklist artist
    function whitelist(
        address _address,
        bool _state
    ) external isValidatorOrOwner isZeroAddress(_address) {
        isArtistApproved[_address] = _state;
        emit ArtistWhitelisted(_address, _state);
    }

    function supportsInterface(
        bytes4 interfaceId
    ) public view virtual override returns (bool) {
        return interfaceId == ERC165_ID;
    }
}
