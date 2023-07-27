// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.18;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/introspection/IERC165.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/token/ERC1155/IERC1155.sol";

error Unauthorized();

/// @title A contract responsible by Mint Gold Dust management.
/// @notice Contains functions for update the MGD fees and some access levels.
/// @author Mint Gold Dust LLC
/// @custom:contact klvh@mintgolddust.io
contract MintGoldDustCompany is Initializable, IERC165, Ownable {
    /**
     * @dev all attributes are public to be accessible by the other contracts
     * that are composed by this one
     */
    uint256 public primarySaleFeePercent;
    uint256 public secondarySaleFeePercent;
    uint256 public collectorFee;
    uint256 public maxRoyalty;
    uint256 public auctionDuration;
    uint256 public auctionFinalMinutes;
    mapping(address => bool) public isArtistApproved;
    mapping(address => bool) public isAddressValidator;
    mapping(address => bool) public isCollectorMint;

    bytes4 private constant ERC165_ID = 0x01ffc9a7; //ERC165

    function supportsInterface(
        bytes4 interfaceId
    ) public view virtual override returns (bool) {
        return interfaceId == ERC165_ID;
    }

    /**
     *
     * @param _owner is the address that should be the owner of the contract.
     * @param _primarySaleFeePercent is the fee setted for primary sales (15%)
     * @param _secondarySaleFeePercent is the fee setted for secondary sales (5%)
     * @param _collectorFee is the fee paid by collectors setted for primary sales (3%)
     * @param _maxRoyalty is the maximum percetange that an artist can set to its artwork (20%)
     * @param _auctionDurationInMinutes is the duration of the auction in minutes (24 hours)
     * @param _auctionFinalMinutes is the duration of the final minutes of the auction (5 minutes)
     */
    function initialize(
        address _owner,
        uint256 _primarySaleFeePercent,
        uint256 _secondarySaleFeePercent,
        uint256 _collectorFee,
        uint256 _maxRoyalty,
        uint256 _auctionDurationInMinutes,
        uint256 _auctionFinalMinutes
    ) public initializer {
        Ownable._transferOwnership(_owner);
        primarySaleFeePercent = _primarySaleFeePercent;
        secondarySaleFeePercent = _secondarySaleFeePercent;
        collectorFee = _collectorFee;
        maxRoyalty = _maxRoyalty;
        auctionDuration = _auctionDurationInMinutes * 1 minutes;
        auctionFinalMinutes = _auctionFinalMinutes * 1 minutes;
    }

    event ArtistWhitelisted(address indexed artistAddress, bool state);

    event ValidatorAdded(address indexed validatorAddress, bool state);

    event CollectorMintAdded(address indexed validatorAddress, bool state);

    /// @notice Add new validators to Mint Gold Dust Company
    function setValidator(address _address, bool _state) public isOwner {
        isAddressValidator[_address] = _state;
        emit ValidatorAdded(_address, _state);
    }

    /// @notice Whitelist/Blacklist artist
    function whitelist(address _address, bool _state) public isValidator {
        isArtistApproved[_address] = _state;
        emit ArtistWhitelisted(_address, _state);
    }

    /// @notice Whitelist/Blacklist collector mint
    function setCollectorMint(
        address _address,
        bool _state
    ) public isValidator {
        isCollectorMint[_address] = _state;
        emit CollectorMintAdded(_address, _state);
    }

    modifier isOwner() {
        if (msg.sender != owner()) {
            revert Unauthorized();
        }
        _;
    }

    modifier isValidator() {
        if (isAddressValidator[msg.sender] == true) {
            _;
        } else {
            revert Unauthorized();
        }
    }

    /// @notice Fallbacks will forward funds to Mint Gold Dust LLC
    fallback() external payable {
        payable(owner()).transfer(msg.value);
    }

    /// @notice Fallbacks will forward funds to Mint Gold Dust LLC
    receive() external payable {
        payable(owner()).transfer(msg.value);
    }
}
