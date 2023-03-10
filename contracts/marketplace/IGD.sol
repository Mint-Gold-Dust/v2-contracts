//SPDX-License-Identifier: Unlicense
pragma solidity 0.8.17;

interface IGD {
    event NFT_Minted(uint256 indexed tokenId, address owner);

    event NFT_Listed(uint256 indexed tokenId, address seller, uint256 price);

    event NFT_ListedItemUpdated(
        uint256 indexed tokenId,
        address seller,
        uint256 price
    );

    event NFT_Purchased(
        uint256 indexed tokenId,
        address seller,
        address newOwner,
        uint256 price
    );

    event NFT_RemovedFromMarketplace(uint256 indexed tokenId, address seller);

    event NFT_SentToAuction(uint256 indexed tokenId, address seller);

    event ArtistWhitelisted(address artistAddress);

    event ArtistBlacklisted(address artistAddress);
}
