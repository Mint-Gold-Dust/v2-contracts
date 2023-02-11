// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.17;

import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Counters.sol";

import "hardhat/console.sol";

contract MGD is ReentrancyGuard, Ownable {
    // Variables
    using Counters for Counters.Counter;
    Counters.Counter private _itemCount;
    address payable private _feeAccount; // the account that receives fees
    uint256 private _feePercent; // the fee percentage on sales

    struct Item {
        uint256 itemId;
        IERC721 nft;
        uint256 tokenId;
        uint256 price;
        address payable seller;
        bool sold;
    }

    // itemId -> Item
    mapping(uint256 => Item) public items;

    event Listed(
        uint256 itemId,
        address indexed nft,
        uint256 tokenId,
        uint256 price,
        address indexed seller
    );

    event Bought(
        uint256 itemId,
        address indexed nft,
        uint256 tokenId,
        uint256 price,
        address indexed seller,
        address indexed buyer
    );

    constructor(uint256 feePercent) Ownable() {
        _feeAccount = payable(msg.sender);
        _feePercent = feePercent;
    }

    function _getFeePercent() public view returns (uint256) {
        return _feePercent;
    }

    function _setFeePercent(uint256 newFee) public onlyOwner {
        _feePercent = newFee;
    }

    function _setFeeAccount(address payable newAddress) public onlyOwner {
        _feeAccount = newAddress;
    }

    function _getTokenCount() public view returns (uint256) {
        return _itemCount.current();
    }

    /**
     *
     * @param nft the NFT smart contract address
     * @param tokenId the id of the token to be listed
     * @param price the price that the token should be listed
     */
    function _listItem(
        IERC721 nft,
        uint256 tokenId,
        uint256 price
    ) external nonReentrant {
        require(price > 0, "Price must be greater than zero");
        // increment itemCount
        _itemCount.increment();
        // transfer nft
        nft.transferFrom(msg.sender, address(this), tokenId);
        // add new item to items mapping
        items[_itemCount.current()] = Item(
            _itemCount.current(),
            nft,
            tokenId,
            price,
            payable(msg.sender),
            false
        );
        // emit Listed event
        emit Listed(
            _itemCount.current(),
            address(nft),
            tokenId,
            price,
            msg.sender
        );
    }

    function purchaseItem(uint256 tokenId) external payable nonReentrant {
        uint256 totalPrice = getTotalPrice(tokenId);
        Item storage item = items[tokenId];
        require(
            tokenId > 0 && tokenId <= _itemCount.current(),
            "Item does not exists!"
        );
        require(msg.value >= totalPrice, "Not enough ether");
        require(!item.sold, "Item already sold");

        // pay seller and fee account
        item.seller.transfer(item.price);
        _feeAccount.transfer(totalPrice - item.price);

        // update item to sold
        item.sold = true;

        // transfer nft to buyer
        item.nft.transferFrom(address(this), msg.sender, item.tokenId);

        emit Bought(
            item.itemId,
            address(item.nft),
            tokenId,
            item.price,
            item.seller,
            msg.sender
        );
    }

    function getTotalPrice(uint256 tokenId) public view returns (uint256) {
        return ((items[tokenId].price * (100 + _feePercent)) / 100);
    }
}
