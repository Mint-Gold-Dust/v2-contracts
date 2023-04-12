// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.18;

import "./IMGDCompany.sol";

error MGDCompanyUnauthorized();

contract MGDCompany is IMGDCompany {
    uint256 public primarySaleFeePercent;
    uint256 public secondarySaleFeePercent;
    uint256 public collectorFee;
    uint256 public maxRoyalty;
    address public owner;
    uint256 public auctionDuration;
    uint256 public auctionFinalMinutes;
    mapping(address => bool) public isArtistApproved;
    mapping(address => bool) public isAddressValidator;

    constructor(
        address _owner,
        uint256 _primarySaleFeePercent,
        uint256 _secondarySaleFeePercent,
        uint256 _collectorFee,
        uint256 _maxRoyalty
    ) {
        owner = _owner;
        primarySaleFeePercent = _primarySaleFeePercent;
        secondarySaleFeePercent = _secondarySaleFeePercent;
        collectorFee = _collectorFee;
        maxRoyalty = _maxRoyalty;
        auctionDuration = 24 hours;
        auctionFinalMinutes = 5 minutes;
    }

    /**
     * Update platform primary fee percentage
     * This fee is taken from each original sale on the marketplace
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
     * for a number greater than this.
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
     * This field is responsible to add a verification for auction. IF
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

    /// @notice Whitelist/Blacklist validator
    function setValidator(address _address, bool _state) public isowner {
        isAddressValidator[_address] = _state;
        emit ValidatorAdded(_address, _state);
    }

    /// @notice Whitelist/Blacklist artist
    function whitelist(address _address, bool _state) public isValidator {
        isArtistApproved[_address] = _state;
        emit ArtistWhitelisted(_address, _state);
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
}
