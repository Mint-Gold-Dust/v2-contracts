// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.17;

/// @title Mint Gold Dust NFT
/// @author Mint Gold Dust LLC
/// @notice Contains functions for minting and selling MGD ERC721 tokens
/// @custom:contact klvh@mintgolddust.io

import "@openzeppelin/contracts/utils/Counters.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "./IGDMarketplace.sol";
import "../node_modules/hardhat/console.sol";

error Unauthorized();
error InsufficientFunds();
error InvalidInput();
error InexistentItem();
error ItemAlreadySold();

contract GDMarketplace is ERC721URIStorage, IGDMarketplace {
    using Counters for Counters.Counter;

    Counters.Counter private tokenIds;
    Counters.Counter private itemsListed;

    uint256 public SALE_FEE_PERCENT = 15;
    address payable private OWNER;
    mapping(uint256 => MarketItem) public idMarketItem;
    mapping(address => bool) private isArtistApproved;
    mapping(uint256 => address) public tokenIdArtist;
    mapping(address => mapping(uint256 => string)) private artistTokenIdMemoir;
    mapping(address => uint256) public artistTokenCount;

    struct MarketItem {
        uint256 itemId;
        uint256 tokenId;
        address payable seller;
        uint256 price;
        bool sold;
    }

    constructor() ERC721("Gold Dust NFT", "GOLDUST") {
        OWNER = payable(msg.sender);
    }

    /// @notice Get contract owner
    function owner() public view virtual returns (address) {
        return OWNER;
    }

    /// @notice Get an item of the marketplace
    function getItem(uint256 _itemId) public view returns (MarketItem memory) {
        return idMarketItem[_itemId];
    }

    /**
     * Update platform fee percentage
     * This fee is taken from each sale on the marketplace
     * @notice Only contract deployer can call this function
     * @param _percentage The ID of the token being updated
     */
    function updateSaleFeePercent(uint256 _percentage) public isOwner {
        SALE_FEE_PERCENT = _percentage;
    }

    /**
     * Mints a new MGD token and lists on the msrketplace
     * @notice Fails if artist is not whitelisted
     * @dev tokenIdArtist keeps track of the work of each artist
     * @param _tokenURI The uri of the the token metadata
     */
    function mintNFT(
        string memory _tokenURI
    ) public isApproved returns (uint256) {
        tokenIds.increment();
        uint256 newTokenId = tokenIds.current();
        _mint(msg.sender, newTokenId);
        _setTokenURI(newTokenId, _tokenURI);
        tokenIdArtist[newTokenId] = msg.sender;
        artistTokenCount[msg.sender]++;
        emit NFT_Minted(newTokenId, msg.sender);
        return newTokenId;
    }

    /**
     * List a new MGD token and lists on the msrketplace
     * @notice Caller can mark the token as restricted to prevent flipping
     * @param _tokenId The token ID of the NFT to list
     * @param _price The price of the NFT to be listed
     */
    function listNFT(
        uint256 _tokenId,
        uint256 _price
    ) public isArtist(_tokenId) {
        if (_price <= 0) {
            revert InvalidInput();
        }
        itemsListed.increment();
        transferFrom(msg.sender, address(this), _tokenId);
        idMarketItem[itemsListed.current()] = MarketItem(
            itemsListed.current(),
            _tokenId,
            payable(msg.sender),
            _price,
            false
        );

        emit NFT_Listed(itemsListed.current(), _tokenId, msg.sender, _price);
    }

    /**
     * Updates already listed NFT
     * @notice Only seller can call this function
     * @param _itemId The item ID of the the token listed to update
     * @param _newPrice The price of the NFT
     */
    function updateListedNFT(uint256 _itemId, uint256 _newPrice) public {
        if (_newPrice <= 0) {
            revert InvalidInput();
        }
        if (_itemId > itemsListed.current()) {
            revert InexistentItem();
        }
        if (idMarketItem[_itemId].seller != address(msg.sender)) {
            revert Unauthorized();
        }
        idMarketItem[_itemId] = MarketItem(
            idMarketItem[_itemId].itemId,
            idMarketItem[_itemId].tokenId,
            idMarketItem[_itemId].seller,
            _newPrice,
            idMarketItem[_itemId].sold
        );
        emit NFT_ListedItemUpdated(
            _itemId,
            idMarketItem[_itemId].tokenId,
            msg.sender,
            _newPrice
        );
    }

    /**
     * List an NFT bought from the marketplace
     * @notice Only NFT owner can call this function
     * @param _tokenId The token ID of the the token to list
     * @param _price The list price of the NFT
     */
    function reListNFT(
        uint256 _tokenId,
        uint256 _price
    ) public isNFTOwner(_tokenId) {
        idMarketItem[_tokenId].sold = false;
        idMarketItem[_tokenId].price = _price;
        idMarketItem[_tokenId].seller = payable(msg.sender);
        itemsListed.increment();
        //send 5% to mgd
        _transfer(msg.sender, address(this), _tokenId);
        emit NFT_Listed(itemsListed.current(), _tokenId, msg.sender, _price);
    }

    /**
     * Delist NFT from marketplace
     * @notice Only seller can call this function
     * @param _itemId The token ID of the the token to delist
     */
    function delistNFT(uint256 _itemId) public {
        if (idMarketItem[_itemId].seller == msg.sender) {
            revert Unauthorized();
        }
        // delete idMarketItem[_tokenId].sold = true;
        uint256 _tokenId = idMarketItem[_itemId].tokenId;
        delete idMarketItem[_itemId];
        _transfer(address(this), msg.sender, _tokenId);
        emit NFT_RemovedFromMarketplace(_tokenId, msg.sender);
    }

    /**
     * Move token to auction contract
     * @notice Only NFT owner can call this function
     * @param _tokenId The token ID of the the token to list
     * @param _auctionContract The GBM contract address
     */
    function auction(
        uint256 _tokenId,
        address _auctionContract
    ) public isNFTOwner(_tokenId) {
        _transfer(address(this), _auctionContract, _tokenId);
    }

    /**
     * Acquire a listed NFT
     * Platform fee percentage from selling price is taken and sent to Mint Gold Dust
     * @notice Function will fail is artist has marked NFT as restricted
     * @param _itemId The token ID of the the token to acquire
     */
    function purchaseNFT(uint256 _itemId) public payable {
        MarketItem storage item = idMarketItem[_itemId];
        uint256 totalPrice = getTotalPrice(item.tokenId);

        if (item.sold == true) {
            revert ItemAlreadySold();
        }
        if (msg.value < totalPrice) {
            revert InsufficientFunds();
        }
        if (_itemId > itemsListed.current()) {
            revert InexistentItem();
        }
        // pay seller and fee account
        item.seller.transfer(item.price);
        OWNER.transfer(totalPrice - item.price);

        // update item to sold
        item.sold = true;

        // transfer nft to buyer
        this.transferFrom(address(this), msg.sender, item.tokenId);
        emit NFT_Purchased(item.tokenId, item.seller, msg.sender, item.price);
    }

    function getTotalPrice(uint256 _itemId) public view returns (uint256) {
        return ((idMarketItem[_itemId].price * (100 + SALE_FEE_PERCENT)) / 100);
    }

    /// @notice Get all user NFTs
    function fetchUserNFTs(
        address _address
    ) public view returns (MarketItem[] memory) {
        uint256 totalItemCount = tokenIds.current();
        uint256 itemCount = 0;
        uint256 currentIndex = 0;

        for (uint256 i = 0; i < totalItemCount; i++) {
            if (idMarketItem[i + 1].seller == _address) {
                itemCount += 1;
            }
        }

        MarketItem[] memory items = new MarketItem[](itemCount);
        for (uint256 i = 0; i < totalItemCount; i++) {
            if (idMarketItem[i + 1].seller == _address) {
                uint256 currentId = i + 1;
                MarketItem storage currentItem = idMarketItem[currentId];
                items[currentIndex] = currentItem;
                currentIndex += 1;
            }
        }
        return items;
    }

    /// @notice Get all listed items
    function fetchItemsListed() public view returns (MarketItem[] memory) {
        uint256 totalItemCount = tokenIds.current();
        uint256 itemCount = 0;
        uint256 currentIndex = 0;

        for (uint256 i = 0; i < totalItemCount; i++) {
            if (idMarketItem[i + 1].seller == msg.sender) {
                itemCount += 1;
            }
        }

        MarketItem[] memory items = new MarketItem[](itemCount);
        for (uint256 i = 0; i < totalItemCount; i++) {
            if (idMarketItem[i + 1].seller == msg.sender) {
                uint256 currentId = i + 1;
                MarketItem storage currentItem = idMarketItem[currentId];
                items[currentIndex] = currentItem;
                currentIndex += 1;
            }
        }

        return items;
    }

    /// @notice Whitelist/Blacklist artist
    function whitelist(address _address, bool _state) public isOwner {
        isArtistApproved[_address] = _state;
    }

    modifier isNFTOwner(uint256 _tokenId) {
        if (ownerOf(_tokenId) != msg.sender) {
            revert Unauthorized();
        }
        _;
    }

    modifier isOwner() {
        if (msg.sender != OWNER) {
            revert Unauthorized();
        }
        _;
    }

    modifier isArtist(uint256 _tokenId) {
        if (tokenIdArtist[_tokenId] != msg.sender) {
            revert Unauthorized();
        }
        _;
    }

    modifier isApproved() {
        if (isArtistApproved[msg.sender] == false) {
            revert Unauthorized();
        }
        _;
    }

    /// @notice Fallbacks will forward funds to Mint Gold Dust
    fallback() external payable {
        payable(OWNER).transfer(msg.value);
    }

    /// @notice Fallbacks will forward funds to Mint Gold Dust
    receive() external payable {
        payable(OWNER).transfer(msg.value);
    }
}
