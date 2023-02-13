// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.17;

/// @title Mint Gold Dust NFT
/// @author Mint Gold Dust LLC
/// @notice Contains functions for minting and selling MGD ERC721 tokens
/// @custom:contact klvh@mintgolddust.io

import "@openzeppelin/contracts/utils/Counters.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "./IMGD.sol";
import "hardhat/console.sol";

error MGD_NFTMarketplace__Unauthorized();
error MGD_NFTMarketplace__SaleRestricted();

contract MGD_NFTMarketplace is ERC721URIStorage, IMGD {
    using Counters for Counters.Counter;

    Counters.Counter private _tokenIds;
    Counters.Counter private _itemsSold;

    uint256 public SALE_FEE_PERCENT = 15000000000000000000;
    address public OWNER;
    mapping(uint256 => MarketItem) private id_marketItem;
    mapping(address => bool) private artist_IsApproved;
    mapping(address => mapping(uint256 => string))
        private artist_tokenID_memoir;

    struct MarketItem {
        uint256 tokenId;
        address payable seller;
        uint256 price;
        bool sold;
        bool artistRestricted;
        bool inAuction;
    }

    constructor() ERC721("Mint Gold Dust NFT", "MGD") {
        OWNER = msg.sender;
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
     * @notice Caller can mark the token as restricted to prevent flipping
     * @param _tokenURI The uri of the the token metadata
     * @param _price The price of the NFT
     * @param _artistRestricted States whether NFT could be purchased or not
     */
    function createNFT(
        string memory _tokenURI,
        uint256 _price,
        bool _artistRestricted
    ) public payable returns (uint256) {
        _tokenIds.increment();
        uint256 newTokenId = _tokenIds.current();
        _mint(msg.sender, newTokenId);
        _setTokenURI(newTokenId, _tokenURI);
        listNFT(newTokenId, _price, _artistRestricted);
        return newTokenId;
    }

    /// @dev This is a private function called from the createNFT function
    function listNFT(
        uint256 _tokenId,
        uint256 _price,
        bool _artistRestricted
    ) private isNFTOwner(_tokenId) {
        require(_price > 0, "Price must be at least 1 wei");
        id_marketItem[_tokenId] = MarketItem(
            _tokenId,
            payable(msg.sender),
            _price,
            false,
            _artistRestricted,
            false
        );

        _transfer(msg.sender, address(this), _tokenId);
        emit NFTListed(_tokenId, msg.sender, _price, false, _artistRestricted);
    }

    /**
     * Updates already listed NFT
     * @notice Only seller can call this function
     * @param _tokenId The token ID of the the token to update
     * @param _price The price of the NFT
     * @param _artistRestricted States whether NFT could be purchased or not
     */
    function updateListedNFT(
        uint256 _tokenId,
        uint256 _price,
        bool _artistRestricted
    ) public {
        require(_price > 0, "Price must be at least 1 wei");
        require(
            id_marketItem[_tokenId].seller == msg.sender,
            "Only seller can perform this task"
        );

        id_marketItem[_tokenId] = MarketItem(
            _tokenId,
            payable(msg.sender),
            _price,
            false,
            _artistRestricted,
            false
        );

        emit NFTListedItemUpdated(
            _tokenId,
            msg.sender,
            _price,
            false,
            _artistRestricted
        );
    }

    /**
     * List an NFT bought from marketplace
     * @notice Only NFT owner can call this function
     * @param _tokenId The token ID of the the token to list
     * @param _price The list price of the NFT
     */
    function reListNFT(
        uint256 _tokenId,
        uint256 _price
    ) public isNFTOwner(_tokenId) {
        id_marketItem[_tokenId].sold = false;
        id_marketItem[_tokenId].price = _price;
        id_marketItem[_tokenId].seller = payable(msg.sender);
        _itemsSold.decrement();
        _transfer(msg.sender, address(this), _tokenId);
    }

    /**
     * Delist owned NFT from marketplace
     * @notice Only seller can call this function
     * @param _tokenId The token ID of the the token to delist
     */
    function delistNFT(uint256 _tokenId) public {
        require(
            id_marketItem[_tokenId].seller == msg.sender,
            "Only seller can perform this task"
        );
        id_marketItem[_tokenId].sold = true;
        _itemsSold.increment();
        _transfer(address(this), msg.sender, _tokenId);
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
        require(
            id_marketItem[_tokenId].seller == msg.sender,
            "Only seller can perform this task"
        );
        id_marketItem[_tokenId].sold = true;
        id_marketItem[_tokenId].inAuction = true;
        _itemsSold.increment();
        _transfer(address(this), _auctionContract, _tokenId);
    }

    /**
     * Acquire a listed NFT
     * Platform fee percentage from selling price is taken and sent to Mint Gold Dust
     * @notice Function will fail is artist has marked NFT as restricted
     * @param _tokenId The token ID of the the token to acquire
     */
    function buyNFT(
        uint256 _tokenId
    ) public payable saleUnrestricted(_tokenId) {
        uint256 price = id_marketItem[_tokenId].price;
        require(
            msg.value == price,
            "Please submit the asking price in order to complete the purchase"
        );
        id_marketItem[_tokenId].sold = true;
        _itemsSold.increment();

        _transfer(address(this), msg.sender, _tokenId);
        uint256 fee = (msg.value * SALE_FEE_PERCENT) / (100 * 10 ** 18);
        uint256 balance = msg.value - fee;
        payable(OWNER).transfer(fee);
        payable(id_marketItem[_tokenId].seller).transfer(balance);
    }

    /// @notice Get all marketplace items
    function fetchMarketItems() public view returns (MarketItem[] memory) {
        uint256 itemCount = _tokenIds.current();
        uint256 unsoldItemCount = _tokenIds.current() - _itemsSold.current();
        uint256 currentIndex = 0;
        MarketItem[] memory items = new MarketItem[](unsoldItemCount);
        for (uint256 i = 0; i < itemCount; i++) {
            uint256 currentId = i + 1;
            MarketItem storage currentItem = id_marketItem[currentId];
            items[currentIndex] = currentItem;
            currentIndex += 1;
        }
        return items;
    }

    /// @notice Get all user NFTs
    function fetchUserNFTs(
        address _address
    ) public view returns (MarketItem[] memory) {
        uint256 totalItemCount = _tokenIds.current();
        uint256 itemCount = 0;
        uint256 currentIndex = 0;

        for (uint256 i = 0; i < totalItemCount; i++) {
            if (id_marketItem[i + 1].seller == _address) {
                itemCount += 1;
            }
        }

        MarketItem[] memory items = new MarketItem[](itemCount);
        for (uint256 i = 0; i < totalItemCount; i++) {
            if (id_marketItem[i + 1].seller == _address) {
                uint256 currentId = i + 1;
                MarketItem storage currentItem = id_marketItem[currentId];
                items[currentIndex] = currentItem;
                currentIndex += 1;
            }
        }
        return items;
    }

    /// @notice Get all listed items
    function fetchItemsListed() public view returns (MarketItem[] memory) {
        uint256 totalItemCount = _tokenIds.current();
        uint256 itemCount = 0;
        uint256 currentIndex = 0;

        for (uint256 i = 0; i < totalItemCount; i++) {
            if (id_marketItem[i + 1].seller == msg.sender) {
                itemCount += 1;
            }
        }

        MarketItem[] memory items = new MarketItem[](itemCount);
        for (uint256 i = 0; i < totalItemCount; i++) {
            if (id_marketItem[i + 1].seller == msg.sender) {
                uint256 currentId = i + 1;
                MarketItem storage currentItem = id_marketItem[currentId];
                items[currentIndex] = currentItem;
                currentIndex += 1;
            }
        }

        return items;
    }

    /// @notice pending
    function setMemoir(
        string memory _memoir,
        uint256 _tokenId
    ) public isNFTOwner(_tokenId) {
        artist_tokenID_memoir[msg.sender][_tokenId] = _memoir;
    }

    /// @notice pending
    function whitelist(address _address, bool _state) public isOwner {
        artist_IsApproved[_address] = _state;
    }

    modifier isNFTOwner(uint256 _tokenId) {
        if (ownerOf(_tokenId) != msg.sender) {
            revert MGD_NFTMarketplace__Unauthorized();
        }
        _;
    }

    modifier saleUnrestricted(uint256 _tokenId) {
        if (id_marketItem[_tokenId].artistRestricted == true) {
            revert MGD_NFTMarketplace__SaleRestricted();
        }
        _;
    }

    modifier isOwner() {
        if (msg.sender != OWNER) {
            revert MGD_NFTMarketplace__Unauthorized();
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
