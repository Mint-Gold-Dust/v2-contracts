//SPDX-License-Identifier: Unlicense
pragma solidity 0.8.17;

interface IGD {
    event NFTMinted(uint256 indexed tokenId, address owner);

    event NFTListed(uint256 indexed tokenId, address seller, uint256 price);

    event NFTRelisted(uint256 indexed tokenId, address seller, uint256 price);

    event NFTListedItemUpdated(
        uint256 indexed tokenId,
        address seller,
        uint256 price
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
