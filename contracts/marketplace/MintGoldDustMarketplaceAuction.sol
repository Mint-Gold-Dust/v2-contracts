// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.18;

import "./MintGoldDustMarketplace.sol";
import "@openzeppelin/contracts/token/ERC1155/IERC1155Receiver.sol";
import "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";

error AuctionMustBeEnded(
    uint256 _tokenId,
    address contractAddress,
    uint256 _auctionId
);
error AuctionEndedAlready();
error BidTooLow();
error AuctionCannotBeEndedYet();
error AuctionTimeNotStartedYet();
error AuctionCreatorCannotBid();
error LastBidderCannotPlaceNextBid();
error AuctionAlreadyStarted();

/// @title A contract responsible by the Marketplace Auction functionalities
/// @notice Contains functions for list, place a bid in an existent auction
/// check if an auction time is ended and end an auction.
/// @author Mint Gold Dust LLC
/// @custom:contact klvh@mintgolddust.io
contract MintGoldDustMarketplaceAuction is
    MintGoldDustMarketplace,
    ReentrancyGuardUpgradeable,
    IERC1155Receiver
{
    bytes4 private constant ERC165_ID = 0x01ffc9a7; //ERC165

    using Counters for Counters.Counter;
    Counters.Counter public auctionIds;

    function supportsInterface(
        bytes4 interfaceId
    ) public pure override returns (bool) {
        return interfaceId == ERC165_ID;
    }

    mapping(address => uint256) public recipientBalances;
    mapping(address => uint256) public ownerBalances;

    /**
     *
     * @notice MGDAuction is a children of MintGoldDustMarketplace and this one is
     * composed by other two contracts.
     * @param _mintGoldDustCompany The contract responsible to MGD management features.
     * @param _mintGoldDustERC721Address The MGD ERC721.
     * @param _mintGoldDustERC1155Address The MGD ERC721.
     */
    function initializeChild(
        address _mintGoldDustCompany,
        address payable _mintGoldDustERC721Address,
        address payable _mintGoldDustERC1155Address
    ) public initializer {
        super.initialize(
            _mintGoldDustCompany,
            _mintGoldDustERC721Address,
            _mintGoldDustERC1155Address
        );
    }

    function onERC1155Received(
        address operator,
        address from,
        uint256 id,
        uint256 value,
        bytes calldata data
    ) external pure override returns (bytes4) {
        return this.onERC1155Received.selector;
    }

    function onERC1155BatchReceived(
        address operator,
        address from,
        uint256[] calldata ids,
        uint256[] calldata values,
        bytes calldata data
    ) external pure override returns (bytes4) {
        return this.onERC1155BatchReceived.selector;
    }

    /**
     * @notice that is a Data Transfer Object to be transferred betwwen the functions in the auction flow.
     *              It consists of the following fields:
     *                    - tokenId: The tokenId of the marketItem.
     *                    - contractAddress: The MintGoldDustERC1155 or the MintGoldDustERC721 address.
     *                    - seller: The seller of the marketItem.
     */
    struct BidDTO {
        uint256 tokenId;
        address contractAddress;
        address seller;
    }

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

    event AuctionCancelled(
        uint256 tokenId,
        address contractAddress,
        address seller,
        uint256 cancelTime,
        uint256 auctionId
    );

    event AuctionWinnerCall(
        uint256 tokenId,
        address contractAddress,
        address seller,
        uint256 endTime,
        uint256 auctionId
    );

    event Withdrawal(address indexed recipient, uint256 amount);

    event LastBidderRefunded(
        address indexed recipient,
        uint256 amount,
        uint256 totalAmount
    );

    /**
     * @notice that is function to list a MintGoldDustNFT for the marketplace auction.
     * @dev This is an implementation of a virtual function declared in the father contract.
     *      Here we call the more generic list function passing the correct params for an auction flow
     *      and after that emit the ItemListedToAuction event.
     * @param _tokenId: The tokenId of the marketItem.
     * @param _amount: The quantity of tokens to be listed for an MintGoldDustERC1155.
     *    @dev For MintGoldDustERC721 the amout must be always one.
     * @param _contractAddress: The MintGoldDustERC1155 or the MintGoldDustERC721 address.
     * @param _price: The price or reserve price for the item.
     */
    function list(
        uint256 _tokenId,
        uint256 _amount,
        address _contractAddress,
        uint256 _price
    ) public override whenNotPaused {
        SaleDTO memory _saleDTO = SaleDTO(
            _tokenId,
            _amount,
            _contractAddress,
            msg.sender
        );

        uint256 _realPrice = _price;

        if (_contractAddress == mintGoldDustERC1155Address) {
            _realPrice = _price / _amount;
        }

        ListDTO memory _listDTO = ListDTO(_saleDTO, _realPrice);

        auctionIds.increment();

        list(_listDTO, true, address(this), auctionIds.current());

        emit ItemListedToAuction(
            _listDTO.saleDTO.tokenId,
            _contractAddress,
            msg.sender,
            _listDTO.price,
            block.timestamp,
            auctionIds.current()
        );
    }

    /**
     * @dev the main goal of this function is check if the endTime of the auction is different of zero, so
     *      the time auction was already started. And, in this case, if the endTime is greater than the current timestamp.
     * @notice that if not it REVERTS with a AuctionMustBeEnded error.
     * @param _bidDTO BidDTO struct.
     */
    function isAuctionTimeEnded(BidDTO memory _bidDTO) private view {
        if (
            idMarketItemsByContractByOwner[_bidDTO.contractAddress][
                _bidDTO.tokenId
            ][_bidDTO.seller].auctionProps.endTime !=
            0 &&
            block.timestamp >=
            idMarketItemsByContractByOwner[_bidDTO.contractAddress][
                _bidDTO.tokenId
            ][_bidDTO.seller].auctionProps.endTime
        ) {
            revert AuctionMustBeEnded(
                _bidDTO.tokenId,
                _bidDTO.contractAddress,
                idMarketItemsByContractByOwner[_bidDTO.contractAddress][
                    _bidDTO.tokenId
                ][_bidDTO.seller].auctionProps.auctionId
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
     * @param _bidDTO BidDTO struct.
     */
    function isBidTooLow(BidDTO memory _bidDTO) private {
        if (
            idMarketItemsByContractByOwner[_bidDTO.contractAddress][
                _bidDTO.tokenId
            ][_bidDTO.seller].price ==
            0 &&
            msg.value <= 0
        ) {
            revert BidTooLow();
        }

        /// @dev in this case the item did not received any bids yet and the bid is less than the reserve price
        if (
            idMarketItemsByContractByOwner[_bidDTO.contractAddress][
                _bidDTO.tokenId
            ][_bidDTO.seller].auctionProps.highestBid ==
            0 &&
            msg.value <
            idMarketItemsByContractByOwner[_bidDTO.contractAddress][
                _bidDTO.tokenId
            ][_bidDTO.seller].price *
                idMarketItemsByContractByOwner[_bidDTO.contractAddress][
                    _bidDTO.tokenId
                ][_bidDTO.seller].tokenAmount
        ) {
            revert BidTooLow();
        }

        /// @dev in this case the item have already received bids and the bid is less or equal the latest highest bid
        if (
            idMarketItemsByContractByOwner[_bidDTO.contractAddress][
                _bidDTO.tokenId
            ][_bidDTO.seller].auctionProps.highestBid !=
            0 &&
            msg.value <=
            idMarketItemsByContractByOwner[_bidDTO.contractAddress][
                _bidDTO.tokenId
            ][_bidDTO.seller].auctionProps.highestBid
        ) {
            revert BidTooLow();
        }
    }

    /**
     * @dev the goal of this function start the time for the auction if it was not started yet.
     * @notice that it EMIT the AuctionTimeStarted event when the time is started.
     * @notice that the end time is the start time plus the mintGoldDustCompany.auctionDuration(). This
     *         value is 24 hours at the moment of the deployment of the contracts.
     * @param _bidDTO BidDTO struct.
     */
    function isAuctionTimeStarted(BidDTO memory _bidDTO) private {
        /// @dev The time starts to count for the auction.
        if (
            idMarketItemsByContractByOwner[_bidDTO.contractAddress][
                _bidDTO.tokenId
            ][_bidDTO.seller].auctionProps.endTime == 0
        ) {
            uint256 _startTime = block.timestamp;
            uint256 _endTime = _startTime +
                mintGoldDustCompany.auctionDuration();

            idMarketItemsByContractByOwner[_bidDTO.contractAddress][
                _bidDTO.tokenId
            ][_bidDTO.seller].auctionProps.endTime = _endTime;

            emit AuctionTimeStarted(
                _bidDTO.tokenId,
                _bidDTO.contractAddress,
                _startTime,
                _endTime,
                idMarketItemsByContractByOwner[_bidDTO.contractAddress][
                    _bidDTO.tokenId
                ][_bidDTO.seller].auctionProps.auctionId
            );
        }
    }

    /**
     * @dev the goal of this function is check if the endTime is in the final minutes configured initially
     *      by five minutes in the MintGoldDustCompany contract. If yes it adds more five minutes to the
     *      auction end time and EMIT the AuctionExtended event.
     * @param _bidDTO BidDTO struct.
     */
    function checkIfIsLast5MinutesAndAddMore5(BidDTO memory _bidDTO) private {
        /**
         * @dev If a higher bid happens in the last 5 minutes we should add more 5 minutes
         * to the end time auction.
         */
        if (
            idMarketItemsByContractByOwner[_bidDTO.contractAddress][
                _bidDTO.tokenId
            ][_bidDTO.seller].auctionProps.endTime -
                block.timestamp <
            mintGoldDustCompany.auctionFinalMinutes()
        ) {
            idMarketItemsByContractByOwner[_bidDTO.contractAddress][
                _bidDTO.tokenId
            ][_bidDTO.seller].auctionProps.endTime =
                idMarketItemsByContractByOwner[_bidDTO.contractAddress][
                    _bidDTO.tokenId
                ][_bidDTO.seller].auctionProps.endTime +
                mintGoldDustCompany.auctionFinalMinutes();

            emit AuctionExtended(
                _bidDTO.tokenId,
                _bidDTO.contractAddress,
                idMarketItemsByContractByOwner[_bidDTO.contractAddress][
                    _bidDTO.tokenId
                ][_bidDTO.seller].auctionProps.endTime,
                idMarketItemsByContractByOwner[_bidDTO.contractAddress][
                    _bidDTO.tokenId
                ][_bidDTO.seller].auctionProps.auctionId
            );
        }
    }

    /**
     * @dev this function is responsible to transfer the funds bidder that had yours bid surpassed by another highest bid.
     * @param amount the amount to be transferred.
     * @notice that the function REVERTS if the amount is greater than the balance of the bidder.
     * @notice that the function EMIT the Withdrawal event.
     */
    function withdrawRefundedFunds(uint256 amount) external {
        require(
            amount <= recipientBalances[msg.sender],
            "Insufficient balance"
        );
        recipientBalances[msg.sender] -= amount;
        (bool success, ) = msg.sender.call{value: amount}("");
        require(success, "Failed to transfer funds.");
        emit Withdrawal(msg.sender, amount);
    }

    // Helper function to check the recipient's balance
    function getRefundedBiddersBalance() external view returns (uint256) {
        require(recipientBalances[msg.sender] > 0, "No funds to withdraw.");
        return recipientBalances[msg.sender];
    }

    /**
     * @dev if the auction receives a new highest bid so the latest amount paid by the last address
     *      must be refunded for it. So this function add the amount to the recipientBalances mapping.
     * @param _bidDTO BidDTO struct.
     * @notice that the mapping is incremented only if is not the first bid in the auction.
     * @notice that the function EMIT the LastBidderRefunded event.
     */
    function refundLastBidder(BidDTO memory _bidDTO) private {
        if (
            idMarketItemsByContractByOwner[_bidDTO.contractAddress][
                _bidDTO.tokenId
            ][_bidDTO.seller].auctionProps.highestBidder != address(0)
        ) {
            recipientBalances[
                idMarketItemsByContractByOwner[_bidDTO.contractAddress][
                    _bidDTO.tokenId
                ][_bidDTO.seller].auctionProps.highestBidder
            ] =
                recipientBalances[
                    idMarketItemsByContractByOwner[_bidDTO.contractAddress][
                        _bidDTO.tokenId
                    ][_bidDTO.seller].auctionProps.highestBidder
                ] +
                idMarketItemsByContractByOwner[_bidDTO.contractAddress][
                    _bidDTO.tokenId
                ][_bidDTO.seller].auctionProps.highestBid;

            emit LastBidderRefunded(
                idMarketItemsByContractByOwner[_bidDTO.contractAddress][
                    _bidDTO.tokenId
                ][_bidDTO.seller].auctionProps.highestBidder,
                idMarketItemsByContractByOwner[_bidDTO.contractAddress][
                    _bidDTO.tokenId
                ][_bidDTO.seller].auctionProps.highestBid,
                recipientBalances[
                    idMarketItemsByContractByOwner[_bidDTO.contractAddress][
                        _bidDTO.tokenId
                    ][_bidDTO.seller].auctionProps.highestBidder
                ]
            );
        }
    }

    /**
     * @dev this is the last step in the place a bid flow. Here all the correct values will be
     *      updated to the idMarketItemsByContractByOwner mapping.
     * @notice that the AuctionNewBid event is emmited.
     * @param _bidDTO BidDTO struct.
     */
    function manageNewBid(BidDTO memory _bidDTO) private {
        /// @dev save the previous bidder to show in the event.
        address previousBidder = idMarketItemsByContractByOwner[
            _bidDTO.contractAddress
        ][_bidDTO.tokenId][_bidDTO.seller].auctionProps.highestBidder;
        /// @dev here we change the states.
        idMarketItemsByContractByOwner[_bidDTO.contractAddress][
            _bidDTO.tokenId
        ][_bidDTO.seller].price = msg.value;
        idMarketItemsByContractByOwner[_bidDTO.contractAddress][
            _bidDTO.tokenId
        ][_bidDTO.seller].auctionProps.highestBid = msg.value;
        idMarketItemsByContractByOwner[_bidDTO.contractAddress][
            _bidDTO.tokenId
        ][_bidDTO.seller].auctionProps.highestBidder = msg.sender;

        emit AuctionNewBid(
            _bidDTO.tokenId,
            _bidDTO.contractAddress,
            previousBidder,
            msg.sender,
            msg.value,
            block.timestamp,
            idMarketItemsByContractByOwner[_bidDTO.contractAddress][
                _bidDTO.tokenId
            ][_bidDTO.seller].auctionProps.auctionId
        );
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
     * @param _bidDTO struct that represents the data to be transfered between functions in the auction flow.
     *                It consists of the following fields:
     *                  - tokenId: the id of the token that is listed to this auction.
     *                  - contractAddress: is a MintGoldDustNFT address.
     *                  - seller: is the address of the seller of this tokenId.
     */
    function placeBid(BidDTO memory _bidDTO) public payable whenNotPaused {
        /// @dev verifications
        isNotCreator(_bidDTO);
        isNotLastBidder(_bidDTO);
        isTokenIdListed(_bidDTO.tokenId, _bidDTO.contractAddress);
        isAuctionTimeEnded(_bidDTO);
        isBidTooLow(_bidDTO);

        /// @dev starts auction flow
        isAuctionTimeStarted(_bidDTO);
        checkIfIsLast5MinutesAndAddMore5(_bidDTO);
        refundLastBidder(_bidDTO);
        manageNewBid(_bidDTO);
    }

    /**
     * @notice that this function is responsible to cancel an auction.
     * @dev some verifications are done before cancel the auction.
     *            - The item must be listed.
     *            - The seller must be the msg.sender.
     *            - The auction must not be started yet.
     *            - The time of the auction should be zero.
     * @param _bidDTO struct that represents the data to be transfered between functions in the auction flow.
     * @notice if everything goes alright the token is retrieved by the seller and the function EMIT the AuctionCancelled event.
     *                In the final the item is deleted from the idMarketItemsByContractByOwner mapping.
     */
    function cancelAuction(BidDTO memory _bidDTO) public {
        isTokenIdListed(_bidDTO.tokenId, _bidDTO.contractAddress);
        require(
            idMarketItemsByContractByOwner[_bidDTO.contractAddress][
                _bidDTO.tokenId
            ][msg.sender].seller == msg.sender,
            "Unauthorized"
        );

        if (
            idMarketItemsByContractByOwner[_bidDTO.contractAddress][
                _bidDTO.tokenId
            ][msg.sender].auctionProps.endTime > 0
        ) {
            revert AuctionAlreadyStarted();
        }

        MintGoldDustNFT _mintGoldDustNFT = getERC1155OrERC721(
            idMarketItemsByContractByOwner[_bidDTO.contractAddress][
                _bidDTO.tokenId
            ][msg.sender].isERC721
        );

        _mintGoldDustNFT.transfer(
            address(this),
            msg.sender,
            _bidDTO.tokenId,
            idMarketItemsByContractByOwner[_bidDTO.contractAddress][
                _bidDTO.tokenId
            ][msg.sender].tokenAmount
        );

        emit AuctionCancelled(
            _bidDTO.tokenId,
            _bidDTO.contractAddress,
            idMarketItemsByContractByOwner[_bidDTO.contractAddress][
                _bidDTO.tokenId
            ][msg.sender].seller,
            block.timestamp,
            idMarketItemsByContractByOwner[_bidDTO.contractAddress][
                _bidDTO.tokenId
            ][msg.sender].auctionProps.auctionId
        );

        delete idMarketItemsByContractByOwner[_bidDTO.contractAddress][
            _bidDTO.tokenId
        ][msg.sender];
    }

    /**
     * @notice that this function is responsible to finalize the flow of the auciton
     * that must be a purchaseNFT sale.
     * @dev this function must be called from the frontend only when the time of the auction is ended.
     *      Also is important to make possible only for the winner call this function.
     * @dev some verifications are done before finalize the auction.
     *            - The item must be listed.
     *            - The highest bidder must be the msg.sender.
     *            - And the time of the auction must already be reached out the final.
     *            - The auction must not be ended yet.
     *            - The time of the auction should not be zero.
     * @param _bidDTO struct that represents the data to be transfered between functions in the auction flow.
     *                It consists of the following fields:
     *                  - tokenId: the id of the token that is listed to this auction.
     *                  - contractAddress: is a MintGoldDustNFT address.
     *                  - seller: is the address of the seller of this tokenId.
     */
    function endAuction(BidDTO memory _bidDTO) public whenNotPaused {
        isTokenIdListed(_bidDTO.tokenId, _bidDTO.contractAddress);
        require(
            idMarketItemsByContractByOwner[_bidDTO.contractAddress][
                _bidDTO.tokenId
            ][_bidDTO.seller].auctionProps.highestBidder == msg.sender,
            "Unauthorized"
        );

        if (
            block.timestamp <
            idMarketItemsByContractByOwner[_bidDTO.contractAddress][
                _bidDTO.tokenId
            ][_bidDTO.seller].auctionProps.endTime
        ) {
            revert AuctionCannotBeEndedYet();
        }

        if (
            idMarketItemsByContractByOwner[_bidDTO.contractAddress][
                _bidDTO.tokenId
            ][_bidDTO.seller].auctionProps.ended
        ) {
            revert AuctionEndedAlready();
        }

        if (
            idMarketItemsByContractByOwner[_bidDTO.contractAddress][
                _bidDTO.tokenId
            ][_bidDTO.seller].auctionProps.endTime == 0
        ) {
            revert AuctionTimeNotStartedYet();
        }

        idMarketItemsByContractByOwner[_bidDTO.contractAddress][
            _bidDTO.tokenId
        ][_bidDTO.seller].auctionProps.ended = true;

        purchaseAuctionNft(
            SaleDTO(
                _bidDTO.tokenId,
                idMarketItemsByContractByOwner[_bidDTO.contractAddress][
                    _bidDTO.tokenId
                ][_bidDTO.seller].tokenAmount,
                _bidDTO.contractAddress,
                _bidDTO.seller
            ),
            idMarketItemsByContractByOwner[_bidDTO.contractAddress][
                _bidDTO.tokenId
            ][_bidDTO.seller].auctionProps.highestBid,
            idMarketItemsByContractByOwner[_bidDTO.contractAddress][
                _bidDTO.tokenId
            ][_bidDTO.seller].auctionProps.highestBidder
        );

        emit AuctionWinnerCall(
            _bidDTO.tokenId,
            _bidDTO.contractAddress,
            idMarketItemsByContractByOwner[_bidDTO.contractAddress][
                _bidDTO.tokenId
            ][_bidDTO.seller].seller,
            block.timestamp,
            idMarketItemsByContractByOwner[_bidDTO.contractAddress][
                _bidDTO.tokenId
            ][_bidDTO.seller].auctionProps.auctionId
        );
    }

    /**
     * @dev this function verify if the address is not the seller.
     * @notice if yes it REVERTS with a AuctionCreatorCannotBid() error.
     * @param _bidDTO BidDTO struct.
     */
    function isNotCreator(BidDTO memory _bidDTO) private view {
        if (
            idMarketItemsByContractByOwner[_bidDTO.contractAddress][
                _bidDTO.tokenId
            ][_bidDTO.seller].seller == msg.sender
        ) {
            revert AuctionCreatorCannotBid();
        }
    }

    /**
     * @dev this function verify if the address is not the auction current highest bidder.
     * @notice if yes it REVERTS with a LastBidderCannotPlaceNextBid() error.
     * @param _bidDTO BidDTO struct.
     */
    function isNotLastBidder(BidDTO memory _bidDTO) private view {
        if (
            idMarketItemsByContractByOwner[_bidDTO.contractAddress][
                _bidDTO.tokenId
            ][_bidDTO.seller].auctionProps.highestBidder == msg.sender
        ) {
            revert LastBidderCannotPlaceNextBid();
        }
    }
}
