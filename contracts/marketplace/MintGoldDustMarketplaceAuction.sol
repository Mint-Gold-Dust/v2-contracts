// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.18;

import {MintGoldDustNFT} from "./MintGoldDustNFT.sol";
import {AuctionProps, BidDTO, ListDTO, ManagePrimarySale, MarketItem, SaleDTO} from "../libraries/MgdMarketPlaceDataTypes.sol";
import {MintGoldDustMarketplace} from "./MintGoldDustMarketplace.sol";
import {IERC1155Receiver} from "@openzeppelin/contracts/token/ERC1155/IERC1155Receiver.sol";
import {IERC165} from "@openzeppelin/contracts/utils/introspection/IERC165.sol";
import {Counters} from "@openzeppelin/contracts/utils/Counters.sol";

/// @title A contract responsible by the Marketplace Auction functionalities
/// @notice Contains functions for list, place a bid in an existent auction
/// check if an auction time is ended and end an auction.
/// @author Mint Gold Dust LLC
/// @custom:contact klvh@mintgolddust.io
contract MintGoldDustMarketplaceAuction is MintGoldDustMarketplace {
    using Counters for Counters.Counter;

    /**
     * @notice that this event show the info about the creation of a new auction.
     * @dev this event will be triggered when a MintGoldDustNFT is listed for the  marketplace auction.
     * @param tokenId the sequence number for the item.
     * @param contractAddress the MintGoldDustERC721 address or the MintGoldDustERC1155 address.
     * @param seller the seller of this tokenId.
     * @param price the reserve price for this auction.
     *    @dev it can be zero (so the auction does not has a reserve price).
     * @param timeOfCreation the timestamp that the auction was created.
     * @param auctionId the sequence number for the auction.
     */
    event ItemListedToAuction(
        uint256 indexed tokenId,
        address contractAddress,
        address seller,
        uint256 price,
        uint256 timeOfCreation,
        uint256 indexed auctionId
    );

    /**
     * @notice that this event show the info about new bids in an auction.
     * @dev this event will be triggered if a new bid was placed.
     * @param tokenId the sequence number for the item.
     * @param contractAddress the MintGoldDustERC721 address or the MintGoldDustERC1155 address.
     * @param startTime the timestamp that the time was initialized for this auction.
     * @param endTime the startTime plus 24 hours.
     * @param auctionId the sequence number for the auction.
     */
    event AuctionTimeStarted(
        uint256 indexed tokenId,
        address contractAddress,
        uint256 startTime,
        uint256 endTime,
        uint256 indexed auctionId
    );

    /**
     * @notice that this event show the info about new bids in an auction.
     * @dev this event will be triggered if a new bid was placed.
     * @param tokenId the sequence number for the item.
     * @param contractAddress the MintGoldDustERC721 address or the MintGoldDustERC1155 address.
     * @param previousBidder the address that did the latest highest bid.
     * @param currentBidder the address is doing the new highest bid.
     * @param bid the amount that is being payed in the new bid.
     * @param bidTime the timestamp of the bid.
     * @param auctionId the sequence number for the auction.
     */
    event AuctionNewBid(
        uint256 indexed tokenId,
        address contractAddress,
        address previousBidder,
        address currentBidder,
        uint256 bid,
        uint256 bidTime,
        uint256 indexed auctionId
    );

    /**
     * @notice that this event is triggered when an auction has the time extended.
     * @dev if an auction receives a new highest bid, in the last five minutes of the auction time,
     *      then more five minutes are added to the auction endTime. So at this moment this event is triggered.
     * @param tokenId the sequence number for the item.
     * @param contractAddress the MintGoldDustERC721 address or the MintGoldDustERC1155 address.
     * @param newEndTime the auction endTime plus five minutes.
     * @param auctionId the sequence number for the auction.
     */
    event AuctionExtended(
        uint256 tokenId,
        address contractAddress,
        uint256 newEndTime,
        uint256 auctionId
    );

    /// @notice that this event is triggered when an auction is cancelled.
    /// @param tokenId the sequence number for the item.
    /// @param contractAddress the MintGoldDustERC721 address or the MintGoldDustERC1155 address.
    /// @param seller the seller of this tokenId.
    /// @param cancelTime the timestamp that the auction was cancelled.
    /// @param auctionId the sequence number for the auction.
    event AuctionCancelled(
        uint256 tokenId,
        address contractAddress,
        address seller,
        uint256 cancelTime,
        uint256 auctionId
    );

    /// @notice that this event is triggered when the winner call the endAuction function.s
    /// @param tokenId the sequence number for the item.
    /// @param contractAddress the MintGoldDustERC721 address or the MintGoldDustERC1155 address.
    /// @param seller the seller of this tokenId.
    /// @param endTime the timestamp that the highest bidder winner call the end auction to really get the token.
    /// @param auctionId the sequence number for the auction.
    event AuctionWinnerCall(
        uint256 tokenId,
        address contractAddress,
        address seller,
        uint256 endTime,
        uint256 auctionId
    );

    /// @notice that this event is triggered when some bidder place a bid greater than the last one.
    /// @param recipient the address that will receive the refund.
    /// @param amount the amount that will be refunded.
    event LastBidderRefunded(address indexed recipient, uint256 amount);

    error AuctionMustBeEnded(
        uint256 tokenId,
        address contractAddress,
        uint256 auctionId
    );
    error AuctionEndedAlready();
    error BidTooLow();
    error AuctionCannotBeEndedYet();
    error AuctionTimeNotStartedYet();
    error AuctionCreatorCannotBid();
    error LastBidderCannotPlaceNextBid();
    error AuctionAlreadyStarted();
    error ErrorToRefundLastBidder();
    error ListPriceMustBeGreaterOrEqualZero();

    Counters.Counter public auctionIds;
    mapping(address => mapping(address => mapping(uint256 => mapping(address => bool))))
        private checkBidder;

    /**
     *
     * @notice MGDAuction is a children of MintGoldDustMarketplace and this one is
     * composed by other two contracts.
     * @param mintGoldDustCompany_ The contract responsible to MGD management features.
     * @param mintGoldDustERC721Address_ The MGD ERC721.
     * @param mintGoldDustERC1155Address_ The MGD ERC721.
     */
    function initializeChild(
        address mintGoldDustCompany_,
        address payable mintGoldDustERC721Address_,
        address payable mintGoldDustERC1155Address_
    ) external initializer {
        MintGoldDustMarketplace.initialize(
            mintGoldDustCompany_,
            mintGoldDustERC721Address_,
            mintGoldDustERC1155Address_
        );
    }

    function supportsInterface(
        bytes4 interfaceId
    ) external pure returns (bool) {
        return interfaceId == type(IERC165).interfaceId;
    }

    /**
     *
     * @notice a function that allow users make new bid in an existent auction.
     * @dev to this function works some
     *      verifications need be done:
     *         - The bidder cannot be the auction creator;
     *         - The next bidder cannot be the same of the last bid;
     *         - The item must be listed;
     *         - The time of the auction should not be ended yet;
     *         - The bid value must be greater than zero
     *             - in case that the auction does not has a reserve price;
     *             - greater than the reserve price if the auction has one and is the first bid;
     *             - or greater than the last highest bid.
     *         - After all verifications pass we verify if the time of the auction was already started. If not we start it.
     *         - Also is verified if the bid is being done in the last final minutes of the bid (initiale it is set
     *           by 5 minutes). If yes, we add more the same quantity to the final of the end time of the auction.
     *         - If everything goes alright we do the transfers.
     * @param bidDTO struct that represents the data to be transfered between functions in the auction flow.
     *                It consists of the following fields:
     *                  - tokenId: the id of the token that is listed to this auction.
     *                  - contractAddress: is a MintGoldDustNFT address.
     *                  - seller: is the address of the seller of this tokenId.
     */
    function placeBid(BidDTO memory bidDTO) external payable nonReentrant {
        /// @dev verifications
        _isNotCreator(bidDTO);
        _isNotLastBidder(bidDTO);
        _isTokenListed(bidDTO.tokenId, address(bidDTO.nft), bidDTO.seller);
        _isAuctionTimeEnded(bidDTO);
        _isBidTooLow(bidDTO);

        if (
            checkBidder[msg.sender][address(bidDTO.nft)][bidDTO.tokenId][
                bidDTO.seller
            ] == false
        ) {
            checkBidder[msg.sender][address(bidDTO.nft)][bidDTO.tokenId][
                bidDTO.seller
            ] == true;

            /// @dev starts auction flow
            _isAuctionTimeStarted(bidDTO);
            _checkIfIsLast5MinutesAndAddMore5(bidDTO);
            _refundLastBidder(bidDTO);
            _manageNewBid(bidDTO);
            delete checkBidder[msg.sender][address(bidDTO.nft)][bidDTO.tokenId][
                bidDTO.seller
            ];
        }
    }

    /**
     * @notice that this function is responsible to cancel an auction.
     * @dev some verifications are done before cancel the auction.
     *            - The item must be listed.
     *            - The seller must be the msg.sender.
     *            - The auction must not be started yet.
     *            - The time of the auction should be zero.
     * @param tokenId is the token id of the listed item.
     * @param nft is a MintGoldDustERC721 or a MintGoldDustERC1155 contract address.
     * @notice if everything goes alright the token is retrieved by the seller and the function EMIT the AuctionCancelled event.
     *                In the final the item is deleted from the idMarketItemsByContractByOwner mapping.
     */
    function cancelAuction(
        uint256 tokenId,
        MintGoldDustNFT nft
    ) external nonReentrant {
        _isTokenListed(tokenId, address(nft), msg.sender);
        require(
            idMarketItemsByContractByOwner[address(nft)][tokenId][msg.sender]
                .seller == msg.sender,
            "Unauthorized"
        );

        if (
            idMarketItemsByContractByOwner[address(nft)][tokenId][msg.sender]
                .auctionProps
                .endTime > 0
        ) {
            revert AuctionAlreadyStarted();
        }

        nft.transfer(
            address(this),
            msg.sender,
            tokenId,
            idMarketItemsByContractByOwner[address(nft)][tokenId][msg.sender]
                .tokenAmount
        );

        emit AuctionCancelled(
            tokenId,
            address(nft),
            idMarketItemsByContractByOwner[address(nft)][tokenId][msg.sender]
                .seller,
            block.timestamp,
            idMarketItemsByContractByOwner[address(nft)][tokenId][msg.sender]
                .auctionProps
                .auctionId
        );

        delete idMarketItemsByContractByOwner[address(nft)][tokenId][
            msg.sender
        ];
    }

    /**
     * @notice that this function is responsible to finalize the flow of the auciton
     * that must be a purchaseNFT sale.
     * @dev this function must be called from the frontend only when the time of the auction is ended.
     *      Who can call this function?
     *        - The highest bidder;
     *        - The seller;
     *        - The MintGoldDustCompany owner.
     * @dev some verifications are done before finalize the auction.
     *            - The item must be listed.
     *            - The highest bidder must be the msg.sender.
     *            - And the time of the auction must already be reached out the final.
     *            - The auction must not be ended yet.
     *            - The time of the auction should not be zero.
     * @param bidDTO struct that represents the data to be transfered between functions in the auction flow.
     *                It consists of the following fields:
     *                  - tokenId: the id of the token that is listed to this auction.
     *                  - contractAddress: is a MintGoldDustNFT address.
     *                  - seller: is the address of the seller of this tokenId.
     */
    function endAuction(BidDTO memory bidDTO) external nonReentrant {
        _isTokenListed(bidDTO.tokenId, address(bidDTO.nft), bidDTO.seller);
        MarketItem storage item = idMarketItemsByContractByOwner[
            address(bidDTO.nft)
        ][bidDTO.tokenId][bidDTO.seller];
        require(
            item.auctionProps.highestBidder == msg.sender ||
                item.seller == msg.sender ||
                mintGoldDustCompany.owner() == msg.sender,
            "Unauthorized"
        );

        if (block.timestamp < item.auctionProps.endTime) {
            revert AuctionCannotBeEndedYet();
        }

        if (item.auctionProps.ended) {
            revert AuctionEndedAlready();
        }

        if (item.auctionProps.endTime == 0) {
            revert AuctionTimeNotStartedYet();
        }

        item.auctionProps.ended = true;
        uint256 auctionId = item.auctionProps.auctionId;

        purchaseAuctionNft(
            SaleDTO(
                bidDTO.tokenId,
                item.tokenAmount,
                bidDTO.nft,
                bidDTO.seller
            ),
            item.auctionProps.highestBid
        );

        emit AuctionWinnerCall(
            bidDTO.tokenId,
            address(bidDTO.nft),
            bidDTO.seller,
            block.timestamp,
            auctionId
        );
    }

    /**
     * @notice that is function to list a MintGoldDustNFT for the marketplace auction.
     * @dev This is an implementation of a virtual function declared in the father contract.
     *      Here we call the more generic list function passing the correct params for an auction flow
     *      and after that emit the ItemListedToAuction event.
     * @param tokenId: The tokenId of the marketItem.
     * @param amount: The quantity of tokens to be listed for an MintGoldDustERC1155.
     *    @dev For MintGoldDustERC721 the amout must be always one.
     * @param nft: The MintGoldDustERC1155 or the MintGoldDustERC721 address.
     * @param priceForAllTokens: The price or reserve price for the quantity of tokens listed.
     *    @dev in the auction the seller must set a price for all tokens that are being listed.
     */
    function list(
        uint256 tokenId,
        uint256 amount,
        MintGoldDustNFT nft,
        uint256 priceForAllTokens
    ) external override whenNotPaused {
        _mustBeMintGoldDustERC721Or1155(address(nft));
        _checkAmount(amount);
        _isNotListed(tokenId, address(nft), msg.sender);

        ListDTO memory listDTO = ListDTO(
            tokenId,
            amount,
            nft,
            priceForAllTokens
        );

        auctionIds.increment();

        _list(listDTO, auctionIds.current(), msg.sender);

        emit ItemListedToAuction(
            listDTO.tokenId,
            address(nft),
            msg.sender,
            listDTO.price,
            block.timestamp,
            auctionIds.current()
        );
    }

    /**
     * Acquire a listed item for the MintGoldDustMarketplaceAuction.
     * @notice function will fail if the token was not listed to the auction market.
     * @notice function will fail if the contract address is not a MintGoldDustERC721 neither a MintGoldDustERC1155.
     * @notice function will fail if the amount paid by the buyer does not cover the purshace amount required.
     * @dev This function is specific for the auction market. Then, in this case, the function will be called
     *      internally from the MGDAuction contract. So is not possible to get the msg.value. Then we're receiving the value by param.
     * @param saleDTO The SaleDTO struct parameter to use.
     *                 It consists of the following fields:
     *                    - tokenid: The tokenId of the marketItem.
     *                    - amount: The quantity of tokens to be listed for an MintGoldDustERC1155. For
     *                              MintGoldDustERC721 the amout must be always one.
     *                    - contractAddress: The MintGoldDustERC1155 or the MintGoldDustERC721 address.
     *                    - seller: The seller of the marketItem.
     * @param value The value to be paid for the purchase.
     *    @dev we need to receive the sender this way, because in the auction flow the purchase starts from
     *         the endAuction function in the MintGoldDustMarketplaceAuction contract. So from there the address
     *         that we get is the highst bidder that is stored in the marketItem struct. So we need to manage this way.
     */
    function purchaseAuctionNft(
        SaleDTO memory saleDTO,
        uint256 value
    ) internal {
        _isTokenListed(saleDTO.tokenId, address(saleDTO.nft), saleDTO.seller);

        _mustBeMintGoldDustERC721Or1155(address(saleDTO.nft));

        _hasEnoughAmountListed(
            saleDTO.tokenId,
            address(saleDTO.nft),
            address(this),
            saleDTO.amount,
            saleDTO.seller
        );

        MarketItem memory _marketItem = _getMarketItem(saleDTO);

        /// @dev if the flow goes for ERC721 the amount of tokens MUST be ONE.
        uint256 _realAmount = 1;

        if (!_marketItem.isERC721) {
            _realAmount = saleDTO.amount;
            _isBuyingAllListedTokens(saleDTO);
        }

        //require(_marketItem.price == value, "Invalid amount for this purchase");

        _checkIfIsPrimaryOrSecondarySaleAndCall(
            _marketItem,
            saleDTO,
            value,
            _marketItem.auctionProps.highestBidder,
            _realAmount
        );
    }

    /**
     * @dev the main goal of this function is check if the endTime of the auction is different of zero, so
     *      the time auction was already started. And, in this case, if the endTime is greater than the current timestamp.
     * @notice that if not it REVERTS with a AuctionMustBeEnded error.
     * @param bidDTO BidDTO struct.
     */
    function _isAuctionTimeEnded(BidDTO memory bidDTO) private view {
        MarketItem storage item = idMarketItemsByContractByOwner[
            address(bidDTO.nft)
        ][bidDTO.tokenId][bidDTO.seller];
        if (
            item.auctionProps.endTime != 0 &&
            block.timestamp >= item.auctionProps.endTime
        ) {
            revert AuctionMustBeEnded(
                bidDTO.tokenId,
                address(bidDTO.nft),
                item.auctionProps.auctionId
            );
        }
    }

    /**
     * @dev the goal of this function is check the amount paid by the buyer is valid.
     * @notice that first if the reserve price is zero so the amount paid must be greater than it.
     * @notice that in the second case if we have a reserve price and the highest bid is zero. It means
     *         that the first bid needs to be greater than the reserve price.
     * @notice that in the last case the item alredy has received some bid. So the amount paid
     *         must be greater than the last highest bid.
     * @notice if one of the conditions was not met the function REVERTS with a BidTooLow() error.
     * @param bidDTO BidDTO struct.
     */
    function _isBidTooLow(BidDTO memory bidDTO) private {
        MarketItem storage item = idMarketItemsByContractByOwner[
            address(bidDTO.nft)
        ][bidDTO.tokenId][bidDTO.seller];

        if (item.price == 0 && msg.value <= 0) {
            revert BidTooLow();
        }

        /// @dev in this case the item did not received any bids yet and the bid is less than the reserve price
        if (item.auctionProps.highestBid == 0 && msg.value < item.price) {
            revert BidTooLow();
        }

        /// @dev in this case the item have already received bids and the bid is less or equal the latest highest bid + 3%
        if (
            item.auctionProps.highestBid != 0 &&
            msg.value < (item.auctionProps.highestBid * 103) / 100
        ) {
            revert BidTooLow();
        }

        ManagePrimarySale memory managePs = bidDTO.nft.getManagePrimarySale(
            bidDTO.tokenId
        );

        if (
            (managePs.owner == bidDTO.seller && !managePs.soldout) &&
            item.auctionProps.highestBid == 0 &&
            item.price > 0 &&
            msg.value < (item.price * 103) / 100
        ) {
            revert BidTooLow();
        }
    }

    /**
     * @dev the goal of this function start the time for the auction if it was not started yet.
     * @notice that it EMITS the AuctionTimeStarted event when the time is started.
     * @notice that the end time is the start time plus the mintGoldDustCompany.auctionDuration(). This
     *         value is 24 hours and is defined at the moment of the deployment of the contracts.
     * @param bidDTO BidDTO struct.
     */
    function _isAuctionTimeStarted(BidDTO memory bidDTO) private {
        MarketItem storage item = idMarketItemsByContractByOwner[
            address(bidDTO.nft)
        ][bidDTO.tokenId][bidDTO.seller];

        if (item.auctionProps.endTime == 0) {
            /// @dev The time starts to count for the auction.
            item.auctionProps.startTime = block.timestamp;
            item.auctionProps.endTime =
                item.auctionProps.startTime +
                mintGoldDustCompany.auctionDuration();

            emit AuctionTimeStarted(
                bidDTO.tokenId,
                address(bidDTO.nft),
                item.auctionProps.startTime,
                item.auctionProps.endTime,
                item.auctionProps.auctionId
            );
        }
    }

    /**
     * @dev the goal of this function is check if the endTime is in the final minutes configured initially
     *      by five minutes in the MintGoldDustCompany contract. If yes it adds more five minutes to the
     *      auction end time and EMITS the AuctionExtended event.
     * @param bidDTO BidDTO struct.
     */
    function _checkIfIsLast5MinutesAndAddMore5(BidDTO memory bidDTO) private {
        MarketItem storage item = idMarketItemsByContractByOwner[
            address(bidDTO.nft)
        ][bidDTO.tokenId][bidDTO.seller];
        /**
         * @dev If a higher bid happens in the last 5 minutes we should add more 5 minutes
         * to the end time auction.
         */
        if (
            item.auctionProps.endTime - block.timestamp <
            mintGoldDustCompany.auctionFinalMinutes()
        ) {
            item.auctionProps.endTime =
                item.auctionProps.endTime +
                mintGoldDustCompany.auctionFinalMinutes();
            emit AuctionExtended(
                bidDTO.tokenId,
                address(bidDTO.nft),
                item.auctionProps.endTime,
                item.auctionProps.auctionId
            );
        }
    }

    /**
     * @dev if the auction receives a new highest bid so the latest amount paid by the last address
     *      must be refunded for it. So this function add the amount to the recipientBalances mapping.
     * @param bidDTO BidDTO struct.
     * @notice that the mapping is incremented only if is not the first bid in the auction.
     * @notice that the function EMIT the LastBidderRefunded event.
     */
    function _refundLastBidder(BidDTO memory bidDTO) private {
        MarketItem storage item = idMarketItemsByContractByOwner[
            address(bidDTO.nft)
        ][bidDTO.tokenId][bidDTO.seller];

        if (item.auctionProps.highestBidder != address(0)) {
            address lastBidder = item.auctionProps.highestBidder;
            uint256 amount = item.auctionProps.highestBid;
            item.auctionProps.highestBid = 0;

            (bool success, ) = address(lastBidder).call{value: amount}("");

            if (!success) {
                revert ErrorToRefundLastBidder();
            }

            emit LastBidderRefunded(item.auctionProps.highestBidder, amount);
        }
    }

    /**
     * @dev this is the last step in the place a bid flow. Here all the correct values will be
     *      updated to the idMarketItemsByContractByOwner mapping.
     * @notice that the AuctionNewBid event is emmited.
     * @param bidDTO BidDTO struct.
     */
    function _manageNewBid(BidDTO memory bidDTO) private {
        MarketItem storage item = idMarketItemsByContractByOwner[
            address(bidDTO.nft)
        ][bidDTO.tokenId][bidDTO.seller];

        /// @dev save the previous bidder to show in the event.
        address previousBidder = item.auctionProps.highestBidder;

        uint256 realPrice = msg.value;

        ManagePrimarySale memory managePs = bidDTO.nft.getManagePrimarySale(
            bidDTO.tokenId
        );

        /// @dev If is primary sale so the bidder needs to pay the item price + 3% of the item price
        if ((managePs.owner == bidDTO.seller && !managePs.soldout)) {
            realPrice = (msg.value * 100 * 1e18) / (103) / 1e18;
        }

        /// @dev here we change the states.
        item.price = realPrice;
        item.auctionProps.highestBid = msg.value;
        item.auctionProps.highestBidder = msg.sender;

        emit AuctionNewBid(
            bidDTO.tokenId,
            address(bidDTO.nft),
            previousBidder,
            msg.sender,
            realPrice,
            block.timestamp,
            item.auctionProps.auctionId
        );
    }

    /**
     * @dev this function verify if the address is not the seller.
     * @notice if yes it REVERTS with a AuctionCreatorCannotBid() error.
     * @param bidDTO BidDTO struct.
     */
    function _isNotCreator(BidDTO memory bidDTO) private view {
        if (
            idMarketItemsByContractByOwner[address(bidDTO.nft)][bidDTO.tokenId][
                bidDTO.seller
            ].seller == msg.sender
        ) {
            revert AuctionCreatorCannotBid();
        }
    }

    /**
     * @dev this function verify if the address is not the auction current highest bidder.
     * @notice if yes it REVERTS with a LastBidderCannotPlaceNextBid() error.
     * @param bidDTO BidDTO struct.
     */
    function _isNotLastBidder(BidDTO memory bidDTO) private view {
        if (
            idMarketItemsByContractByOwner[address(bidDTO.nft)][bidDTO.tokenId][
                bidDTO.seller
            ].auctionProps.highestBidder == msg.sender
        ) {
            revert LastBidderCannotPlaceNextBid();
        }
    }
}
