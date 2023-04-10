//SPDX-License-Identifier: Unlicense
pragma solidity 0.8.18;

/// @title Mint Gold Dust Company
/// @author Mint Gold Dust LLC
/// @custom:contact klvh@mintgolddust.io
interface IMGDMarketplace {
    event ArtistWhitelisted(address artistAddress, bool state);

    event ValidatorAdded(address validatorAddress, bool state);

    event NftMinted(
        uint256 indexed tokenId,
        address owner,
        string tokenURI,
        uint256 royalty
    );

    event NftListedToAuction(
        uint256 tokenId,
        address seller,
        uint256 price,
        uint256 endTime
    );

    event NftListedToSetPrice(
        uint256 indexed tokenId,
        address seller,
        uint256 price
    );

    event NftListedItemUpdated(
        uint256 indexed tokenId,
        address seller,
        uint256 price
    );

    event NftPurchasedPrimaryMarket(
        uint256 indexed tokenId,
        address seller,
        address newOwner,
        uint256 buyPrice,
        uint256 feeAmount,
        uint256 collectorFeeAmount
    );

    event NftPurchasedSecondaryMarket(
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
}
