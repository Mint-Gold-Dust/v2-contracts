//SPDX-License-Identifier: Unlicense
pragma solidity 0.8.17;

interface IMGD {
    event NFTListed(
        uint256 indexed tokenId,
        address seller,
        uint256 price,
        bool sold,
        bool artistRestricted
    );

    event NFTListedItemUpdated(
        uint256 indexed tokenId,
        address seller,
        uint256 price,
        bool sold,
        bool artistRestricted
    );

    event NFTPurchased(
        uint256 indexed tokenId,
        address seller,
        address newOwner,
        uint256 price
    );

    event NFTRemovedFromMarketplace(uint256 indexed tokenId, address seller);

    event NFTSentToAuction(uint256 indexed tokenId, address seller);

    event ArtistWhitelisted(address artistAddress);

    event ArtistBlacklisted(address artistAddress);
}
