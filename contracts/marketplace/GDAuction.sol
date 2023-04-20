// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.18;

/// @title Mint Gold Dust NFT
/// @author Mint Gold Dust LLC
/// @notice Contains functions for bid on an auction that contains GDNFT ERC721 tokens
/// @custom:contact klvh@mintgolddust.io

import "@openzeppelin/contracts-upgradeable/token/ERC721/IERC721Upgradeable.sol";
import "./IGDAuction.sol";
import "./GDMarketplace.sol";
import "./IGD.sol";

error ChooseSetPriceOrReservePrice();
error SetPriceMustBeGreaterThanZero();
error AuctionEnded();
error AuctionCancelled();
error BidTooLow();
error ErrorTest();

contract GDAuction is IGDAuction {
    constructor(uint256 _duration) {
        duration = _duration;
    }

    Auction[] public auctions;

    uint256 private duration;

    struct Auction {
        address nftContract;
        uint256 tokenId;
        address payable seller;
        uint256 price;
        uint256 endTime;
        address payable highestBidder;
        uint256 highestBid;
        bool cancelled;
        bool ended;
        bool isSetPrice;
        bool isReservePrice;
    }

    function createAuction(
        address _nftContract,
        uint256 _tokenId,
        uint256 _price,
        bool _isSetPrice,
        bool _isReservePrice
    ) public {
        uint256 _duration;

        if (_isSetPrice == true && _isReservePrice == true) {
            revert ChooseSetPriceOrReservePrice();
        }

        if (_isSetPrice == true && _price == 0) {
            revert SetPriceMustBeGreaterThanZero();
        }

        require(
            IERC721Upgradeable(_nftContract).ownerOf(_tokenId) != address(0),
            "Token does not exist."
        );

        if (_isSetPrice) {
            _duration = block.timestamp + duration;
        } else {
            _duration = 0;
        }

        // Add new auction to array of auctions
        auctions.push(
            Auction({
                nftContract: _nftContract,
                tokenId: _tokenId,
                seller: payable(msg.sender),
                price: _price,
                endTime: _duration,
                highestBidder: payable(address(0)),
                highestBid: 0,
                cancelled: false,
                ended: false,
                isSetPrice: _isSetPrice,
                isReservePrice: _isReservePrice
            })
        );

        emit AuctionCreated(
            _nftContract,
            _tokenId,
            payable(msg.sender),
            _price,
            _duration,
            payable(address(0)),
            0,
            false,
            false,
            _isSetPrice,
            _isReservePrice
        );
    }

    function placeBid(uint256 _auctionId) external payable {
        // GDNFTMarketplace gdMarketplace = GDNFTMarketplace(
        //   payable(auctions[_auctionId].nftContract)
        // );
        // if (gdMarketplace.primary_sale_fee_percent() == 15000000000000000000) {
        //   revert ErrorTest();
        // }

        if (
            auctions[_auctionId].endTime != 0 &&
            block.timestamp >= auctions[_auctionId].endTime
        ) {
            revert AuctionEnded();
        }

        if (auctions[_auctionId].cancelled) {
            revert AuctionCancelled();
        }

        // Ensure that the bid is higher than the current highest bid
        if (msg.value <= auctions[_auctionId].highestBid) {
            revert BidTooLow();
        }

        // Ensure that the bid is higher than reserve price if the auction has one
        if (
            !auctions[_auctionId].isSetPrice &&
            (auctions[_auctionId].price > 0 &&
                auctions[_auctionId].highestBid == 0 &&
                msg.value < auctions[_auctionId].price)
        ) {
            revert BidTooLow();
        }

        /**
         *
         * @notice If is not a setPrice auction and it is without a reserve price,
         * so the first bid greater than zero must start the auction time.
         */
        if (
            !auctions[_auctionId].isSetPrice &&
            (auctions[_auctionId].price == 0 &&
                auctions[_auctionId].highestBid == 0)
        ) {
            auctions[_auctionId].endTime = block.timestamp + duration;
        }

        if (
            !auctions[_auctionId].isSetPrice &&
            (auctions[_auctionId].price > 0 &&
                auctions[_auctionId].highestBid == 0 &&
                msg.value >= auctions[_auctionId].price)
        ) {
            auctions[_auctionId].endTime = block.timestamp + duration;
        }

        // If there is a previous highest bidder, refund their bid
        if (auctions[_auctionId].highestBidder != address(0)) {
            auctions[_auctionId].highestBidder.transfer(
                auctions[_auctionId].highestBid
            );
        }

        // Update the highest bid and bidder
        auctions[_auctionId].highestBidder = payable(msg.sender);
        auctions[_auctionId].highestBid = msg.value;
    }

    /**
     * Acquire a listed NFT
     * Primary fee percentage from primary sale is charged by the platform
     * Secondary fee percentage from secondary sale is charged by the platform while royalty is sent to artist
     * @notice Function will fail is artist has marked NFT as restricted
     * @param _auctionId The token ID of the the token to acquire
     */
    function endAuction(uint256 _auctionId) public {
        Auction memory auction = auctions[_auctionId];

        GDNFTMarketplace gdMarketplace = GDNFTMarketplace(
            payable(auction.nftContract)
        );

        if (auction.highestBid == 0) {
            gdMarketplace.safeTransferFrom(
                gdMarketplace.ownerOf(auction.tokenId),
                auction.seller,
                auction.tokenId
            );
        }

        gdMarketplace.setItemSold(auction.tokenId, true);

        uint256 fee;
        uint256 collFee;
        uint256 royalty;
        uint256 balance;

        if (gdMarketplace.tokenID_SecondarySale(auction.tokenId) == false) {
            fee =
                (auction.highestBid *
                    gdMarketplace.primary_sale_fee_percent()) /
                (100 * 10 ** 18);
            collFee =
                (auction.highestBid * gdMarketplace.collector_fee()) /
                (100 * 10 ** 18);
            balance = auction.highestBid - (fee + collFee);
            gdMarketplace.setTokenAsSecondarySale(auction.tokenId);
            payable(gdMarketplace.OWNER()).transfer(collFee);
        } else {
            fee =
                (auction.highestBid *
                    gdMarketplace.secondary_sale_fee_percent()) /
                (100 * 10 ** 18);
            royalty =
                (auction.highestBid *
                    gdMarketplace.tokenID_RoyaltyPercent(auction.tokenId)) /
                (100 * 10 ** 18);

            balance = auction.highestBid - (fee + royalty);
            payable(gdMarketplace.tokenID_Artist(auction.tokenId)).transfer(
                royalty
            );
        }
        payable(gdMarketplace.OWNER()).transfer(fee);
        payable(auction.seller).transfer(balance);

        gdMarketplace.safeTransferFrom(
            gdMarketplace.ownerOf(auction.tokenId),
            auction.highestBidder,
            auction.tokenId
        );

        emit NftPurchased(
            auction.tokenId,
            auction.seller,
            auction.highestBidder,
            auction.highestBid,
            gdMarketplace.tokenID_RoyaltyPercent(auction.tokenId),
            royalty,
            gdMarketplace.tokenID_Artist(auction.tokenId),
            fee,
            collFee
        );
    }

    function endAuction2(uint256 _auctionId) public {
        // Retrieve the auction from the array of auctions
        Auction storage auction = auctions[_auctionId];

        // Ensure that the auction has not already ended or been cancelled
        require(!auction.ended, "Auction has already ended");
        require(!auction.cancelled, "Auction has been cancelled");

        // Mark the auction as ended
        auction.ended = true;

        // Transfer the NFT to the highest bidder
        IERC721Upgradeable(auction.nftContract).safeTransferFrom(
            auction.seller,
            auction.highestBidder,
            auction.tokenId
        );

        // Transfer the highest bid to the seller
        payable(auction.seller).transfer(auction.highestBid);
    }

    function cancelAuction(uint256 _auctionId) external {
        // Retrieve the auction from the array of auctions
        Auction storage auction = auctions[_auctionId];

        // Ensure that the auction has not already ended or been cancelled
        require(!auction.ended, "Auction has already ended");
        require(!auction.cancelled, "Auction has already been cancelled");

        // Ensure that the caller is the seller of the auction
        require(
            msg.sender == auction.seller,
            "Only the seller can cancel the auction"
        );

        // Mark the auction as cancelled
        auction.cancelled = true;

        // Transfer the NFT back to the seller
        IERC721Upgradeable(auction.nftContract).transferFrom(
            address(this),
            auction.seller,
            auction.tokenId
        );

        // Refund the highest bidder
        if (auction.highestBidder != address(0)) {
            auction.highestBidder.transfer(auction.highestBid);
        }
    }

    function checkAuctionEnd(uint256 _auctionId) external {
        Auction storage auction = auctions[_auctionId];
        if (
            block.timestamp >= auction.endTime &&
            !auction.ended &&
            !auction.cancelled
        ) {
            endAuction(_auctionId);
        }
    }
}
