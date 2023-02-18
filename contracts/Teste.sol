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

error MDG__Unauthorized();
error MDG__InsufficientFunds();
error MDG__InvalidInput();

contract Teste is ERC721URIStorage, IMGD {
    using Counters for Counters.Counter;

    Counters.Counter private tokenIds;
    Counters.Counter private itemsSold;

    uint256 public SALE_FEE_PERCENT = 15000000000000000000;
    address private OWNER;
    mapping(uint256 => MarketItem) public idMarketItem;
    mapping(address => bool) private isArtistApproved;
    mapping(uint256 => address) public tokenIdArtist;
    mapping(address => mapping(uint256 => string)) private artistTokenIdMemoir;
    mapping(address => uint256) public artistTokenCount;

    struct MarketItem {
        uint256 itemId;
        uint256 tokenId;
        address seller;
        uint256 price;
        bool sold;
    }

    constructor() ERC721("Mint Gold Dust NFT", "MGD") {
        OWNER = msg.sender;
    }

    /// @notice Get contract owner
    function owner() public view virtual returns (address) {
        return OWNER;
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

    function _listItem(
        IERC721 nft,
        uint256 tokenId,
        uint256 price
    ) public isArtist(tokenId) {
        require(price > 0, "Price must be greater than zero");
        // increment itemCount
        itemsSold.increment();
        // transfer nft
        nft.transferFrom(msg.sender, address(this), tokenId);
        // add new item to items mapping
        idMarketItem[itemsSold.current()] = MarketItem(
            itemsSold.current(),
            tokenId,
            payable(msg.sender),
            price,
            false
        );
        // emit Listed event
        emit NFT_Listed(itemsSold.current(), tokenId, msg.sender, price);
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
            revert MDG__InvalidInput();
        }
        itemsSold.increment();
        transferFrom(msg.sender, address(this), _tokenId);
        idMarketItem[itemsSold.current()] = MarketItem(
            itemsSold.current(),
            _tokenId,
            payable(msg.sender),
            _price,
            false
        );

        emit NFT_Listed(itemsSold.current(), _tokenId, msg.sender, _price);
    }

    /**
     * Updates already listed NFT
     * @notice Only seller can call this function
     * @param _tokenId The token ID of the the token to update
     * @param _price The price of the NFT
     */
    function updateListedNFT(uint256 _tokenId, uint256 _price) public {
        if (_price < 0) {
            revert MDG__InvalidInput();
        }
        if (idMarketItem[_tokenId].seller == msg.sender) {
            revert MDG__Unauthorized();
        }
        idMarketItem[_tokenId] = MarketItem(
            idMarketItem[_tokenId].tokenId,
            _tokenId,
            msg.sender,
            _price,
            false
        );
        emit NFT_ListedItemUpdated(
            itemsSold.current(),
            _tokenId,
            msg.sender,
            _price
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
        idMarketItem[_tokenId].seller = msg.sender;
        itemsSold.decrement();
        //send 5% to mgd
        _transfer(msg.sender, address(this), _tokenId);
        emit NFT_Listed(itemsSold.current(), _tokenId, msg.sender, _price);
    }

    /**
     * Delist NFT from marketplace
     * @notice Only seller can call this function
     * @param _tokenId The token ID of the the token to delist
     */
    function delistNFT(uint256 _tokenId) public {
        if (idMarketItem[_tokenId].seller == msg.sender) {
            revert MDG__Unauthorized();
        }
        idMarketItem[_tokenId].sold = true;
        itemsSold.increment();
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
        uint256 price = idMarketItem[_tokenId].price;
        if (msg.value != price) {
            revert MDG__InsufficientFunds();
        }
        idMarketItem[_tokenId].sold = true;
        itemsSold.increment();

        _transfer(address(this), msg.sender, _tokenId);
        uint256 fee = (msg.value * SALE_FEE_PERCENT) / (100 * 10 ** 18);
        uint256 balance = msg.value - fee;
        payable(OWNER).transfer(fee);
        payable(idMarketItem[_tokenId].seller).transfer(balance);
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
            revert MDG__Unauthorized();
        }
        _;
    }

    modifier isOwner() {
        if (msg.sender != OWNER) {
            revert MDG__Unauthorized();
        }
        _;
    }

    modifier isArtist(uint256 _tokenId) {
        if (tokenIdArtist[_tokenId] != msg.sender) {
            revert MDG__Unauthorized();
        }
        _;
    }

    modifier isApproved() {
        if (isArtistApproved[msg.sender] == false) {
            revert MDG__Unauthorized();
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
