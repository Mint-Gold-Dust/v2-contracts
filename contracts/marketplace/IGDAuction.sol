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
        uint256 price,
        uint256 endTime,
        address highestBidder,
        uint256 highestBid,
        bool cancelled,
        bool ended,
        bool setPrice,
        bool reservePrice
    );

    event NftPurchased(
        uint256 indexed tokenId,
        address seller,
        address newOwner,
        uint256 buyPrice,
        uint256 royaltyPercent,
        uint256 royaltyAmount,
        address royaltyRecipient,
        uint256 feeAmount,
        uint256 collectorFeeAmount
    );
}
