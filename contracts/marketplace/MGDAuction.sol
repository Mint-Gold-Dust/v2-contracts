// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.18;

import "./MGDMarketplace.sol";

error AuctionEnded();
error AuctionCancelled();
error BidTooLow();
error AuctionCannotBeEndedYet();
error AuctionTimeNotStartedYet();
error AuctionCreatorCannotBid();
error LastBidderCannotBidAgain();

contract MGDAuction is MGDMarketplace {
    constructor(
        address mgdCompany,
        address mgdNft
    ) MGDMarketplace(mgdCompany, mgdNft) {}

    function list(
        uint256 _tokenId,
        uint256 _price
    ) public override isArtist(_tokenId) isNFTowner(_tokenId) {
        AuctionProps memory auctionProps = AuctionProps(
            0,
            payable(address(0)),
            0,
            false,
            false
        );

        idMarketItem[_tokenId] = MarketItem(
            _tokenId,
            payable(msg.sender),
            _price,
            false,
            true,
            true,
            auctionProps
        );

        try _mgdNft.transfer(msg.sender, address(this), _tokenId) {} catch {
            revert MGDMarketErrorToTransfer();
        }

        emit NftListedToAuction(_tokenId, payable(msg.sender), _price, 0);
    }

    event AuctionExtended(uint256 tokenId, uint256 newEndTime);

    /**
     * @notice This function is responsible to allow a collector place a new
     * bid in an existent auction.
     * @param _tokenId the NFT identifier
     */
    function placeBid(
        uint256 _tokenId
    )
        public
        payable
        isListed(_tokenId)
        isNotCreator(msg.sender, _tokenId)
        isNotLastBidder(msg.sender, _tokenId)
    {
        if (
            idMarketItem[_tokenId].auctionProps.endTime != 0 &&
            block.timestamp >= idMarketItem[_tokenId].auctionProps.endTime
        ) {
            revert AuctionEnded();
        }

        if (idMarketItem[_tokenId].auctionProps.cancelled) {
            revert AuctionCancelled();
        }

        if (idMarketItem[_tokenId].price == 0 && msg.value <= 0) {
            revert BidTooLow();
        }

        if (
            idMarketItem[_tokenId].auctionProps.highestBid == 0 &&
            msg.value < idMarketItem[_tokenId].price
        ) {
            revert BidTooLow();
        }

        if (
            idMarketItem[_tokenId].auctionProps.highestBid != 0 &&
            msg.value <= idMarketItem[_tokenId].auctionProps.highestBid
        ) {
            revert BidTooLow();
        }

        // The time starts to count for the auction
        if (idMarketItem[_tokenId].auctionProps.endTime == 0) {
            idMarketItem[_tokenId].auctionProps.endTime =
                block.timestamp +
                _mgdCompany.auctionDuration();
        }

        // If a higher bid happens in the last 5 minutes we should add more 5 minutes
        // to the end time auction
        if (
            idMarketItem[_tokenId].auctionProps.endTime - block.timestamp <
            _mgdCompany.auctionFinalMinutes()
        ) {
            idMarketItem[_tokenId].auctionProps.endTime =
                idMarketItem[_tokenId].auctionProps.endTime +
                _mgdCompany.auctionFinalMinutes();

            emit AuctionExtended(
                _tokenId,
                idMarketItem[_tokenId].auctionProps.endTime
            );
        }

        payable(idMarketItem[_tokenId].auctionProps.highestBidder).transfer(
            idMarketItem[_tokenId].auctionProps.highestBid
        );

        idMarketItem[_tokenId].auctionProps.highestBid = msg.value;
        idMarketItem[_tokenId].auctionProps.highestBidder = msg.sender;

        emit AuctionNewBid(_tokenId, msg.sender, msg.value, block.timestamp);
    }

    function endAuction(uint256 _tokenId) public {
        if (idMarketItem[_tokenId].auctionProps.endTime == 0) {
            revert AuctionTimeNotStartedYet();
        }

        if (
            idMarketItem[_tokenId].auctionProps.endTime != 0 &&
            block.timestamp < idMarketItem[_tokenId].auctionProps.endTime
        ) {
            revert AuctionCannotBeEndedYet();
        }

        if (idMarketItem[_tokenId].auctionProps.cancelled) {
            revert AuctionCancelled();
        }
    }

    modifier isNotCreator(address _bidder, uint256 _tokenId) {
        if (_mgdNft.tokenIdArtist(_tokenId) == _bidder) {
            revert AuctionCreatorCannotBid();
        }
        _;
    }

    modifier isNotLastBidder(address _bidder, uint256 _tokenId) {
        if (idMarketItem[_tokenId].auctionProps.highestBidder == _bidder) {
            revert LastBidderCannotBidAgain();
        }
        _;
    }
}
