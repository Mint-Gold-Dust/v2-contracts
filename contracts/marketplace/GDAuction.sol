// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.17;

/// @title Mint Gold Dust NFT
/// @author Mint Gold Dust LLC
/// @notice Contains functions for bid on an auction that contains GDNFT ERC721 tokens
/// @custom:contact klvh@mintgolddust.io

import "@openzeppelin/contracts-upgradeable/token/ERC721/extensions/IERC721MetadataUpgradeable.sol";

contract GDAuction {
    constructor() {}

    Auction[] public auctions;

    struct Auction {
        address nftContract;
        uint256 tokenId;
        address payable seller;
        uint256 startingPrice;
        uint256 reservePrice;
        uint256 endTime;
        address payable highestBidder;
        uint256 highestBid;
        bool cancelled;
        bool ended;
    }

    function createAuction(
        address _nftContract,
        uint256 _tokenId,
        uint256 _startingPrice,
        uint256 _reservePrice,
        uint256 _duration
    ) public {
        // Add new auction to array of auctions
        auctions.push(
            Auction({
                nftContract: _nftContract,
                tokenId: _tokenId,
                seller: payable(msg.sender),
                startingPrice: _startingPrice,
                reservePrice: _reservePrice,
                endTime: block.timestamp + _duration,
                highestBidder: payable(address(0)),
                highestBid: 0,
                cancelled: false,
                ended: false
            })
        );
    }

    function placeBid(uint256 _auctionId) external payable {
        // Retrieve the auction from the array of auctions
        Auction storage auction = auctions[_auctionId];

        // Ensure that the auction is active and not cancelled
        require(block.timestamp < auction.endTime, "Auction has ended");
        require(!auction.cancelled, "Auction has been cancelled");

        // Ensure that the bid is higher than the current highest bid
        require(msg.value > auction.highestBid, "Bid too low");

        // If there is a previous highest bidder, refund their bid
        if (auction.highestBidder != address(0)) {
            auction.highestBidder.transfer(auction.highestBid);
        }

        // Update the highest bid and bidder
        auction.highestBidder = payable(msg.sender);
        auction.highestBid = msg.value;
    }

    function endAuction(uint256 _auctionId) public {
        // Retrieve the auction from the array of auctions
        Auction storage auction = auctions[_auctionId];

        // Ensure that the auction has not already ended or been cancelled
        require(!auction.ended, "Auction has already ended");
        require(!auction.cancelled, "Auction has been cancelled");

        // Mark the auction as ended
        auction.ended = true;

        // Transfer the NFT to the highest bidder
        IERC721MetadataUpgradeable(auction.nftContract).safeTransferFrom(
            auction.seller,
            auction.highestBidder,
            auction.tokenId
        );

        // Transfer the highest bid to the seller
        payable(auction.seller).transfer(auction.highestBid);
    }

    function cancelAuction(uint256 _auctionId) external {
        // Retrieve the auction from the array of auctions
        Auction storage auction = auctions[_auctionId];

        // Ensure that the auction has not already ended or been cancelled
        require(!auction.ended, "Auction has already ended");
        require(!auction.cancelled, "Auction has already been cancelled");

        // Ensure that the caller is the seller of the auction
        require(
            msg.sender == auction.seller,
            "Only the seller can cancel the auction"
        );

        // Mark the auction as cancelled
        auction.cancelled = true;

        // Transfer the NFT back to the seller
        IERC721MetadataUpgradeable(auction.nftContract).safeTransferFrom(
            address(this),
            auction.seller,
            auction.tokenId
        );

        // Refund the highest bidder
        if (auction.highestBidder != address(0)) {
            auction.highestBidder.transfer(auction.highestBid);
        }
    }

    function checkAuctionEnd(uint256 _auctionId) external {
        Auction storage auction = auctions[_auctionId];
        if (
            block.timestamp >= auction.endTime &&
            !auction.ended &&
            !auction.cancelled
        ) {
            endAuction(_auctionId);
        }
    }
}
