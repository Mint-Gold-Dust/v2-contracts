// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.17;

/// @title Mint Gold Dust NFT
/// @author Mint Gold Dust LLC
/// @notice Contains functions for minting and selling MGD ERC721 tokens
/// @custom:contact klvh@mintgolddust.io

import "@openzeppelin/contracts/utils/Counters.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "./IGD.sol";
import "hardhat/console.sol";

error MGD_NFTMarketplace__Unauthorized();
error MGD_NFTMarketplace__InsufficientFunds();
error MGD_NFTMarketplace__InvalidInput();

contract GDMarketplace is ERC721URIStorage, IGD {
    using Counters for Counters.Counter;

    Counters.Counter private _tokenIds;
    Counters.Counter private _itemsSold;

    uint256 public SALE_FEE_PERCENT = 15000000000000000000;
    // address private constant OWNER = 0x46ab5D1518688f66286aF7c6C9f5552edd050d15;
    address private constant OWNER = 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266;
    mapping(uint256 => MarketItem) private id_marketItem;
    mapping(address => bool) private artist_IsApproved;
    mapping(uint256 => address) public tokenID_Artist;
    mapping(address => mapping(uint256 => string))
        private artist_tokenID_memoir;

    struct MarketItem {
        uint256 tokenId;
        address seller;
        uint256 price;
        bool sold;
    }

    constructor() ERC721("Mint Gold Dust NFT", "MGD") {}

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
     * @dev tokenID_Artist keeps track of the work of each artist
     * @param _tokenURI The uri of the the token metadata
     */
    function mintNFT(
        string memory _tokenURI
    ) public isApproved returns (uint256) {
        _tokenIds.increment();
        uint256 newTokenId = _tokenIds.current();
        _mint(msg.sender, newTokenId);
        _setTokenURI(newTokenId, _tokenURI);
        tokenID_Artist[newTokenId] = msg.sender;
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
        if (_price < 0) {
            revert MGD_NFTMarketplace__InvalidInput();
        }
        id_marketItem[_tokenId] = MarketItem(
            _tokenId,
            payable(msg.sender),
            _price,
            false
        );
        _transfer(msg.sender, address(this), _tokenId);
        emit NFT_Listed(_tokenId, msg.sender, _price);
    }

    /**
     * Updates already listed NFT
     * @notice Only seller can call this function
     * @param _tokenId The token ID of the the token to update
     * @param _price The price of the NFT
     */
    function updateListedNFT(uint256 _tokenId, uint256 _price) public {
        if (_price < 0) {
            revert MGD_NFTMarketplace__InvalidInput();
        }
        if (id_marketItem[_tokenId].seller == msg.sender) {
            revert MGD_NFTMarketplace__Unauthorized();
        }
        id_marketItem[_tokenId] = MarketItem(
            _tokenId,
            msg.sender,
            _price,
            false
        );

        emit NFT_ListedItemUpdated(_tokenId, msg.sender, _price);
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
        id_marketItem[_tokenId].sold = false;
        id_marketItem[_tokenId].price = _price;
        id_marketItem[_tokenId].seller = msg.sender;
        _itemsSold.decrement();
        //send 5% to mgd
        _transfer(msg.sender, address(this), _tokenId);
        emit NFT_Listed(_tokenId, msg.sender, _price);
    }

    /**
     * Delist NFT from marketplace
     * @notice Only seller can call this function
     * @param _tokenId The token ID of the the token to delist
     */
    function delistNFT(uint256 _tokenId) public {
        if (id_marketItem[_tokenId].seller == msg.sender) {
            revert MGD_NFTMarketplace__Unauthorized();
        }
        id_marketItem[_tokenId].sold = true;
        _itemsSold.increment();
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
     * @param _tokenId The token ID of the the token to acquire
     */
    function buyNFT(uint256 _tokenId) public payable {
        uint256 price = id_marketItem[_tokenId].price;
        if (msg.value != price) {
            revert MGD_NFTMarketplace__InsufficientFunds();
        }
        id_marketItem[_tokenId].sold = true;
        _itemsSold.increment();

        _transfer(address(this), msg.sender, _tokenId);
        uint256 fee = (msg.value * SALE_FEE_PERCENT) / (100 * 10 ** 18);
        uint256 balance = msg.value - fee;
        payable(OWNER).transfer(fee);
        payable(id_marketItem[_tokenId].seller).transfer(balance);
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

    /// @notice Whitelist/Blacklist artist
    function whitelist(address _address, bool _state) public isOwner {
        artist_IsApproved[_address] = _state;
    }

    modifier isNFTOwner(uint256 _tokenId) {
        if (ownerOf(_tokenId) != msg.sender) {
            revert MGD_NFTMarketplace__Unauthorized();
        }
        _;
    }

    modifier isOwner() {
        if (msg.sender != OWNER) {
            revert MGD_NFTMarketplace__Unauthorized();
        }
        _;
    }

    modifier isArtist(uint256 _tokenId) {
        if (tokenID_Artist[_tokenId] != msg.sender) {
            revert MGD_NFTMarketplace__Unauthorized();
        }
        _;
    }

    modifier isApproved() {
        if (artist_IsApproved[msg.sender] == false) {
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
