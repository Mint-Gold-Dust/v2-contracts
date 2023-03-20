// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.17;

/// @title Mint Gold Dust NFT
/// @author Mint Gold Dust LLC
/// @notice Contains functions for minting and selling GDNFT ERC721 tokens
/// @custom:contact klvh@mintgolddust.io

import "@openzeppelin/contracts/utils/Counters.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "./IGD.sol";

error GDNFTMarketplace__Unauthorized();
error GDNFTMarketplace__IncorrectAmountSent();
error GDNFTMarketplace__InvalidInput();
error GDNFTMarketplace__NotAListedItem();
error GDNFTMarketplace__InvalidPercentage();

contract GDNFTMarketplace is ERC721URIStorage, IGD {
    using Counters for Counters.Counter;

    Counters.Counter private _tokenIds;
    Counters.Counter private _itemsSold;

    uint256 public primary_sale_fee_percent = 15000000000000000000;
    uint256 public secondary_sale_fee_percent = 5000000000000000000;
    uint256 public collector_fee = 3000000000000000000;
    uint256 public max_royalty = 30000000000000000000;
    address private constant OWNER = 0x46ab5D1518688f66286aF7c6C9f5552edd050d15;
    mapping(uint256 => MarketItem) public id_MarketItem;
    mapping(address => bool) public artist_IsApproved;
    mapping(address => bool) public address_isValidator;
    mapping(uint256 => address) public tokenID_Artist;
    mapping(uint256 => uint256) public tokenID_RoyaltyPercent;
    mapping(uint256 => bool) public tokenID_SecondarySale;

    struct MarketItem {
        uint256 tokenId;
        address seller;
        uint256 price;
        bool sold;
    }

    constructor() ERC721("Gold Dust NFT", "GDNFT") {}

    /**
     * Update platform primary fee percentage
     * This fee is taken from each original sale on the marketplace
     * @notice Only contract deployer can call this function
     * @param _percentage The percentage in wei format
     */
    function updatePrimarySaleFeePercent(uint256 _percentage) public isowner {
        primary_sale_fee_percent = _percentage;
    }

    /**
     * Update platform secondary fee percentage
     * This fee is taken from each resale on the marketplace
     * @notice Only contract deployer can call this function
     * @param _percentage The percentage in wei format
     */
    function updateSecondarySaleFeePercent(uint256 _percentage) public isowner {
        secondary_sale_fee_percent = _percentage;
    }

    /**
     * Update platform secondary fee percentage
     * This fee is taken from each resale on the marketplace
     * @notice Only contract deployer can call this function
     * @param _percentage The percentage in wei format
     */
    function updateCollectorFee(uint256 _percentage) public isowner {
        collector_fee = _percentage;
    }

    /**
     * Update platform secondary fee percentage
     * This fee is taken from each resale on the marketplace
     * @notice Only contract deployer can call this function
     * @param _percentage The percentage in wei format
     */
    function updateMaxRoyalty(uint256 _percentage) public isowner {
        max_royalty = _percentage;
    }

    /**
     * Mints a new Gold Dust token and lists on the marketplace
     * @notice Fails if artist is not whitelisted
     * @dev tokenID_Artist keeps track of the work of each artist
     * @param _tokenURI The uri of the the token metadata
     */
    function mintNft(
        string memory _tokenURI,
        uint256 _royaltyPercent
    ) public validPercentage(_royaltyPercent) isApproved returns (uint256) {
        _tokenIds.increment();
        uint256 newTokenId = _tokenIds.current();
        _mint(msg.sender, newTokenId);
        _setTokenURI(newTokenId, _tokenURI);
        tokenID_Artist[newTokenId] = msg.sender;
        tokenID_RoyaltyPercent[newTokenId] = _royaltyPercent;

        emit NftMinted(newTokenId, msg.sender, _tokenURI, _royaltyPercent);
        return newTokenId;
    }

    /**
     * List a new MGD token and lists on the marketplace
     * @notice Caller can mark the token as restricted to prevent flipping
     * @param _tokenId The token ID of the NFT to list
     * @param _price The price of the NFT to be listed
     */
    function listNft(
        uint256 _tokenId,
        uint256 _price
    ) public isArtist(_tokenId) isNFTowner(_tokenId) {
        if (_price <= 0) {
            revert GDNFTMarketplace__InvalidInput();
        }
        id_MarketItem[_tokenId] = MarketItem(
            _tokenId,
            payable(msg.sender),
            _price,
            false
        );
        tokenID_SecondarySale[_tokenId] = false;
        _transfer(msg.sender, address(this), _tokenId);
        emit NftListed(_tokenId, msg.sender, _price);
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
    ) public isSeller(_tokenId) isListed(_tokenId) {
        if (_price <= 0) {
            revert GDNFTMarketplace__InvalidInput();
        }
        id_MarketItem[_tokenId] = MarketItem(
            _tokenId,
            payable(msg.sender),
            _price,
            false
        );
        emit NftListedItemUpdated(_tokenId, msg.sender, _price);
    }

    /**
     * List an NFT bought from the marketplace
     * @notice Only NFT owner can call this function
     * @param _tokenId The token ID of the the token to list
     * @param _price The list price of the NFT
     */
    function reListNft(
        uint256 _tokenId,
        uint256 _price
    ) public isNFTowner(_tokenId) {
        if (_price <= 0) {
            revert GDNFTMarketplace__InvalidInput();
        }
        id_MarketItem[_tokenId].sold = false;
        id_MarketItem[_tokenId].price = _price;
        id_MarketItem[_tokenId].seller = payable(msg.sender);
        _itemsSold.decrement();
        _transfer(msg.sender, address(this), _tokenId);
        emit NftListed(_tokenId, msg.sender, _price);
    }

    /**
     * Delist NFT from marketplace
     * @notice Only seller can call this function
     * @param _tokenId The token ID of the the token to delist
     */
    function delistNft(uint256 _tokenId) public isSeller(_tokenId) {
        id_MarketItem[_tokenId].sold = true;
        _itemsSold.increment();
        _transfer(address(this), msg.sender, _tokenId);
        emit NftRemovedFromMarketplace(_tokenId, msg.sender);
    }

    /**
     * Move token to auction contract
     * @notice Only NFT owner can call this function
     * @param _tokenId The token ID of the the token to list
     * @param _auctionContract The auction contract address
     */
    function auction(
        uint256 _tokenId,
        address _auctionContract
    ) public isNFTowner(_tokenId) {
        _transfer(address(this), _auctionContract, _tokenId);
        emit NftSentToAuction(_tokenId, msg.sender, _auctionContract);
    }

    /**
     * Acquire a listed NFT
     * Primary fee percentage from primary sale is charged by the platform
     * Secondary fee percentage from secondary sale is charged by the platform while royalty is sent to artist
     * @notice Function will fail is artist has marked NFT as restricted
     * @param _tokenId The token ID of the the token to acquire
     */
    function buyNFT(uint256 _tokenId) public payable isListed(_tokenId) {
        uint256 price = id_MarketItem[_tokenId].price;
        if (msg.value != price) {
            revert GDNFTMarketplace__IncorrectAmountSent();
        }
        id_MarketItem[_tokenId].sold = true;
        _itemsSold.increment();

        uint256 fee;
        uint256 collFee;
        uint256 royalty;
        uint256 balance;

        if (tokenID_SecondarySale[_tokenId] == false) {
            fee = (msg.value * primary_sale_fee_percent) / (100 * 10 ** 18);
            collFee = (msg.value * collector_fee) / (100 * 10 ** 18);
            balance = msg.value - (fee + collFee);
            tokenID_SecondarySale[_tokenId] = true;
            payable(OWNER).transfer(collFee);
        } else {
            fee = (msg.value * secondary_sale_fee_percent) / (100 * 10 ** 18);
            royalty =
                (msg.value * tokenID_RoyaltyPercent[_tokenId]) /
                (100 * 10 ** 18);

            balance = msg.value - (fee + royalty);
            payable(tokenID_Artist[_tokenId]).transfer(royalty);
        }
        payable(OWNER).transfer(fee);
        payable(id_MarketItem[_tokenId].seller).transfer(balance);

        _transfer(address(this), msg.sender, _tokenId);

        emit NftPurchased(
            _tokenId,
            id_MarketItem[_tokenId].seller,
            msg.sender,
            price,
            tokenID_RoyaltyPercent[_tokenId],
            royalty,
            tokenID_Artist[_tokenId],
            fee,
            collFee
        );
    }

    /// @notice Whitelist/Blacklist validator
    function setValidator(address _address, bool _state) public isowner {
        address_isValidator[_address] = _state;
        emit ValidatorAdded(_address, _state);
    }

    /// @notice Whitelist/Blacklist artist
    function whitelist(address _address, bool _state) public isValidator {
        artist_IsApproved[_address] = _state;
        emit ArtistWhitelisted(_address, _state);
    }

    modifier validPercentage(uint256 percentage) {
        if (percentage > max_royalty) {
            revert GDNFTMarketplace__InvalidPercentage();
        }
        _;
    }

    modifier isNFTowner(uint256 _tokenId) {
        if (ownerOf(_tokenId) != msg.sender) {
            revert GDNFTMarketplace__Unauthorized();
        }
        _;
    }

    modifier isowner() {
        if (msg.sender != OWNER) {
            revert GDNFTMarketplace__Unauthorized();
        }
        _;
    }

    modifier isValidator() {
        if (address_isValidator[msg.sender] == true) {
            _;
        } else {
            revert GDNFTMarketplace__Unauthorized();
        }
    }

    modifier isArtist(uint256 _tokenId) {
        if (
            tokenID_Artist[_tokenId] == msg.sender ||
            address_isValidator[msg.sender] == true
        ) {
            _;
        } else {
            revert GDNFTMarketplace__Unauthorized();
        }
    }

    modifier isSeller(uint256 _tokenId) {
        if (
            msg.sender == id_MarketItem[_tokenId].seller ||
            address_isValidator[msg.sender] == true
        ) {
            _;
        } else {
            revert GDNFTMarketplace__Unauthorized();
        }
    }

    modifier isListed(uint256 _tokenId) {
        if (id_MarketItem[_tokenId].sold == true) {
            revert GDNFTMarketplace__NotAListedItem();
        }
        _;
    }

    modifier isApproved() {
        if (artist_IsApproved[msg.sender] == false) {
            revert GDNFTMarketplace__Unauthorized();
        }
        _;
    }

    /// @notice Fallbacks will forward funds to Mint Gold Dust LLC
    fallback() external payable {
        payable(OWNER).transfer(msg.value);
    }

    /// @notice Fallbacks will forward funds to Mint Gold Dust LLC
    receive() external payable {
        payable(OWNER).transfer(msg.value);
    }
}
