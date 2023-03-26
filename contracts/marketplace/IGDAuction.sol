//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.17;

/// @title Gold Dust NFT
/// @author Gold Dust LLC
/// @custom:contact klvh@mintgolddust.io

interface IGDAuction {
    event AuctionCreated(
        address nftContract,
        uint256 tokenId,
        address seller,
        uint256 startingPrice,
        uint256 reservePrice,
        uint256 endTime,
        address highestBidder,
        uint256 highestBid,
        bool cancelled,
        bool ended
    );
}
