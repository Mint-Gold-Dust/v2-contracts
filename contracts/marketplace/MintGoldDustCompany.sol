// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.18;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts/utils/introspection/IERC165.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/token/ERC1155/IERC1155.sol";

error MGDCompanyUnauthorized();

/// @title A contract responsible by Mint Gold Dust management.
/// @notice Contains functions for update the MGD fees and some access levels.
/// @author Mint Gold Dust LLC
/// @custom:contact klvh@mintgolddust.io
contract MintGoldDustCompany is Initializable, IERC165 {
    /**
     * @dev all attributes are public to be accessible by the other contracts
     * that are composed by this one
     */
    uint256 public primarySaleFeePercent;
    uint256 public secondarySaleFeePercent;
    uint256 public collectorFee;
    uint256 public maxRoyalty;
    address public owner;
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
     * @param _primarySaleFeePercent is the fee setted for primary sales (15% initially)
     * @param _secondarySaleFeePercent is the fee setted for secondary sales (5% initially)
     * @param _collectorFee is the fee paid by collectors setted for primary sales (3% initially)
     * @param _maxRoyalty is the maximum percetange that an artist can set to its artwork (20% initially)
     */
    function initialize(
        address _owner,
        uint256 _primarySaleFeePercent,
        uint256 _secondarySaleFeePercent,
        uint256 _collectorFee,
        uint256 _maxRoyalty
    ) public initializer {
        owner = _owner;
        primarySaleFeePercent = _primarySaleFeePercent;
        secondarySaleFeePercent = _secondarySaleFeePercent;
        collectorFee = _collectorFee;
        maxRoyalty = _maxRoyalty;
        auctionDuration = 24 hours;
        auctionFinalMinutes = 5 minutes;
    }

    event ArtistWhitelisted(address indexed artistAddress, bool state);

    event ValidatorAdded(address indexed validatorAddress, bool state);

    event CollectorMintAdded(address indexed validatorAddress, bool state);

    /**
     * Update platform primary fee percentage
     * This fee is taken from each first sale on the marketplace
     * @notice Only contract deployer can call this function
     * @param _percentage The percentage in wei format
     */
    function updatePrimarySaleFeePercent(uint256 _percentage) public isowner {
        primarySaleFeePercent = _percentage;
    }

    /**
     * Update platform secondary fee percentage
     * This fee is taken from each resale on the marketplace
     * @notice Only contract deployer can call this function
     * @param _percentage The percentage in wei format
     */
    function updateSecondarySaleFeePercent(uint256 _percentage) public isowner {
        secondarySaleFeePercent = _percentage;
    }

    /**
     * Update platform collector fee percentage
     * This fee is taken from each first sale on the marketplace
     * @notice Only contract deployer can call this function
     * @param _percentage The percentage in wei format
     */
    function updateCollectorFee(uint256 _percentage) public isowner {
        collectorFee = _percentage;
    }

    /**
     * Update platform max royalty limit
     * So the owner of the contract can't update the max royaltyFee
     * for a number greater or less than this.
     * @notice Only contract deployer can call this function
     * @param _percentage The percentage in wei format
     */
    function updateMaxRoyalty(uint256 _percentage) public isowner {
        maxRoyalty = _percentage;
    }

    /**
     * Update the auction duration attribute.
     * This field is used to create the end time of an auction
     * after the fist bid. So the end time would be the block.timestamp
     * plus the auctionDuration.
     * @notice Only contract deployer can call this function
     * @param _auctionDuration the time in seconds
     */
    function updateAuctionTimeDuration(
        uint256 _auctionDuration
    ) public isowner {
        auctionDuration = _auctionDuration;
    }

    /**
     * Update the final minutes attribute.
     * This field is responsible to add a verification for auction. If
     * a bid happens in the these last minutes, the end time of the auction
     * increase more this quantity of minutes.
     * @notice Only contract deployer can call this function
     * @param _auctionFinalMinutes the time in seconds
     */
    function updateAuctionFinalMinutes(
        uint256 _auctionFinalMinutes
    ) public isowner {
        auctionFinalMinutes = _auctionFinalMinutes;
    }

    /// @notice Add new validators to Mint Gold Dust Company
    function setValidator(address _address, bool _state) public isowner {
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

    modifier isowner() {
        if (msg.sender != owner) {
            revert MGDCompanyUnauthorized();
        }
        _;
    }

    modifier isValidator() {
        if (isAddressValidator[msg.sender] == true) {
            _;
        } else {
            revert MGDCompanyUnauthorized();
        }
    }

    /// @notice Fallbacks will forward funds to Mint Gold Dust LLC
    fallback() external payable {
        payable(owner).transfer(msg.value);
    }

    /// @notice Fallbacks will forward funds to Mint Gold Dust LLC
    receive() external payable {
        payable(owner).transfer(msg.value);
    }
}
