//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.17;

/// @title Gold Dust NFT
/// @author Gold Dust LLC
/// @custom:contact klvh@mintgolddust.io

interface IGD {
    function isTokenSecondarySale(
        uint256 _tokenId
    ) external view returns (bool);

    event NftMinted(
        uint256 indexed tokenId,
        address owner,
        string tokenURI,
        uint256 royalty
    );

    event NftListed(uint256 indexed tokenId, address seller, uint256 price);

    event NftListedItemUpdated(
        uint256 indexed tokenId,
        address seller,
        uint256 price
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

    event NftRemovedFromMarketplace(uint256 indexed tokenId, address seller);

    event NftSentToAuction(
        uint256 indexed tokenId,
        address seller,
        address auctionAddress
    );

    event ArtistWhitelisted(address artistAddress, bool state);

    event ValidatorAdded(address validatorAddress, bool state);
}
