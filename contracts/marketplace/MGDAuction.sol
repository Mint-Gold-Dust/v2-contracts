// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.17;

import "./MGDMarketplace.sol";

error AuctionMustBeEnded(uint256 _tokenId);
error AuctionEndedAlready();
error BidTooLow();
error AuctionCannotBeEndedYet();
error AuctionTimeNotStartedYet();
error AuctionCreatorCannotBid();
error LastBidderCannotPlaceNextBid();

/// @title A contract responsible by the Auction Market functionalities
/// @notice Contains functions for list, place a bid in an existent auction
/// check if an auction time is ended and end an auction.
/// @author Mint Gold Dust LLC
/// @custom:contact klvh@mintgolddust.io
contract MGDAuction is MGDMarketplace {
    /**
     *
     * @notice MGDAuction is a children of MGDMarketplace and this one is
     * composed by other two contracts.
     * @param mgdCompany The contract responsible to MGD management features.
     * @param mintGoldDustERC721 The MGD ERC721.
     */
    function initialize(
        address mgdCompany,
        address mintGoldDustERC721
    ) public override initializer {
        MGDMarketplace.initialize(mgdCompany, mintGoldDustERC721);
    }

    event NftListedToAuction(
        uint256 indexed tokenId,
        address seller,
        uint256 price,
        uint256 timeOfCreation
    );

    event AuctionTimeStarted(
        uint256 indexed tokenId,
        uint256 startTime,
        uint256 endTime
    );

    event AuctionNewBid(
        uint256 indexed tokenId,
        address seller,
        address previousBidder,
        address currentBidder,
        uint256 bid,
        uint256 bidTime
    );

    event AuctionExtended(uint256 tokenId, uint256 newEndTime);

    /**
     *
     * @notice Only the owner of the NFT can call this function.
     * @dev This is an implementation of a virtual function declared in the father
     * contract. Here we're listing an NFT to the Auction MGD Market. If the seller do not
     * pass a price, it means that the auction doesn't has a reserve price. In other case it has.
     * Is important to know that after list an item to auction is not possible to cancel it like
     * the delist function in the Set Price market.
     * @param _tokenId The id of the NFT token to be listed.
     * @param _price  The respective price that the seller wants to set like reserve price
     * to list this item.
     */
    function list(
        uint256 _tokenId,
        uint256 _price
    ) public override isNFTowner(_tokenId) {
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
            idMarketItem[_tokenId].isSecondarySale,
            auctionProps
        );

        /**
         * @dev Here we have an external call to the MGD ERC721 contract
         * because of that we have the try catch.
         */
        try _mgdNft.transfer(msg.sender, address(this), _tokenId) {
            emit NftListedToAuction(
                _tokenId,
                payable(msg.sender),
                _price,
                block.timestamp
            );
        } catch {
            revert MGDMarketErrorToTransfer();
        }
    }

    /**
     *
     * @notice a function that allow users make new bid in an existent auction.
     * @dev to this function works some verifications need be done: The item must be listed;
     * The bidder cannot be the auction creator; The next bidder cannot be the same of the last bid;
     * The time of the auction should not be ended yet; The bid value must be greater than zero in
     * case that the auction does not has a reserve price. Greater than the reserve price if the auction has
     * one and is the first bid. Or greater than the last highest bid.
     * After all verifications pass we verify if the time of the auction was already started. If not
     * we start it.
     * Also is verified if the bid is being done in the last final minutes of the bid (initiale it is set
     * by 5 minutes). If yes, we add more the same quantity to the final of the end time of the auction.
     * If everything goes alright we do the transfers.
     * @param _tokenId is the id of the NFT listed to this auction.
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
            revert AuctionMustBeEnded(_tokenId);
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

        /// @dev The time starts to count for the auction.
        if (idMarketItem[_tokenId].auctionProps.endTime == 0) {
            uint256 _startTime = block.timestamp;
            uint256 _endTime = _startTime + _mgdCompany.auctionDuration();

            idMarketItem[_tokenId].auctionProps.endTime = _endTime;

            emit AuctionTimeStarted(_tokenId, _startTime, _endTime);
        }

        /**
         * @dev If a higher bid happens in the last 5 minutes we should add more 5 minutes
         * to the end time auction.
         */
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

        /**
         * @dev Here we refund the last bidder.
         */
        payable(idMarketItem[_tokenId].auctionProps.highestBidder).transfer(
            idMarketItem[_tokenId].auctionProps.highestBid
        );

        /// @dev save the previous bidder to show in the event.
        address previousBidder = idMarketItem[_tokenId]
            .auctionProps
            .highestBidder;
        /// @dev here we change the states.
        idMarketItem[_tokenId].price = msg.value;
        idMarketItem[_tokenId].auctionProps.highestBid = msg.value;
        idMarketItem[_tokenId].auctionProps.highestBidder = msg.sender;

        emit AuctionNewBid(
            _tokenId,
            idMarketItem[_tokenId].seller,
            previousBidder,
            msg.sender,
            msg.value,
            block.timestamp
        );
    }

    /**
     * @notice that this function is responsible to finalize the flow of the auciton
     * that must be a purchaseNFT sale.
     * @dev some verifications are done before finalize the auction. The time must not
     * be ended yet. The time of the auction should not be zero. And the time of the
     * auction must already be reached out the final.
     * @param _tokenId the id of the token that is listed to this auction.
     */
    function endAuction(uint256 _tokenId) public isListed(_tokenId) {
        if (block.timestamp < idMarketItem[_tokenId].auctionProps.endTime) {
            revert AuctionCannotBeEndedYet();
        }

        if (idMarketItem[_tokenId].auctionProps.ended) {
            revert AuctionEndedAlready();
        }

        if (idMarketItem[_tokenId].auctionProps.endTime == 0) {
            revert AuctionTimeNotStartedYet();
        }

        idMarketItem[_tokenId].auctionProps.ended = true;
        purchaseNft(_tokenId, idMarketItem[_tokenId].auctionProps.highestBid);
    }

    modifier isNotCreator(address _bidder, uint256 _tokenId) {
        if (idMarketItem[_tokenId].seller == _bidder) {
            revert AuctionCreatorCannotBid();
        }
        _;
    }

    modifier isNotLastBidder(address _bidder, uint256 _tokenId) {
        if (idMarketItem[_tokenId].auctionProps.highestBidder == _bidder) {
            revert LastBidderCannotPlaceNextBid();
        }
        _;
    }
}
