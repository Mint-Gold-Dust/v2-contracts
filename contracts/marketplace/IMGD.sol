//SPDX-License-Identifier: Unlicense
pragma solidity 0.8.17;

interface IMGD {
    event NFT_Minted(uint256 indexed tokenId, address owner, string tokenURI);

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
        uint256 buyPrice,
        uint256 royaltyPercent,
        uint256 royaltyAmount,
        address royaltyRecipient,
        uint256 feeAmount
    );

    event NFT_RemovedFromMarketplace(uint256 indexed tokenId, address seller);

    event NFT_SentToAuction(uint256 indexed tokenId, address seller);

    event ArtistWhitelisted(address artistAddress, bool state);
}
