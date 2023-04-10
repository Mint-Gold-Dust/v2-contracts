// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.18;

import "@openzeppelin/contracts/utils/Counters.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "./MGDCompany.sol";
import "./IMGDMarketplace.sol";

error MGDMarketplaceIncorrectAmountSent();
error MGDMarketplaceSaleNotConcluded();
error MGDMarketplaceItemIsNotListed();
error MGDMarketplaceUnauthorized();
error MGDMarketplaceInvalidInput();

error MGDnftRoyaltyInvalidPercentage();
error MGDnftUnauthorized();

contract MGDMarketplace is IMGDMarketplace, ERC721URIStorage {
    using Counters for Counters.Counter;
    Counters.Counter public _itemsSold;

    mapping(uint256 => MarketItem) public idMarketItem;

    // company
    uint256 public primarySaleFeePercent;
    uint256 public secondarySaleFeePercent;
    uint256 public collectorFee;
    uint256 public maxRoyalty;
    address public owner;
    mapping(address => bool) public isArtistApproved;
    mapping(address => bool) public isAddressValidator;

    // NFT
    Counters.Counter private _tokenIds;
    mapping(uint256 => address) public tokenIdArtist;
    mapping(uint256 => uint256) public tokenIdRoyaltyPercent;

    constructor(
        address _owner,
        uint256 _primarySaleFeePercent,
        uint256 _secondarySaleFeePercent,
        uint256 _collectorFee,
        uint256 _maxRoyalty
    ) ERC721("Mint Gold Dust NFT", "MGDNFT") {
        owner = _owner;
        primarySaleFeePercent = _primarySaleFeePercent;
        secondarySaleFeePercent = _secondarySaleFeePercent;
        collectorFee = _collectorFee;
        maxRoyalty = _maxRoyalty;
    }

    struct MarketItem {
        uint256 tokenId;
        address seller;
        uint256 price;
        bool sold;
        bool isAuction;
        bool isPrimarySale;
        AuctionProps auctionProps;
    }

    struct AuctionProps {
        uint256 endTime;
        address highestBidder;
        address highestBid;
        bool cancelled;
        bool ended;
    }

    /**
     * Acquire a listed NFT
     * Primary fee percentage from primary sale is charged by the platform
     * Secondary fee percentage from secondary sale is charged by the platform while royalty is sent to artist
     * @notice Function will fail is artist has marked NFT as restricted
     * @param _tokenId The token ID of the the token to acquire
     */
    function purchaseNft(uint256 _tokenId) public payable isListed(_tokenId) {
        uint256 price = idMarketItem[_tokenId].price;
        if (msg.value != price) {
            revert MGDMarketplaceIncorrectAmountSent();
        }
        idMarketItem[_tokenId].sold = true;
        _itemsSold.increment();

        uint256 fee;
        uint256 collFee;
        uint256 royalty;
        uint256 balance;

        if (idMarketItem[_tokenId].isPrimarySale == true) {
            fee = (msg.value * primarySaleFeePercent) / (100 * 10 ** 18);
            collFee = (msg.value * collectorFee) / (100 * 10 ** 18);
            balance = msg.value - (fee + collFee);
            idMarketItem[_tokenId].isPrimarySale = false;

            payable(owner).transfer(collFee);
            emit NftPurchasedPrimaryMarket(
                _tokenId,
                idMarketItem[_tokenId].seller,
                msg.sender,
                price,
                fee,
                collFee
            );
        } else {
            fee = (msg.value * secondarySaleFeePercent) / (100 * 10 ** 18);
            royalty =
                (msg.value * tokenIdRoyaltyPercent[_tokenId]) /
                (100 * 10 ** 18);

            balance = msg.value - (fee + royalty);

            payable(idMarketItem[_tokenId].seller).transfer(royalty);

            emit NftPurchasedSecondaryMarket(
                _tokenId,
                idMarketItem[_tokenId].seller,
                msg.sender,
                price,
                tokenIdRoyaltyPercent[_tokenId],
                royalty,
                tokenIdArtist[_tokenId],
                fee,
                collFee
            );
        }
        payable(address(this)).transfer(fee);
        payable(idMarketItem[_tokenId].seller).transfer(balance);

        _transfer(address(this), msg.sender, _tokenId);
    }

    function incrementItemsSold() internal {
        _itemsSold.increment();
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
     * Update platform secondary fee percentage
     * This fee is taken from each resale on the marketplace
     * @notice Only contract deployer can call this function
     * @param _percentage The percentage in wei format
     */
    function updateCollectorFee(uint256 _percentage) public isowner {
        collectorFee = _percentage;
    }

    /**
     * Update platform secondary fee percentage
     * This fee is taken from each resale on the marketplace
     * @notice Only contract deployer can call this function
     * @param _percentage The percentage in wei format
     */
    function updateMaxRoyalty(uint256 _percentage) public isowner {
        maxRoyalty = _percentage;
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

    function list(
        uint256 _tokenId,
        uint256 _price
    ) public isArtist(_tokenId) isNFTowner(_tokenId) {
        if (_price <= 0) {
            revert MGDMarketplaceInvalidInput();
        }

        AuctionProps memory auctionProps = AuctionProps(
            0,
            payable(address(0)),
            payable(address(0)),
            false,
            false
        );

        idMarketItem[_tokenId] = MarketItem(
            _tokenId,
            payable(msg.sender),
            _price,
            false,
            false,
            true,
            auctionProps
        );

        _transfer(msg.sender, address(this), _tokenId);

        emit NftListedToSetPrice(_tokenId, payable(msg.sender), _price);
    }

    /**
     * Updates already listed NFT
     * @notice Only seller can call this function
     * @param _tokenId The token ID of the the token to update
     * @param _price The price of the NFT
     */
    function updateListedNft(
        uint256 _tokenId,
        uint256 _price
    ) public isListed(_tokenId) isSeller(_tokenId) {
        if (_price <= 0) {
            revert MGDMarketplaceInvalidInput();
        }

        idMarketItem[_tokenId] = MarketItem(
            _tokenId,
            payable(msg.sender),
            _price,
            false,
            false,
            true,
            idMarketItem[_tokenId].auctionProps
        );

        emit NftListedItemUpdated(_tokenId, msg.sender, _price);
    }

    /**
     * Delist NFT from marketplace
     * @notice Only seller can call this function
     * @param _tokenId The token ID of the the token to delist
     */
    function delistNft(uint256 _tokenId) public isSeller(_tokenId) {
        idMarketItem[_tokenId].sold = true;
        incrementItemsSold();
        _transfer(address(this), msg.sender, _tokenId);
        emit NftRemovedFromMarketplace(_tokenId, msg.sender);
    }

    /**
     * Mints a new Mint Gold Dust token and lists on the marketplace.
     * @notice Fails if artist is not whitelisted or if the royalty surpass the max royalty limit
     * setted on MGDCompany smart contract.
     * @dev tokenIdArtist keeps track of the work of each artist and tokenIdRoyaltyPercent the royalty
     * percent for each art work.
     * @param _tokenURI The uri of the the token metadata.
     * @param _royaltyPercent The royalty percentage for this art work.
     */
    function mintNft(
        string memory _tokenURI,
        uint256 _royaltyPercent
    ) public validPercentage(_royaltyPercent) isApproved returns (uint256) {
        _tokenIds.increment();
        uint256 newTokenId = _tokenIds.current();
        _mint(msg.sender, newTokenId);
        _setTokenURI(newTokenId, _tokenURI);
        tokenIdArtist[newTokenId] = msg.sender;
        tokenIdRoyaltyPercent[newTokenId] = _royaltyPercent;

        emit NftMinted(newTokenId, msg.sender, _tokenURI, _royaltyPercent);
        return newTokenId;
    }

    modifier validPercentage(uint256 percentage) {
        if (percentage > maxRoyalty) {
            revert MGDnftRoyaltyInvalidPercentage();
        }
        _;
    }

    modifier isApproved() {
        if (isArtistApproved[msg.sender] == false) {
            revert MGDnftUnauthorized();
        }
        _;
    }

    modifier isowner() {
        if (msg.sender != owner) {
            revert MGDMarketplaceUnauthorized();
        }
        _;
    }

    modifier isValidator() {
        if (isAddressValidator[msg.sender] == true) {
            _;
        } else {
            revert MGDMarketplaceUnauthorized();
        }
    }

    modifier isListed(uint256 _tokenId) {
        if (idMarketItem[_tokenId].sold == true) {
            revert MGDMarketplaceItemIsNotListed();
        }
        _;
    }

    modifier isSeller(uint256 _tokenId) {
        if (
            msg.sender == idMarketItem[_tokenId].seller ||
            isAddressValidator[msg.sender] == true
        ) {
            _;
        } else {
            revert MGDMarketplaceUnauthorized();
        }
    }

    modifier isArtist(uint256 _tokenId) {
        if (
            tokenIdArtist[_tokenId] == msg.sender ||
            isAddressValidator[msg.sender] == true
        ) {
            _;
        } else {
            revert MGDMarketplaceUnauthorized();
        }
    }

    modifier isNFTowner(uint256 _tokenId) {
        if (ownerOf(_tokenId) != msg.sender) {
            revert MGDMarketplaceUnauthorized();
        }
        _;
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
