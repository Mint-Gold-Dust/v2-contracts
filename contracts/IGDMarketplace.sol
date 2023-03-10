// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.17;

interface IGDMarketplace {
    event NFT_Minted(uint256 indexed tokenId, address owner);

    event NFT_Listed(
        uint256 itemId,
        uint256 indexed tokenId,
        address indexed seller,
        uint256 price
    );

    event NFT_ListedItemUpdated(
        uint256 itemId,
        uint256 indexed tokenId,
        address indexed seller,
        uint256 price
    );

    event NFT_Purchased(
        uint256 indexed tokenId,
        address indexed seller,
        address indexed newOwner,
        uint256 price
    );

    event NFT_RemovedFromMarketplace(uint256 indexed tokenId, address seller);

    event NFT_SentToAuction(uint256 indexed tokenId, address seller);

    event ArtistWhitelisted(address artistAddress);

    event ArtistBlacklisted(address artistAddress);
}
