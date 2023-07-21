// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.18;

import "@openzeppelin/contracts/utils/Counters.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721Receiver.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/utils/introspection/ERC165Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/PausableUpgradeable.sol";
import "./MintGoldDustCompany.sol";
import "./MintGoldDustERC721.sol";
import "./MintGoldDustNFT.sol";
import "./MintGoldDustERC1155.sol";

error MintGoldDustItemIsNotListed(address _contractAddress);
error MintGoldDustItemIsAlreadyListed(address _contractAddress);
error MintGoldDustAddressUnauthorized(string _reason);
error MintGoldDustListPriceMustBeGreaterThanZero();
error MintGoldDustErrorToTransfer(string _reason);
error MintGoldDustFunctionForSetPriceListedNFT();
error MintGoldDustFunctionForAuctionListedNFT();
error MintGoldDustMustBeERC721OrERC1155();
error MintGoldDustLessItemsListedThanThePurchaseAmount();
error MintGoldDustInvalidAmountForThisPurchase();
error MintGoldDustPurchaseOfERC1155InAuctionThatCoverAllListedItems();
error MintGoldDustCollectorMintDataNotMatch();

/// @title An abstract contract responsible to define some general responsibilites related with
/// a marketplace for its childrens.
/// @notice Contain a general function for purchases in primary and secondary sales
/// and also a virtual function that each children should have a specif implementation.
/// @author Mint Gold Dust LLC
/// @custom:contact klvh@mintgolddust.io
abstract contract MintGoldDustMarketplace is
    Initializable,
    PausableUpgradeable
{
    /**
     *
     * @notice MintGoldDustMarketplace is composed by other two contracts.
     * @param _mgdCompany The contract responsible to MGD management features.
     * @param _mintGoldDustERC721Address The MGD ERC721 address.
     * @param _mintGoldDustERC1155Address The MGD ERC1155 address.
     */
    function initialize(
        address _mgdCompany,
        address payable _mintGoldDustERC721Address,
        address payable _mintGoldDustERC1155Address
    ) public initializer {
        mgdCompany = MintGoldDustCompany(payable(_mgdCompany));
        mintGoldDustERC721Address = _mintGoldDustERC721Address;
        mintGoldDustERC1155Address = _mintGoldDustERC1155Address;
    }

    using Counters for Counters.Counter;
    Counters.Counter public itemsSold;

    MintGoldDustCompany internal mgdCompany;
    address payable internal mintGoldDustERC721Address;
    address payable internal mintGoldDustERC1155Address;
    uint256[48] __gap;

    /**
     * @notice that this mapping do the relationship between a contract address,
     *         the tokenId created in this contract (MintGoldDustERC721 or MintGoldDustERC1155)
     *         the owner address and the Market Item owned.
     * @dev this mapping is necessary mainly because of the ERC1155. I.e Some artist can mint the quantity
     *      of 10 for a tokenId. After it can list 8 items. So other address can buy 4 and another 4.
     *      Then this MarketItem can has 3 different owners for the same tokenId for the MintGoldDustERC1155 address.
     */
    mapping(address => mapping(uint256 => mapping(address => MarketItem)))
        public idMarketItemsByContractByOwner;

    /**
     * This struct consists of the following fields:
     *    - tokenId: The tokenId of the marketItem.
     *    - seller: The seller of the marketItem.
     *    - price: The price which the item should be sold.
     *    - sold: It says if an item was or not sold.
     *    - isAuction: true if the item was listed for marketplace auction and false if for set price market.
     *    - isSecondarySale: true if the item was already sold first time.
     *    - isERC721: true is an MintGoldDustERC721 token.
     *    - tokenAmount: The quantity of tokens to be listed for an MintGoldDustERC1155. For
     *              MintGoldDustERC721 the amout must be always one.
     *    - AuctionProps: The AuctionProps structure (See below).
     */
    struct MarketItem {
        uint256 tokenId;
        address seller;
        uint256 price;
        bool sold;
        bool isAuction;
        bool isSecondarySale;
        bool isERC721;
        uint256 tokenAmount;
        AuctionProps auctionProps;
    }

    /**
     * This struct consists of the following fields:
     *    - endTime: the time that the auction must be finished. Is the start time plus 24 hours.
     *    - highestBidder: the bidder that did bid the highest value.
     *    - highestBid: the value of the high bid.
     *    - ended: a boolean that indicates if the auction was already finished or not.
     */
    struct AuctionProps {
        uint256 auctionId;
        uint256 endTime;
        address highestBidder;
        uint256 highestBid;
        bool cancelled;
        bool ended;
    }

    /**
     * @notice that this event show the info about primary sales.
     * @dev this event will be triggered if a primary sale is correctly completed.
     * @param saleId a uint value that indicates the sale number.
     * @param tokenId the sequence number for the item.
     * @param seller the address of the seller.
     * @param newOwner the address that is buying the item.
     * @param buyPrice the price that the buyer is paying for the item.
     * @param sellerAmount the final value that the seller should receive.
     * @param feeAmount the primary sale fee to be applied on top of the item price.
     * @param collectorFeeAmount the value paind by the collector to the marketplace.
     * @param tokenAmountSold the quantity of tokens bought.
     * @param hasCollaborators a parameter that indicate if the item has or not collaborators.
     */
    event MintGoldDustNftPurchasedPrimaryMarket(
        uint256 indexed saleId,
        uint256 indexed tokenId,
        address seller,
        address newOwner,
        uint256 buyPrice,
        uint256 sellerAmount,
        uint256 feeAmount,
        uint256 collectorFeeAmount,
        uint256 tokenAmountSold,
        bool hasCollaborators,
        bool isAuction,
        bool isERC721
    );

    /**
     * @notice that this event show the info about secondary sales.
     * @dev this event will be triggered if a secondary sale is correctly completed.
     * @param saleId a uint value that indicates the sale number.
     * @param tokenId the sequence number for the item.
     * @param seller the address of the seller.
     * @param newOwner the address that is buying the item.
     * @param sellerAmount the final value that the seller should receive.
     * @param royaltyPercent the royalty percent setted for this token.
     * @param royaltyAmount the value to be paid for the artist and the collaborators (when it has) for the royalties.
     * @param royaltyRecipient the main recipient for the royalty value (the artist).
     * @param feeAmount the fee final value that was paid to the marketplace.
     * @param tokenAmountSold the quantity of tokens bought.
     * @param hasCollaborators a parameter that indicate if the item has or not collaborators.
     */
    event MintGoldDustNftPurchasedSecondaryMarket(
        uint256 indexed saleId,
        uint256 indexed tokenId,
        address seller,
        address newOwner,
        uint256 buyPrice,
        uint256 sellerAmount,
        uint256 royaltyPercent,
        uint256 royaltyAmount,
        address royaltyRecipient,
        uint256 feeAmount,
        uint256 tokenAmountSold,
        bool hasCollaborators,
        bool isAuction,
        bool isERC721
    );

    /**
     * @notice that this event is used when a item has collaborators.
     * @dev this event shouldbe used if splitted market items. At the purchase moment it will
     *      be triggered for each one of the collaborators including the artist.
     * @param saleId a uint value that indicates the sale number.
     * @dev use this to vinculate this event with the MintGoldDustNftPurchasedSecondaryMarket that contains more
     *      general info about the sale.
     * @param collaborator the sequence number for the item.
     * @param amount the final value that the seller should receive.
     */
    event NftPurchasedCollaboratorAmount(
        uint256 indexed saleId,
        address collaborator,
        uint256 amount
    );

    /**
     * @notice that is a Data Transfer Object to be transferred between functions for the sale flow.
     *              It consists of the following fields:
     *                  - tokenid: The tokenId of the marketItem.
     *                  - amount: The quantity of tokens to be listed for an MintGoldDustERC1155. For
     *                            MintGoldDustERC721 the amout must be always one.
     *                  - contractAddress: The MintGoldDustERC1155 or the MintGoldDustERC721 address.
     *                  - seller: The seller of the marketItem.
     */
    struct SaleDTO {
        uint256 tokenId;
        uint256 amount;
        address contractAddress;
        address seller;
    }

    /**
     * @notice that is a Data Transfer Object to be transferred between functions for the listing flow.
     *              It consists of the following fields:
     *                    - SaleDTO struct that contains:
     *                        - tokenid: The tokenId of the marketItem.
     *                        - amount: The quantity of tokens to be listed for an MintGoldDustERC1155. For
     *                                  MintGoldDustERC721 the amout must be always one.
     *                        - contractAddress: The MintGoldDustERC1155 or the MintGoldDustERC721 address.
     *                        - seller: The seller of the marketItem.
     *                    - price: the price to be paid for the item in the set price market and it correponds
     *                             to the reserve price for the marketplace auction.
     */
    struct ListDTO {
        SaleDTO saleDTO;
        uint256 price;
    }

    /**
   * @notice that is a Data Transfer Object to be transferred between functions in the Collector (lazy) mint flow.
   *              It consists of the following fields:
   *                    - contractAddress: The MintGoldDustERC1155 or the MintGoldDustERC721 address.
   *                    - tokenURI the URI that contains the metadata for the NFT.
                        - royalty the royalty percentage to be applied for this NFT secondary sales.
                        - collaborators an array of address that can be a number of maximum 4 collaborators.
                        - ownersPercentage an array of uint256 that are the percetages for the artist and for each one of the collaborators.
   *                    - amount: The quantity of tokens to be listed for an MintGoldDustERC1155. For
   *                              MintGoldDustERC721 the amout must be always one.
   *                    - artistSigner: the address of the artist creator.
   *                    - price: the price to be paid for the item in the set price market.
   */
    struct CollectorMintDTO {
        address contractAddress;
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

    /**
     *
     * @notice that is a general function that must be implemented by the more specif makets.
     * @dev it is a internal function and should be implemented by the childrens
     * if these are not abstract also.
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
    ) public virtual;

    /**
     * @notice that is a more generic list function than the above. This function can be used by both kind of markets
     *         marketplace auction and set price.
     * @dev Here we're listing a MintGoldDustERC721 or a MintGoldDustERC1155 to the MintGoldDustMarketplace.
     *      If the item is being listed to _isAuction and the price is zero it means that
     *      the auction doesn't has a reserve price. In other case it has. If the NFT is being listed to
     *      the set price market the price must be greater than zero.
     *      Is important to know that after list an item to auction is not possible to cancel it like
     *      the delist function in the Set Price market.
     *      After the MarketItem struct creation the NFT is transferred from the seller to the respective
     *      markeplace address (marketplace auction or set price).
     * @param _listDTO The ListDTO struct parameter to use.
     *                 It consists of the following fields:
     *                    - SaleDTO struct that contains:
     *                        - tokenid: The tokenId of the marketItem.
     *                        - amount: The quantity of tokens to be listed for an MintGoldDustERC1155. For
     *                                  MintGoldDustERC721 the amout must be always one.
     *                        - contractAddress: The MintGoldDustERC1155 or the MintGoldDustERC721 address.
     *                        - seller: The seller of the marketItem.
     *                    - price: the price to list the item. For auction it corresponds to the reserve price.
     * @param _isAuction if the flow comes from the MintGoldDustMarketplaceAuction it IS TRUE if it comes from
     *                    the MintGoldDustSetPrice it IS FALSE.
     * @param _marketAddress if the flow comes from the MintGoldDustMarketplaceAuction, so is the respective address
     *                    if not is the MintGoldDustSetPrice address.
     */
    function list(
        ListDTO memory _listDTO,
        bool _isAuction,
        address _marketAddress,
        uint256 _auctionId
    ) internal {
        mustBeMintGoldDustERC721Or1155(_listDTO.saleDTO.contractAddress);

        if (_isAuction && _listDTO.price < 0) {
            revert MintGoldDustListPriceMustBeGreaterThanZero();
        }

        if (!_isAuction && _listDTO.price <= 0) {
            revert MintGoldDustListPriceMustBeGreaterThanZero();
        }

        MintGoldDustNFT _mintGoldDustNFT;
        bool _isERC721 = false;
        uint256 _realAmount = 1;

        if (_listDTO.saleDTO.contractAddress == mintGoldDustERC721Address) {
            isNFTowner(_listDTO.saleDTO.tokenId, _listDTO.saleDTO.seller);
            _mintGoldDustNFT = MintGoldDustNFT(mintGoldDustERC721Address);
            _isERC721 = true;
        } else {
            checkBalanceForERC1155(
                _listDTO.saleDTO.tokenId,
                _listDTO.saleDTO.amount
            );
            _mintGoldDustNFT = MintGoldDustNFT(mintGoldDustERC1155Address);
            _realAmount = _listDTO.saleDTO.amount;
        }

        AuctionProps memory auctionProps = AuctionProps(
            _auctionId,
            0,
            payable(address(0)),
            0,
            false,
            false
        );

        idMarketItemsByContractByOwner[_listDTO.saleDTO.contractAddress][
            _listDTO.saleDTO.tokenId
        ][_listDTO.saleDTO.seller] = MarketItem(
            _listDTO.saleDTO.tokenId,
            _listDTO.saleDTO.seller,
            _listDTO.price,
            false,
            _isAuction,
            idMarketItemsByContractByOwner[_listDTO.saleDTO.contractAddress][
                _listDTO.saleDTO.tokenId
            ][_listDTO.saleDTO.seller].isSecondarySale,
            _isERC721,
            _realAmount,
            auctionProps
        );

        _mintGoldDustNFT.transfer(
            _listDTO.saleDTO.seller,
            _marketAddress,
            _listDTO.saleDTO.tokenId,
            _realAmount
        );
    }

    /**
     * @notice that this function is responsible to start the primary sale flow.
     * @dev here we apply the fees related with the primary market that are:
     *                 - the primarySaleFeePercent and the collectorFee.
     * @param _marketItem The MarketItem struct parameter to use.
     *                 It consists of the following fields:
     *                    - tokenId: The tokenId of the marketItem.
     *                    - seller: The seller of the marketItem.
     *                    - price: The price which the item should be sold.
     *                    - sold: It says if an item was or not sold.
     *                    - isAuction: true if the item was listed for marketplace auction and false if for set price market.
     *                    - isSecondarySale: true if the item was already sold first time.
     *                    - isERC721: true is an MintGoldDustERC721 token.
     *                    - tokenAmount: The quantity of tokens to be listed for an MintGoldDustERC1155. For
     *                              MintGoldDustERC721 the amout must be always one.
     *                    - auctionProps:
     *                        - endTime: the time that the auction must be finished. Is the start time plus 24 hours.
     *                        - highestBidder: the bidder that did bid the highest value.
     *                        - highestBid: the value of the high bid.
     *                        - ended: a boolean that indicates if the auction was already finished or not.
     * @param _saleDTO The SaleDTO struct parameter to use.
     *                 It consists of the following fields:
     *                    - tokenid: The tokenId of the marketItem.
     *                    - amount: The quantity of tokens to be listed for an MintGoldDustERC1155. For
     *                              MintGoldDustERC721 the amout must be always one.
     *                    - contractAddress: The MintGoldDustERC1155 or the MintGoldDustERC721 address.
     *                    - seller: The seller of the marketItem.
     * @param _value The value to be paid for the purchase.
     * @param _sender The address that started this flow.
     *    @dev we need to receive the sender this way, because in the auction flow the purchase starts from
     *         the endAuction function in the MintGoldDustMarketplaceAuction contract. So from there the address
     *         that we get is the highst bidder that is stored in the marketItem struct. So we need to manage this way.
     */
    function primarySale(
        MarketItem memory _marketItem,
        SaleDTO memory _saleDTO,
        uint256 _value,
        address _sender
    ) private {
        MintGoldDustNFT _mintGoldDustNFT = getERC1155OrERC721(
            _marketItem.isERC721
        );

        idMarketItemsByContractByOwner[_saleDTO.contractAddress][
            _saleDTO.tokenId
        ][_saleDTO.seller].sold = true;
        idMarketItemsByContractByOwner[_saleDTO.contractAddress][
            _saleDTO.tokenId
        ][_saleDTO.seller].isSecondarySale = true;

        itemsSold.increment();

        uint256 fee;
        uint256 collFee;
        uint256 balance;

        fee = (_value * mgdCompany.primarySaleFeePercent()) / (100 * 10 ** 18);
        collFee = (_value * mgdCompany.collectorFee()) / (100 * 10 ** 18);
        balance = _value - (fee + collFee);

        checkIfIsSplitPaymentAndCall(
            _mintGoldDustNFT,
            _marketItem,
            _saleDTO,
            balance,
            fee,
            collFee,
            true,
            _value,
            _sender
        );

        payable(mgdCompany.owner()).transfer(collFee + fee);
    }

    /**
     * @notice that this function will check if the item has or not the collaborator and call the correct
     *         flow (unique sale or split sale)
     * @dev Explain to a developer any extra details
     * @param _mintGoldDustNFT MintGoldDustNFT is an instance of MintGoldDustERC721 or MintGoldDustERC1155.
     * @param _marketItem the struct MarketItem - check it in the primarySale or secondary sale functions.
     * @param _saleDTO the struct SaleDTO - check it in the primarySale or secondary sale functions.
     * @param _balance uint256 that represents the total amount to be received by the seller after fee calculations.
     * @param _fee uint256 the primary or the secondary fee to be paid by the buyer.
     * @param _collFeeOrRoyalty uint256 that represent the collector fee or the royalty depending of the flow.
     * @param isPrimarySale bool that helps the code to go for the correct flow (Primary or Secondary sale).
     * @param _value The value to be paid for the purchase.
     * @param _sender The address that started this flow.
     *    @dev we need to receive the sender this way, because in the auction flow the purchase starts from
     *         the endAuction function in the MintGoldDustMarketplaceAuction contract. So from there the address
     *         that we get is the highst bidder that is stored in the marketItem struct. So we need to manage this way.
     */
    function checkIfIsSplitPaymentAndCall(
        MintGoldDustNFT _mintGoldDustNFT,
        MarketItem memory _marketItem,
        SaleDTO memory _saleDTO,
        uint256 _balance,
        uint256 _fee,
        uint256 _collFeeOrRoyalty,
        bool isPrimarySale,
        uint256 _value,
        address _sender
    ) private {
        uint256 balanceOrRoyalty = _collFeeOrRoyalty;
        address _artistOrSeller = _mintGoldDustNFT.tokenIdArtist(
            _saleDTO.tokenId
        );

        if (isPrimarySale) {
            balanceOrRoyalty = _balance;
            _artistOrSeller = _saleDTO.seller;
        }

        if (_mintGoldDustNFT.hasTokenCollaborators(_saleDTO.tokenId)) {
            handleSplitPaymentCall(
                _mintGoldDustNFT,
                _saleDTO,
                _balance,
                _fee,
                _collFeeOrRoyalty,
                _artistOrSeller,
                isPrimarySale,
                _value,
                _sender
            );
            return;
        }

        if (isPrimarySale) {
            uniqueOwnerPrimarySale(
                _mintGoldDustNFT,
                _marketItem,
                _saleDTO,
                _fee,
                _collFeeOrRoyalty,
                _balance,
                _value,
                _sender
            );
            return;
        }

        uniqueOwnerSecondarySale(
            _marketItem,
            _mintGoldDustNFT,
            _saleDTO,
            _artistOrSeller,
            _fee,
            _collFeeOrRoyalty,
            _balance,
            _value,
            _sender
        );
    }

    /**
     * @dev this function is called when in the checkIfIsSplitPaymentAndCall function the flow goes for
     *      a sale for an item that does not has collaborators and is its first sale in the MintGoldDustMarketplace.
     * @param _mintGoldDustNFT explained in checkIfIsSplitPaymentAndCall function.
     * @param _marketItem explained in checkIfIsSplitPaymentAndCall function.
     * @param _saleDTO explained in checkIfIsSplitPaymentAndCall function.
     * @param _fee the primary fee to be paid for the MintGoldDustMarketplace.
     * @param _collFee represent the collector fee.
     * @param _balance represents the total amount to be received by the seller after fee calculations.
     * @param _value The value to be paid for the purchase.
     * @param _sender The address that started this flow.
     *    @dev we need to receive the sender this way, because in the auction flow the purchase starts from
     *         the endAuction function in the MintGoldDustMarketplaceAuction contract. So from there the address
     *         that we get is the highst bidder that is stored in the marketItem struct. So we need to manage this way.
     */
    function uniqueOwnerPrimarySale(
        MintGoldDustNFT _mintGoldDustNFT,
        MarketItem memory _marketItem,
        SaleDTO memory _saleDTO,
        uint256 _fee,
        uint256 _collFee,
        uint256 _balance,
        uint256 _value,
        address _sender
    ) private {
        _mintGoldDustNFT.transfer(
            address(this),
            _sender,
            _saleDTO.tokenId,
            _saleDTO.amount
        );

        payable(_marketItem.seller).transfer(_balance);
        updateIdMarketItemsByContractByOwnerMapping(_saleDTO, _sender);
        emitPrimarySaleEvent(
            _marketItem,
            _saleDTO,
            _balance,
            _collFee,
            _fee,
            false,
            _value,
            _sender
        );
    }

    function updateIdMarketItemsByContractByOwnerMapping(
        SaleDTO memory _saleDTO,
        address _sender
    ) private {
        idMarketItemsByContractByOwner[_saleDTO.contractAddress][
            _saleDTO.tokenId
        ][_saleDTO.seller].seller = _sender;

        MarketItem memory newMarketItem = idMarketItemsByContractByOwner[
            _saleDTO.contractAddress
        ][_saleDTO.tokenId][_saleDTO.seller];

        AuctionProps memory auctionProps = AuctionProps(
            0,
            0,
            payable(address(0)),
            0,
            false,
            false
        );

        newMarketItem.auctionProps = auctionProps;

        idMarketItemsByContractByOwner[_saleDTO.contractAddress][
            _saleDTO.tokenId
        ][_sender] = newMarketItem;

        delete idMarketItemsByContractByOwner[_saleDTO.contractAddress][
            _saleDTO.tokenId
        ][_saleDTO.seller];
    }

    /**
     * @dev this function is called when a primary sale was successfully finalized.
     * @param _marketItem explained in checkIfIsSplitPaymentAndCall function.
     * @param _saleDTO explained in checkIfIsSplitPaymentAndCall function.
     * @param _balance represents the total amount to be received by the seller after fee calculations.
     * @param _fee the secondary fee to be paid for the MintGoldDustMarketplace.
     * @param _collFee represent the collector fee.
     * @param _hasCollaborators indicates if the market item has or not collaborators.
     *    @dev FYI if it is true. So another event will be fired after the sale finalization.
     *         It is the NftPurchasedCollaboratorAmount event. It will be triggered for each one of the collaborators.
     * @param _value The value to be paid for the purchase.
     * @param _sender The address that started this flow.
     *    @dev we need to receive the sender this way, because in the auction flow the purchase starts from
     *         the endAuction function in the MintGoldDustMarketplaceAuction contract. So from there the address
     *         that we get is the highst bidder that is stored in the marketItem struct. So we need to manage this way.
     */
    function emitPrimarySaleEvent(
        MarketItem memory _marketItem,
        SaleDTO memory _saleDTO,
        uint256 _balance,
        uint256 _collFee,
        uint256 _fee,
        bool _hasCollaborators,
        uint256 _value,
        address _sender
    ) private {
        emit MintGoldDustNftPurchasedPrimaryMarket(
            itemsSold.current(),
            _saleDTO.tokenId,
            _saleDTO.seller,
            _sender,
            _value,
            _balance,
            _fee,
            _collFee,
            _saleDTO.amount,
            _hasCollaborators,
            _marketItem.isAuction,
            _marketItem.isERC721
        );
    }

    /**
     * @dev this function is called when in the checkIfIsSplitPaymentAndCall function the flow goes for
     *      a sale for an item that does not has collaborators and was already sold the first time.
     * @param _marketItem explained in checkIfIsSplitPaymentAndCall function.
     * @param _mintGoldDustNFT explained in checkIfIsSplitPaymentAndCall function.
     * @param _saleDTO explained in checkIfIsSplitPaymentAndCall function.
     * @param _artist the creator of the artwork to receive the royalties.
     * @param _fee the secondary fee to be paid for the MintGoldDustMarketplace.
     * @param _royalty represent the royalty to be paid for the artist.
     * @param _balance represents the total amount to be received by the seller after fee calculations.
     * @param _value The value to be paid for the purchase.
     * @param _sender The address that started this flow.
     *    @dev we need to receive the sender this way, because in the auction flow the purchase starts from
     *         the endAuction function in the MintGoldDustMarketplaceAuction contract. So from there the address
     *         that we get is the highst bidder that is stored in the marketItem struct. So we need to manage this way.
     */
    function uniqueOwnerSecondarySale(
        MarketItem memory _marketItem,
        MintGoldDustNFT _mintGoldDustNFT,
        SaleDTO memory _saleDTO,
        address _artist,
        uint256 _fee,
        uint256 _royalty,
        uint256 _balance,
        uint256 _value,
        address _sender
    ) private {
        _mintGoldDustNFT.transfer(
            address(this),
            _sender,
            _saleDTO.tokenId,
            _saleDTO.amount
        );

        payable(_artist).transfer(_royalty);
        updateIdMarketItemsByContractByOwnerMapping(_saleDTO, _sender);
        emitSecondarySaleEvent(
            _marketItem,
            _saleDTO,
            _artist,
            _balance,
            _mintGoldDustNFT.tokenIdRoyaltyPercent(_saleDTO.tokenId),
            _royalty,
            _fee,
            false,
            _value,
            _sender
        );
    }

    /**
     * @dev this function is called when a secondary sale was successfully finalized.
     * @param _marketItem explained in checkIfIsSplitPaymentAndCall function.
     * @param _saleDTO explained in checkIfIsSplitPaymentAndCall function.
     * @param _artist the creator of the artwork to receive the royalties.
     * @param _balance represents the total amount to be received by the seller after fee calculations.
     * @param _royaltyPercent represent the royalty percetnage setted by the artist.
     * @param _royalty represent the royalty to be paid for the artist.
     * @param _fee the secondary fee to be paid for the MintGoldDustMarketplace.
     * @param _hasCollaborators indicates if the market item has or not collaborators.
     *    @dev FYI if it is true. So another event will be fired after the sale finalization.
     *         It is the NftPurchasedCollaboratorAmount event. It will be triggered for each one of the collaborators.
     * @param _value The value to be paid for the purchase.
     * @param _sender The address that started this flow.
     *    @dev we need to receive the sender this way, because in the auction flow the purchase starts from
     *         the endAuction function in the MintGoldDustMarketplaceAuction contract. So from there the address
     *         that we get is the highst bidder that is stored in the marketItem struct. So we need to manage this way.
     */
    function emitSecondarySaleEvent(
        MarketItem memory _marketItem,
        SaleDTO memory _saleDTO,
        address _artist,
        uint256 _balance,
        uint256 _royaltyPercent,
        uint256 _royalty,
        uint256 _fee,
        bool _hasCollaborators,
        uint256 _value,
        address _sender
    ) private {
        emit MintGoldDustNftPurchasedSecondaryMarket(
            itemsSold.current(),
            _saleDTO.tokenId,
            _saleDTO.seller,
            _sender,
            _value,
            _balance,
            _royaltyPercent,
            _royalty,
            _artist,
            _fee,
            _saleDTO.amount,
            _hasCollaborators,
            _marketItem.isAuction,
            _marketItem.isERC721
        );
    }

    /**
     * @notice that is the function responsible to manage the split sale flow.
     * @dev the _isPrimarySale is very important. It define if the value to be received is
     *      the balance for primary sale or the royalty for secondary sales.
     *    @notice that the emitEventForSplitPayment os called to trigger the correct event depending of the flow.
     * @param _balance uint256 that represents the total amount to be received by the seller after fee calculations.
     * @param _fee uint256 the primary or the secondary fee to be paid by the buyer.
     * @param _collFeeOrRoyalty uint256 that represent the collector fee or the royalty depending of the flow.
     * @param _artist the creator of the artwork to receive the royalties.
     * @param _saleDTO The SaleDTO struct parameter to use.
     *                 It consists of the following fields:
     *                    - tokenid: The tokenId of the marketItem.
     *                    - amount: The quantity of tokens to be listed for an MintGoldDustERC1155. For
     *                              MintGoldDustERC721 the amout must be always one.
     *                    - contractAddress: The MintGoldDustERC1155 or the MintGoldDustERC721 address.
     *                    - seller: The seller of the marketItem.
     * @param _isPrimarySale bool that helps the code to go for the correct flow (Primary or Secondary sale).
     * @param _value The value to be paid for the purchase.
     * @param _sender The address that started this flow.
     *    @dev we need to receive the sender this way, because in the auction flow the purchase starts from
     *         the endAuction function in the MintGoldDustMarketplaceAuction contract. So from there the address
     *         that we get is the highst bidder that is stored in the marketItem struct. So we need to manage this way.
     */
    function splittedSale(
        uint256 _balance,
        uint256 _fee,
        uint256 _collFeeOrRoyalty,
        address _artist,
        MintGoldDustNFT _mintGoldDustNFT,
        SaleDTO memory _saleDTO,
        bool _isPrimarySale,
        uint256 _value,
        address _sender
    ) private {
        MarketItem memory _marketItem = getMarketItem(_saleDTO);

        uint256 balanceOrRoayalty = _collFeeOrRoyalty;

        if (_isPrimarySale) {
            balanceOrRoayalty = _balance;
        }

        uint256 _tokenIdCollaboratorsQuantity = _mintGoldDustNFT
            .tokenIdCollaboratorsQuantity(_saleDTO.tokenId);

        uint256 balanceSplitPart = (balanceOrRoayalty *
            _mintGoldDustNFT.tokenIdCollaboratorsPercentage(
                _saleDTO.tokenId,
                0
            )) / (100 * 10 ** 18);
        // revert Teste123(_artist, balanceOrRoayalty);
        payable(_artist).transfer(balanceSplitPart);
        emit NftPurchasedCollaboratorAmount(
            itemsSold.current(),
            _artist,
            balanceSplitPart
        );
        for (uint256 i = 1; i < _tokenIdCollaboratorsQuantity; i++) {
            balanceSplitPart =
                (balanceOrRoayalty *
                    _mintGoldDustNFT.tokenIdCollaboratorsPercentage(
                        _saleDTO.tokenId,
                        i
                    )) /
                (100 * 10 ** 18);
            payable(
                _mintGoldDustNFT.tokenCollaborators(_saleDTO.tokenId, i - 1)
            ).transfer(balanceSplitPart);
            emit NftPurchasedCollaboratorAmount(
                itemsSold.current(),
                _artist,
                balanceSplitPart
            );
        }
        updateIdMarketItemsByContractByOwnerMapping(_saleDTO, _sender);
        emitEventForSplitPayment(
            _saleDTO,
            _marketItem,
            _mintGoldDustNFT,
            _artist,
            _balance,
            _fee,
            _collFeeOrRoyalty,
            _isPrimarySale,
            _value,
            _sender
        );
    }

    /**
     * @notice that is the function responsible to trigger the correct event for splitted sales.
     * @dev the _isPrimarySale defines if the primary sale or the secondary sale should be triggered.
     * @param _mintGoldDustNFT MintGoldDustNFT is an instance of MintGoldDustERC721 or MintGoldDustERC1155.
     * @param _marketItem explained in splittedSale function.
     * @param _artist the creator of the artwork to receive the royalties.
     * @param _artist the creator of the artwork to receive the royalties.
     * @param _balance uint256 that represents the total amount to be received by the seller after fee calculations.
     * @param _fee uint256 the primary or the secondary fee to be paid by the buyer.
     * @param _collFeeOrRoyalty uint256 that represent the collector fee or the royalty depending of the flow.
     * @param _isPrimarySale bool that helps the code to go for the correct flow (Primary or Secondary sale).
     * @param _value The value to be paid for the purchase.
     * @param _sender The address that started this flow.
     *    @dev we need to receive the sender this way, because in the auction flow the purchase starts from
     *         the endAuction function in the MintGoldDustMarketplaceAuction contract. So from there the address
     *         that we get is the highst bidder that is stored in the marketItem struct. So we need to manage this way.
     */
    function emitEventForSplitPayment(
        SaleDTO memory _saleDTO,
        MarketItem memory _marketItem,
        MintGoldDustNFT _mintGoldDustNFT,
        address _artist,
        uint256 _balance,
        uint256 _fee,
        uint256 _collFeeOrRoyalty,
        bool _isPrimarySale,
        uint256 _value,
        address _sender
    ) private {
        if (_isPrimarySale) {
            emitPrimarySaleEvent(
                _marketItem,
                _saleDTO,
                _balance,
                _collFeeOrRoyalty,
                _fee,
                true,
                _value,
                _sender
            );
            return;
        }

        emitSecondarySaleEvent(
            _marketItem,
            _saleDTO,
            _artist,
            _balance,
            _mintGoldDustNFT.tokenIdRoyaltyPercent(_saleDTO.tokenId),
            _collFeeOrRoyalty,
            _fee,
            true,
            _value,
            _sender
        );
    }

    /// @notice that this function check a boolean and depending of the value return a MintGoldDustERC721 or a MintGoldDustERC1155.
    /// @dev If true is created an instance of a MintGoldDustERC721 using polymorphism with the parent contract. If not
    ///      it creates an isntance for MintGoldDustERC1155.
    /// @param _isERC721 a boolean that say if the address is an ERC721 or not.
    /// @return MintGoldDustNFT an instance of MintGoldDustERC721 or MintGoldDustERC1155.
    function getERC1155OrERC721(
        bool _isERC721
    ) internal view returns (MintGoldDustNFT) {
        if (_isERC721) {
            return MintGoldDustNFT(mintGoldDustERC721Address);
        } else {
            return MintGoldDustNFT(mintGoldDustERC1155Address);
        }
    }

    /**
     * @notice that this function do continuity to split payment flow.
     * @dev Explain to a developer any extra details
     * @param _mintGoldDustNFT MintGoldDustNFT is an instance of MintGoldDustERC721 or MintGoldDustERC1155.
     * @param _saleDTO The SaleDTO struct parameter to use.
     *                 It consists of the following fields:
     *                    - tokenid: The tokenId of the marketItem.
     *                    - amount: The quantity of tokens to be listed for an MintGoldDustERC1155. For
     *                              MintGoldDustERC721 the amout must be always one.
     *                    - contractAddress: The MintGoldDustERC1155 or the MintGoldDustERC721 address.
     *                    - seller: The seller of the marketItem.
     * @param _balance uint256 that represents the total amount to be received by the seller after fee calculations.
     * @param _fee uint256 the primary or the secondary fee to be paid by the buyer.
     * @param _collFeeOrRoyalty uint256 that represent the collerctor fee or the royalty depending of the flow.
     * @param _artistOrSeller address for the artist on secondary sales and for the seller on the primary sales.
     * @param _isPrimarySale bool that helps the code to go for the correct flow (Primary or Secondary sale).
     * @param _value The value to be paid for the purchase.
     * @param _sender The address that started this flow.
     *    @dev we need to receive the sender this way, because in the auction flow the purchase starts from
     *         the endAuction function in the MintGoldDustMarketplaceAuction contract. So from there the address
     *         that we get is the highst bidder that is stored in the marketItem struct. So we need to manage this way.
     */
    function handleSplitPaymentCall(
        MintGoldDustNFT _mintGoldDustNFT,
        SaleDTO memory _saleDTO,
        uint256 _balance,
        uint256 _fee,
        uint256 _collFeeOrRoyalty,
        address _artistOrSeller,
        bool _isPrimarySale,
        uint256 _value,
        address _sender
    ) private {
        _mintGoldDustNFT.transfer(
            address(this),
            _sender,
            _saleDTO.tokenId,
            _saleDTO.amount
        );
        splittedSale(
            _balance,
            _fee,
            _collFeeOrRoyalty,
            _artistOrSeller,
            _mintGoldDustNFT,
            _saleDTO,
            _isPrimarySale,
            _value,
            _sender
        );
    }

    function revertInCaseOfErrorInTransfer(
        SaleDTO memory _saleDTO,
        bool _isPrimarySale
    ) private {
        idMarketItemsByContractByOwner[_saleDTO.contractAddress][
            _saleDTO.tokenId
        ][_saleDTO.seller].sold = false;
        if (_isPrimarySale) {
            idMarketItemsByContractByOwner[_saleDTO.contractAddress][
                _saleDTO.tokenId
            ][_saleDTO.seller].isSecondarySale = false;
        }
        itemsSold.decrement();
        revert MintGoldDustErrorToTransfer("At purchase!");
    }

    /**
     * @notice that this function is responsible to start the secondary sale flow.
     * @dev here we apply the fees related with the secondary market that are:
     *                 - the secondarySaleFeePercent and the tokenIdRoyaltyPercent.
     * @param _marketItem The MarketItem struct parameter to use.
     *                 It consists of the following fields:
     *                    - tokenId: The tokenId of the marketItem.
     *                    - seller: The seller of the marketItem.
     *                    - price: The price which the item should be sold.
     *                    - sold: It says if an item was or not sold.
     *                    - isAuction: true if the item was listed for marketplace auction and false if for set price market.
     *                    - isSecondarySale: true if the item was already sold first time.
     *                    - isERC721: true is an MintGoldDustERC721 token.
     *                    - tokenAmount: The quantity of tokens to be listed for an MintGoldDustERC1155. For
     *                              MintGoldDustERC721 the amout must be always one.
     *                    - auctionProps:
     *                        - endTime: the time that the auction must be finished. Is the start time plus 24 hours.
     *                        - highestBidder: the bidder that did bid the highest value.
     *                        - highestBid: the value of the high bid.
     *                        - ended: a boolean that indicates if the auction was already finished or not.
     * @param _saleDTO The SaleDTO struct parameter to use.
     *                 It consists of the following fields:
     *                    - tokenid: The tokenId of the marketItem.
     *                    - amount: The quantity of tokens to be listed for an MintGoldDustERC1155. For
     *                              MintGoldDustERC721 the amout must be always one.
     *                    - contractAddress: The MintGoldDustERC1155 or the MintGoldDustERC721 address.
     *                    - seller: The seller of the marketItem.
     * @param _value The value to be paid for the purchase.
     * @param _sender The address that started this flow.
     *    @dev we need to receive the sender this way, because in the auction flow the purchase starts from
     *         the endAuction function in the MintGoldDustMarketplaceAuction contract. So from there the address
     *         that we get is the highst bidder that is stored in the marketItem struct. So we need to manage this way.
     */
    function secondarySale(
        MarketItem memory _marketItem,
        SaleDTO memory _saleDTO,
        uint256 _value,
        address _sender
    ) private {
        //revert Teste(_marketItem);
        MintGoldDustNFT _mintGoldDustNFT = getERC1155OrERC721(
            _marketItem.isERC721
        );

        idMarketItemsByContractByOwner[_saleDTO.contractAddress][
            _saleDTO.tokenId
        ][_saleDTO.seller].sold = true;
        itemsSold.increment();

        uint256 fee;
        uint256 royalty;
        uint256 balance;

        fee =
            (_value * mgdCompany.secondarySaleFeePercent()) /
            (100 * 10 ** 18);
        royalty =
            (_value *
                _mintGoldDustNFT.tokenIdRoyaltyPercent(_saleDTO.tokenId)) /
            (100 * 10 ** 18);

        balance = _value - (fee + royalty);

        checkIfIsSplitPaymentAndCall(
            _mintGoldDustNFT,
            _marketItem,
            _saleDTO,
            balance,
            fee,
            royalty,
            false,
            _value,
            _sender
        );

        payable(mgdCompany.owner()).transfer(fee);
        payable(_marketItem.seller).transfer(balance);
    }

    /**
     * @param _saleDTO The SaleDTO struct parameter to use.
     *                 It consists of the following fields:
     *                    - tokenid: The tokenId of the marketItem.
     *                    - amount: The quantity of tokens to be listed for an MintGoldDustERC1155. For
     *                              MintGoldDustERC721 the amout must be always one.
     *                    - contractAddress: The MintGoldDustERC1155 or the MintGoldDustERC721 address.
     *                    - seller: The seller of the marketItem.
     * @return MarketItem struct.
     *                 It consists of the following fields:
     *                    - tokenId: The tokenId of the marketItem.
     *                    - seller: The seller of the marketItem.
     *                    - price: The price which the item should be sold.
     *                    - sold: It says if an item was or not sold.
     *                    - isAuction: true if the item was listed for marketplace auction and false if for set price market.
     *                    - isSecondarySale: true if the item was already sold first time.
     *                    - isERC721: true is an MintGoldDustERC721 token.
     *                    - tokenAmount: The quantity of tokens to be listed for an MintGoldDustERC1155. For
     *                              MintGoldDustERC721 the amout must be always one.
     *                    - auctionProps:
     *                        - endTime: the time that the auction must be finished. Is the start time plus 24 hours.
     *                        - highestBidder: the bidder that did bid the highest value.
     *                        - highestBid: the value of the high bid.
     *                        - ended: a boolean that indicates if the auction was already finished or not.
     */
    function getMarketItem(
        SaleDTO memory _saleDTO
    ) private view returns (MarketItem memory) {
        return
            idMarketItemsByContractByOwner[_saleDTO.contractAddress][
                _saleDTO.tokenId
            ][_saleDTO.seller];
    }

    /**
     * Acquire a listed NFT to Set Price market
     * @notice function will fail if the market item does has the auction property to true.
     * @notice function will fail if the token was not listed to the set price market.
     * @notice function will fail if the contract address is not a MintGoldDustERC721 neither a MintGoldDustERC1155.
     * @notice function will fail if the amount paid by the buyer does not cover the purshace amount required.
     * @dev This function is specific for the set price market.
     * For the auction market we have a second purchaseAuctionNft function. See below.
     * @param _saleDTO The SaleDTO struct parameter to use.
     *                 It consists of the following fields:
     *                    - tokenid: The tokenId of the marketItem.
     *                    - amount: The quantity of tokens to be listed for an MintGoldDustERC1155. For
     *                              MintGoldDustERC721 the amout must be always one.
     *                    - contractAddress: The MintGoldDustERC1155 or the MintGoldDustERC721 address.
     *                    - seller: The seller of the marketItem.
     */
    function purchaseNft(SaleDTO memory _saleDTO) external payable {
        executePurchaseNftFlow(_saleDTO, msg.sender, msg.value);
    }

    function collectorPurchaseNft(
        SaleDTO memory _saleDTO,
        address _sender,
        uint256 _value
    ) internal {
        executePurchaseNftFlow(_saleDTO, _sender, _value);
    }

    function executePurchaseNftFlow(
        SaleDTO memory _saleDTO,
        address _sender,
        uint256 _value
    ) private {
        isSetPrice(_saleDTO.tokenId, _saleDTO.contractAddress, _saleDTO.seller);

        isTokenIdListed(_saleDTO.tokenId, _saleDTO.contractAddress);

        mustBeMintGoldDustERC721Or1155(_saleDTO.contractAddress);

        hasEenoughAmountListed(
            _saleDTO.tokenId,
            _saleDTO.contractAddress,
            address(this),
            _saleDTO.amount
        );

        MarketItem memory _marketItem = getMarketItem(_saleDTO);

        /// @dev if the flow goes for ERC721 the amount of tokens MUST be ONE.
        uint256 _realAmount = 1;

        if (!_marketItem.isERC721) {
            _realAmount = _saleDTO.amount;
        }

        isMsgValueEnough(_marketItem.price, _realAmount, _value);

        checkIfIsPrimaryOrSecondarySaleAndCall(
            _marketItem,
            _saleDTO,
            _value,
            _sender
        );
    }

    /**
     * @dev this function check if the item was already sold some time and *      direct the flow to
     *     a primary or a secondary sale flow.
     * @param _marketItem The MarketItem struct parameter to use.
     * @param _saleDTO The SaleDTO struct parameter to use.
     * @param _value The value to be paid for the purchase.
     * @param _sender The address that started this flow.
     *    @dev we need to receive the sender this way, because in the auction flow the purchase starts from
     *         the endAuction function in the MintGoldDustMarketplaceAuction contract. So from there the address
     *         that we get is the highst bidder that is stored in the marketItem struct. So we need to manage this way.
     */
    function checkIfIsPrimaryOrSecondarySaleAndCall(
        MarketItem memory _marketItem,
        SaleDTO memory _saleDTO,
        uint256 _value,
        address _sender
    ) private {
        bool _isSecondarySale = idMarketItemsByContractByOwner[
            _saleDTO.contractAddress
        ][_marketItem.tokenId][_saleDTO.seller].isSecondarySale;

        if (!_isSecondarySale) {
            primarySale(_marketItem, _saleDTO, _value, _sender);
            return;
        }

        secondarySale(_marketItem, _saleDTO, _value, _sender);
    }

    /**
     * Acquire a listed item for the MintGoldDustMarketplaceAuction.
     * @notice function will fail if the market item does not has the auction property to true.
     * @notice function will fail if the token was not listed to the auction market.
     * @notice function will fail if the contract address is not a MintGoldDustERC721 neither a MintGoldDustERC1155.
     * @notice function will fail if the amount paid by the buyer does not cover the purshace amount required.
     * @notice function will fail if the amount paid by the buyer does not cover the purshace amount required.
     * @dev This function is specific for the auction market. Then, in this case, the function will be called
     *      internally from the MGDAuction contract. So is not possible to get the msg.value. Then we're receiving the value by param.
     * @param _saleDTO The SaleDTO struct parameter to use.
     *                 It consists of the following fields:
     *                    - tokenid: The tokenId of the marketItem.
     *                    - amount: The quantity of tokens to be listed for an MintGoldDustERC1155. For
     *                              MintGoldDustERC721 the amout must be always one.
     *                    - contractAddress: The MintGoldDustERC1155 or the MintGoldDustERC721 address.
     *                    - seller: The seller of the marketItem.
     * @param _value The value to be paid for the purchase.
     * @param _sender The address that started this flow.
     *    @dev we need to receive the sender this way, because in the auction flow the purchase starts from
     *         the endAuction function in the MintGoldDustMarketplaceAuction contract. So from there the address
     *         that we get is the highst bidder that is stored in the marketItem struct. So we need to manage this way.
     */
    function purchaseAuctionNft(
        SaleDTO memory _saleDTO,
        uint256 _value,
        address _sender
    ) internal {
        isAuction(_saleDTO.tokenId, _saleDTO.contractAddress, _saleDTO.seller);

        isTokenIdListed(_saleDTO.tokenId, _saleDTO.contractAddress);

        mustBeMintGoldDustERC721Or1155(_saleDTO.contractAddress);

        MarketItem memory _marketItem = getMarketItem(_saleDTO);

        /// @dev if the flow goes for ERC721 the amount of tokens MUST be ONE.
        uint256 _realAmount = 1;

        if (!_marketItem.isERC721) {
            _realAmount = _saleDTO.amount;
            isBuyingAllListedTokens(_saleDTO);
            //isMsgValueEnough(_marketItem.price, _realAmount, _value);
        }

        checkIfIsPrimaryOrSecondarySaleAndCall(
            _marketItem,
            _saleDTO,
            _value,
            _sender
        );
    }

    /**
     * @dev for the auction market, when an artist or collector decides to put a MintGoldDustERC1155 for auction
     *      is necessary to inform the quantity of tokens to be listed.
     *    @notice that in this case, at the moment of the purchase, the buyer needs to buy all the tokens
     *            listed for auction.
     *    @notice that this function check if the _amount being purchased by the onwer is the same of the amount
     *            of listed MintGoldDustERC1155 tokenId.
     * @param _saleDTO a parameter just like in doxygen (must be followed by parameter name)
     */
    function isBuyingAllListedTokens(SaleDTO memory _saleDTO) private view {
        if (
            _saleDTO.amount <
            idMarketItemsByContractByOwner[_saleDTO.contractAddress][
                _saleDTO.tokenId
            ][_saleDTO.seller].tokenAmount
        ) {
            revert MintGoldDustPurchaseOfERC1155InAuctionThatCoverAllListedItems();
        }
    }

    /// @dev it is a private function to verify if the msg.value is enough to pay the product between the
    ///      price of the token and the quantity desired.
    /// @param _price the price of one market item.
    /// @param _amount the quantity desired for this purchase.
    /// @notice that it REVERTS with a MintGoldDustInvalidAmountForThisPurchase() error if the condition is not met.
    function isMsgValueEnough(
        uint256 _price,
        uint256 _amount,
        uint256 _value
    ) private pure {
        if (_value != (_price * (_amount * (10 ** 18))) / (10 ** 18)) {
            revert MintGoldDustInvalidAmountForThisPurchase();
        }
    }

    /**
     * @dev this function check if the an address represents a MintGoldDustNFT contract.
     *      It MUST be a MintGoldDustERC721 address or a MintGoldDustERC1155 address.
     * @notice that the function REVERTS with a MintGoldDustMustBeERC721OrERC1155() error if the conditon is not met.
     */
    function mustBeMintGoldDustERC721Or1155(
        address _contractAddress
    ) internal view {
        //   // Get the interfaces that the contract supports
        bool _isERC721 = _contractAddress == mintGoldDustERC721Address;

        bool _isERC1155 = _contractAddress == mintGoldDustERC1155Address;

        // Ensure that the contract is either an ERC721 or ERC1155
        if (!_isERC1155 && !_isERC721) {
            revert MintGoldDustMustBeERC721OrERC1155();
        }
    }

    /**
     * @dev the main goal of this function is check if the address calling the function is the
     *      owner of the tokenId. For ERC1155 it means if the address has some balance for this token.
     * @notice that it REVERTS with a MintGoldDustAddressUnauthorized error if the condition is not met.
     */
    function checkBalanceForERC1155(
        uint256 _tokenId,
        uint256 _tokenAmount
    ) internal view {
        if (
            (MintGoldDustERC1155(mintGoldDustERC1155Address)).balanceOf(
                msg.sender,
                _tokenId
            ) < _tokenAmount
        ) {
            revert MintGoldDustAddressUnauthorized(
                "Not owner or not has enouth token quantity!"
            );
        }
    }

    function generateHash(
        CollectorMintDTO memory _collectorMintDTO
    ) private pure returns (bytes32) {
        return
            keccak256(
                abi.encode(
                    _collectorMintDTO.contractAddress,
                    _collectorMintDTO.tokenURI,
                    _collectorMintDTO.royalty,
                    _collectorMintDTO.memoir,
                    _collectorMintDTO.collaborators,
                    _collectorMintDTO.ownersPercentage,
                    _collectorMintDTO.amount,
                    _collectorMintDTO.artistSigner,
                    _collectorMintDTO.price,
                    _collectorMintDTO.collectorMintId
                )
            );
    }

    function verifyHash(
        CollectorMintDTO memory _collectorMintDTO,
        bytes32 receivedHash
    ) internal pure {
        bytes32 generatedHash = generateHash(_collectorMintDTO);
        if (generatedHash != receivedHash) {
            revert MintGoldDustCollectorMintDataNotMatch();
        }
    }

    /**
     * @dev the main goal of this function is check if the address calling the function is the
     *      owner of the tokenId.
     * @notice that it REVERTS with a MintGoldDustAddressUnauthorized error if the condition is not met.
     * @param _tokenId is the id that represent the token.
     */
    function isNFTowner(uint256 _tokenId, address _sender) internal view {
        if (
            (MintGoldDustERC721(mintGoldDustERC721Address)).ownerOf(_tokenId) !=
            _sender
        ) {
            revert MintGoldDustAddressUnauthorized("Not owner!");
        }
    }

    /**
     * @dev This function check if the item was listed for auction.
     * @notice that if yes it REVERTS with a MintGoldDustFunctionForSetPriceListedNFT() error.
     * @param _tokenId is the id that represent the token.
     * @param _contractAddress is a MintGoldDustNFT address.
     * @param _seller is the address of the seller of this tokenId.
     */
    function isSetPrice(
        uint256 _tokenId,
        address _contractAddress,
        address _seller
    ) private view {
        if (
            idMarketItemsByContractByOwner[_contractAddress][_tokenId][_seller]
                .isAuction
        ) {
            revert MintGoldDustFunctionForSetPriceListedNFT();
        }
    }

    /**
     * @dev This function check if the item was listed for auction.
     * @notice that if not it REVERTS with a MintGoldDustFunctionForAuctionListedNFT() error.
     * @param _tokenId is the id that represent the token.
     * @param _contractAddress is a MintGoldDustNFT address.
     * @param _seller is the address of the seller of this tokenId.
     */
    function isAuction(
        uint256 _tokenId,
        address _contractAddress,
        address _seller
    ) private view {
        if (
            !idMarketItemsByContractByOwner[_contractAddress][_tokenId][_seller]
                .isAuction
        ) {
            revert MintGoldDustFunctionForAuctionListedNFT();
        }
    }

    /**
     * @dev the goal here is, depending of the contract address (MintGoldDustERC721 or MintGoldDustERC1155)
     *      verify if the tokenId is really listed.
     * @notice that if not it REVERTS with a MintGoldDustItemIsNotListed() error.
     * @param _tokenId is the id that represent the token.
     * @param _contractAddress is a MintGoldDustNFT address.
     */
    function isTokenIdListed(
        uint256 _tokenId,
        address _contractAddress
    ) internal view {
        if (
            _contractAddress == mintGoldDustERC721Address &&
            (MintGoldDustERC721(mintGoldDustERC721Address)).ownerOf(_tokenId) !=
            address(this)
        ) {
            revert MintGoldDustItemIsNotListed(_contractAddress);
        }

        if (
            _contractAddress == mintGoldDustERC1155Address &&
            (MintGoldDustERC1155(mintGoldDustERC1155Address)).balanceOf(
                address(this),
                _tokenId
            ) ==
            0
        ) {
            revert MintGoldDustItemIsNotListed(_contractAddress);
        }
    }

    /**
     * @dev the goal here is verify if the MintGoldDustMarketplace contract has the quantity of
     *      MintGoldDustERC1155 tokens that the collector is trying to buy.
     * @notice that if not it REVERTS with a MintGoldDustLessItemsListedThanThePurchaseAmount() error.
     * @param _tokenId is the id that represent the token.
     * @param _contractAddress is a MintGoldDustNFT address.
     * @param _marketPlaceAddress it can be a MintGoldDustMarketplaceAuction or a MintGoldDustSetPrice address.
     * @param _tokenQuantity the quantity of tokens desired by the buyer.
     */
    function hasEenoughAmountListed(
        uint256 _tokenId,
        address _contractAddress,
        address _marketPlaceAddress,
        uint256 _tokenQuantity
    ) private view {
        if (
            _contractAddress == mintGoldDustERC1155Address &&
            (MintGoldDustERC1155(mintGoldDustERC1155Address)).balanceOf(
                _marketPlaceAddress,
                _tokenId
            ) <
            _tokenQuantity
        ) {
            revert MintGoldDustLessItemsListedThanThePurchaseAmount();
        }
    }

    /**
     * @dev the goal here is verify if the address is the seller of the respective tokenId for a contract address.
     * @notice that if not it REVERTS with a MintGoldDustAddressUnauthorized() error.
     * @param _tokenId is the id that represent the token.
     * @param _contractAddress is a MintGoldDustNFT address.
     * @param _seller is the address of the seller of this tokenId.
     */
    function isSeller(
        uint256 _tokenId,
        address _contractAddress,
        address _seller
    ) internal view {
        if (
            msg.sender !=
            idMarketItemsByContractByOwner[_contractAddress][_tokenId][_seller]
                .seller
        ) {
            revert MintGoldDustAddressUnauthorized("Not seller!");
        }
    }

    modifier isNotListed(
        uint256 _tokenId,
        address _contractAddress,
        address _seller
    ) {
        if (
            !idMarketItemsByContractByOwner[_contractAddress][_tokenId][_seller]
                .sold
        ) {
            revert MintGoldDustItemIsAlreadyListed(_contractAddress);
        }
        _;
    }

    /// @notice Pause the contract
    function pauseContract() public isowner {
        _pause();
    }

    /// @notice Unpause the contract
    function unpauseContract() public isowner {
        _unpause();
    }

    modifier isowner() {
        if (msg.sender != mgdCompany.owner()) {
            revert MGDCompanyUnauthorized();
        }
        _;
    }

    /// @notice Fallbacks will forward funds to Mint Gold Dust LLC
    fallback() external payable {
        payable(mgdCompany.owner()).transfer(msg.value);
    }

    /// @notice Fallbacks will forward funds to Mint Gold Dust LLC
    receive() external payable {
        payable(mgdCompany.owner()).transfer(msg.value);
    }
}
