// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.18;

import {MintGoldDustNFT} from "../marketplace/MintGoldDustNFT.sol";

/**
 * This struct consists of the following fields:
 *    - endTime: the time that the auction must be finished. Is the start time plus 24 hours.
 *    - highestBidder: the bidder that did bid the highest value.
 *    - highestBid: the value of the high bid.
 *    - ended: a boolean that indicates if the auction was already finished or not.
 */
struct AuctionProps {
    uint256 auctionId;
    uint256 startTime;
    uint256 endTime;
    address highestBidder;
    uint256 highestBid;
    bool ended;
}

/**
 * @notice that is a Data Transfer Object to be transferred betwwen the functions in the auction flow.
 *              It consists of the following fields:
 *                    - tokenId: The tokenId of the marketItem.
 *                    - nft: The MintGoldDustERC1155 or the MintGoldDustERC721 address.
 *                    - seller: The seller of the marketItem.
 */
struct BidDTO {
    uint256 tokenId;
    MintGoldDustNFT nft;
    address seller;
}

/**
 * @notice that is a Data Transfer Object to be transferred between functions in the Collector (lazy) mint flow.
 *              It consists of the following fields:
 *                    - nft: The MintGoldDustERC1155 or the MintGoldDustERC721 address.
 *                    - tokenURI the URI that contains the metadata for the NFT.
 *                    - royalty the royalty percentage to be applied for this NFT secondary sales.
 *                    - collaborators an array of address that can be a number of maximum 4 collaborators.
 *                    - ownersPercentage an array of uint256 that are the percetages for the artist and for each one of the collaborators.
 *                    - amount: The quantity of tokens to be listed for an MintGoldDustERC1155. For
 *                              MintGoldDustERC721 the amout must be always one.
 *                    - artistSigner: the address of the artist creator.
 *                    - price: the price to be paid for the item in the set price market.
 *                    - collectorMintId: the id of the collector mint generated off chain.
 */
struct CollectorMintDTO {
    MintGoldDustNFT nft;
    string tokenURI;
    uint256 royalty;
    bytes memoir;
    address[] collaborators;
    uint256[] ownersPercentage;
    uint256 amount;
    address artistSigner;
    uint256 price;
    uint256 collectorMintId;
}

struct DelistDTO {
    uint256 tokenId;
    uint256 amount;
    MintGoldDustNFT nft;
}

/**
 * @notice that is a Data Transfer Object to be transferred between functions for the listing flow.
 *              It consists of the following fields:
 *                    - tokenid: The tokenId of the marketItem.
 *                    - amount: The quantity of tokens to be listed for an MintGoldDustERC1155. For
 *                              MintGoldDustERC721 the amout must be always one.
 *                    - nft: The MintGoldDustERC1155 or the MintGoldDustERC721 address.
 *                    - price: the price to be paid for the item in the set price market and it correponds
 *                             to the reserve price for the marketplace auction.
 */
struct ListDTO {
    uint256 tokenId;
    uint256 amount;
    MintGoldDustNFT nft;
    uint256 price;
}

/// @notice that this struct has the necessary fields to manage the secondary sales.
/// @dev it will be used by the isSecondarySale mapping.
struct ManagePrimarySale {
    address owner;
    bool soldout;
    uint256 amount;
}

/**
 * This struct consists of the following fields:
 *    - tokenId: The tokenId of the marketItem.
 *    - seller: The seller of the marketItem.
 *    - price: The price which the item should be sold.
 *    - sold: It says if an item was or not sold.
 *    - isAuction: true if the item was listed for marketplace auction and false if for set price market.
 *    - isERC721: true is an MintGoldDustERC721 token.
 *    - tokenAmount: The quantity of tokens to be listed for an MintGoldDustERC1155. For
 *              MintGoldDustERC721 the amout must be always one.
 *    - AuctionProps: The AuctionProps structure (See below).
 */
struct MarketItem {
    uint256 tokenId;
    address seller;
    uint256 price;
    bool isERC721;
    uint256 tokenAmount;
    AuctionProps auctionProps;
}

/**
 * @notice that is a Data Transfer Object to be transferred between functions for the sale flow.
 *              It consists of the following fields:
 *                  - tokenid: The tokenId of the marketItem.
 *                  - amount: The quantity of tokens to be listed for an MintGoldDustERC1155. For
 *                            MintGoldDustERC721 the amout must be always one.
 *                  - nft: The MintGoldDustERC1155 or the MintGoldDustERC721 address.
 *                  - seller: The seller of the marketItem.
 */
struct SaleDTO {
    uint256 tokenId;
    uint256 amount;
    MintGoldDustNFT nft;
    address seller;
}
