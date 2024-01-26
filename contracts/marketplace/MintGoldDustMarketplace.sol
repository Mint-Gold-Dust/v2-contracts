// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.18;

import {AuctionProps, CollectorMintDTO, ListDTO, ManagePrimarySale, MarketItem, SaleDTO} from "../libraries/MgdMarketPlaceDataTypes.sol";
import {Counters} from "@openzeppelin/contracts/utils/Counters.sol";
import {IERC721Receiver} from "@openzeppelin/contracts/token/ERC721/IERC721Receiver.sol";
import {IERC1155Receiver} from "@openzeppelin/contracts/token/ERC1155/IERC1155Receiver.sol";
import {Initializable} from "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import {ERC165Upgradeable} from "@openzeppelin/contracts-upgradeable/utils/introspection/ERC165Upgradeable.sol";
import {PausableUpgradeable} from "@openzeppelin/contracts-upgradeable/security/PausableUpgradeable.sol";
import {ReentrancyGuardUpgradeable} from "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";
import {MintGoldDustCompany} from "./MintGoldDustCompany.sol";
import {MintGoldDustERC721} from "./MintGoldDustERC721.sol";
import {MintGoldDustNFT} from "./MintGoldDustNFT.sol";
import {MintGoldDustERC1155} from "./MintGoldDustERC1155.sol";

/// @title An abstract contract responsible to define some general responsibilites related with
/// a marketplace for its childrens.
/// @notice Contain a general function for purchases in primary and secondary sales
/// and also a virtual function that each children should have a specif implementation.
/// @author Mint Gold Dust LLC
/// @custom:contact klvh@mintgolddust.io
abstract contract MintGoldDustMarketplace is
    Initializable,
    PausableUpgradeable,
    IERC1155Receiver,
    IERC721Receiver,
    ReentrancyGuardUpgradeable
{
    using Counters for Counters.Counter;

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
     * @param isERC721 a parameter that indicate if the item is an ERC721 or not.
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
     * @param isERC721 a parameter that indicate if the item is an ERC721 or not.
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

    error ItemIsNotListed(address nft);
    error ItemIsNotListedBySeller(
        uint256 tokenId,
        address market,
        address contractAddress,
        address seller,
        address msgSender
    );
    error ItemIsAlreadyListed(address nft);
    error AddressUnauthorized(string _reason);
    error MustBeERC721OrERC1155();
    error LessItemsListedThanTheRequiredAmount();
    error InvalidAmountForThisPurchase();
    error PurchaseOfERC1155InAuctionThatCoverAllListedItems();
    error InvalidAmount();

    Counters.Counter public itemsSold;
    MintGoldDustMarketplace internal mintGoldDustMarketplace;
    MintGoldDustCompany internal mintGoldDustCompany;
    address payable internal mintGoldDustERC721Address;
    address payable internal mintGoldDustERC1155Address;

    uint256[48] private __gap;

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
     *  @notice that this mapping will manage the state to track the secondary sales.
     *  @dev here we can handle when a secondarySale should start. A succinct example that you can
     *  understand easily is the following:
     *      - An artist mint 10 items for a MintGoldDustERC1155.
     *      - He list 5 items for sale.
     *      - A buyer buys 5 items.
     *      - This buyer list s5 items for sale.
     *      - The artist buys your 5 items back.
     *      - Now the artist has 10 items again.
     *      - But notice that it can sale only more five in the primary sale flow.
     *  With this mapping and the ManageSecondarySale struct we can manage it.
     */
    /// @custom:daigaro
    // mapping(address => mapping(uint256 => ManageSecondarySale))
    //     internal _isSecondarySale;

    modifier isowner() {
        if (msg.sender != mintGoldDustCompany.owner()) {
            revert AddressUnauthorized("Not Mint Gold Dust owner");
        }
        _;
    }

    /**
     *
     * @notice MintGoldDustMarketplace is composed by other two contracts.
     * @param _mintGoldDustCompany The contract responsible to Mint Gold Dust management features.
     * @param _mintGoldDustERC721Address The Mint Gold Dust ERC721 address.
     * @param _mintGoldDustERC1155Address The Mint Gold Dust ERC1155 address.
     */
    function initialize(
        address _mintGoldDustCompany,
        address payable _mintGoldDustERC721Address,
        address payable _mintGoldDustERC1155Address
    ) internal onlyInitializing {
        require(
            _mintGoldDustCompany != address(0) &&
                _mintGoldDustERC721Address != address(0) &&
                _mintGoldDustERC1155Address != address(0),
            "contract address cannot be zero"
        );
        __ReentrancyGuard_init();
        __Pausable_init();
        mintGoldDustCompany = MintGoldDustCompany(_mintGoldDustCompany);
        mintGoldDustERC721Address = _mintGoldDustERC721Address;
        mintGoldDustERC1155Address = _mintGoldDustERC1155Address;
    }

    /// @notice Helper function that returns the current primary sale market info for `tokenId`.
    /// @param nft of nft contract
    /// @param tokenId of token
    /// @custom:daigaro
    function getManagePrimarySale(
        address nft,
        uint256 tokenId
    ) external view returns (ManagePrimarySale memory) {
        return MintGoldDustNFT(nft).getManagePrimarySale(tokenId);
    }

    /// @notice that this function set an instance of the MintGoldDustMarketplace to the sibling contract.
    /// @param _mintGoldDustMarketplace the address of the MintGoldDustMarketplace.
    /// @dev we create this lazy dependence because of the circular dependence between the
    /// MintGoldDustMarketplace. So this way we can share the state of the _isSecondarySale mapping.
    function setMintGoldDustMarketplace(
        address _mintGoldDustMarketplace
    ) external {
        require(mintGoldDustCompany.owner() == msg.sender, "Unauthorized");
        mintGoldDustMarketplace = MintGoldDustMarketplace(
            _mintGoldDustMarketplace
        );
    }

    /// @notice that this function is used to populate the _isSecondarySale mapping for the
    /// sibling contract. This way the mapping state will be shared.
    /// @param nft the address of the MintGoldDustERC1155 or MintGoldDustERC721.
    /// @param tokenId the id of the token.
    /// @param _owner the owner of the token.
    /// @param _sold a boolean that indicates if the token was sold or not.
    /// @param amount the amount of tokens minted for this token.
    /// @custom:daigaro
    // function setSecondarySale(
    //     address nft,
    //     uint256 tokenId,
    //     address _owner,
    //     bool _sold,
    //     uint256 amount
    // ) external {
    //     require(msg.sender == address(mintGoldDustMarketplace), "Unauthorized");
    //     _isSecondarySale[nft][tokenId] = ManageSecondarySale(
    //         _owner,
    //         _sold,
    //         amount
    //     );
    // }

    /// @notice that this function should be used to update the amount attribute for the _isSecondarySale mapping
    /// in the sibling contract.
    /// @param nft the address of the MintGoldDustERC1155 or MintGoldDustERC721.
    /// @param tokenId the id of the token.
    /// @param amount the amount of tokens minted for this token.
    /// @custom:daigaro
    // function updateSecondarySaleAmount(
    //     address nft,
    //     uint256 tokenId,
    //     uint256 amount
    // ) external {
    //     require(msg.sender == address(mintGoldDustMarketplace), "Unauthorized");
    //     ManageSecondarySale storage _manageSecondarySale = _isSecondarySale[
    //         nft
    //     ][tokenId];
    //     _manageSecondarySale.amount = _manageSecondarySale.amount - amount;
    // }

    /// @notice that this function should be used to update the sold attribute for the _isSecondarySale mapping
    /// in the sibling contract.
    /// @param nft the address of the MintGoldDustERC1155 or MintGoldDustERC721.
    /// @param tokenId the id of the token.
    /// @param _sold a boolean that indicates if the token was sold or not.
    /// @custom:daigaro
    // function updateSecondarySaleSold(
    //     address nft,
    //     uint256 tokenId,
    //     bool _sold
    // ) external {
    //     require(msg.sender == address(mintGoldDustMarketplace), "Unauthorized");
    //     ManageSecondarySale storage _manageSecondarySale = _isSecondarySale[
    //         nft
    //     ][tokenId];
    //     _manageSecondarySale.sold = _sold;
    // }

    /// @notice Pause the contract
    function pauseContract() external isowner {
        _pause();
    }

    /// @notice Unpause the contract
    function unpauseContract() external isowner {
        _unpause();
    }

    function onERC1155Received(
        address,
        address,
        uint256,
        uint256,
        bytes calldata
    ) external pure override returns (bytes4) {
        return this.onERC1155Received.selector;
    }

    function onERC1155BatchReceived(
        address,
        address,
        uint256[] calldata,
        uint256[] calldata,
        bytes calldata
    ) external pure override returns (bytes4) {
        return this.onERC1155BatchReceived.selector;
    }

    function onERC721Received(
        address,
        address,
        uint256,
        bytes calldata
    ) external pure override returns (bytes4) {
        return this.onERC721Received.selector;
    }

    /**
     *
     * @notice that is a general function that must be implemented by the more specif makets.
     * @dev it is a internal function and should be implemented by the childrens
     * if these are not abstract also.
     * @param tokenId: The tokenId of the marketItem.
     * @param amount: The quantity of tokens to be listed for an MintGoldDustERC1155.
     *    @dev For MintGoldDustERC721 the amout must be always one.
     * @param nft: The MintGoldDustERC1155 or the MintGoldDustERC721 address.
     * @param price: The price or reserve price for the item.
     */
    function list(
        uint256 tokenId,
        uint256 amount,
        MintGoldDustNFT nft,
        uint256 price
    ) external virtual;

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
     * @param listDTO The ListDTO struct parameter to use.
     *                 It consists of the following fields:
     *                    - tokenid: The tokenId of the marketItem.
     *                    - amount: The quantity of tokens to be listed for an MintGoldDustERC1155. For
     *                              MintGoldDustERC721 the amout must be always one.
     *                    - contractAddress: The MintGoldDustERC1155 or the MintGoldDustERC721 address.
     *                    - seller: The seller of the marketItem.
     *                    - price: the price to list the item. For auction it corresponds to the reserve price.
     * @param auctionId the auctionId for the auction. If the item is being listed to the set price market it is *                   zero.
     * @param sender the address that is listing the item.
     *    @dev we need this parameter because in the collectorMint flow who calls this function is the buyer. How *    it function is internal we can have a good control on top of it.
     */
    function _list(
        ListDTO memory listDTO,
        uint256 auctionId,
        address sender
    ) internal {
        bool isERC721 = false;
        uint256 realAmount = 1;

        if (address(listDTO.nft) == mintGoldDustERC721Address) {
            _isNFTowner(listDTO.tokenId, sender);
            isERC721 = true;
        } else if (address(listDTO.nft) == mintGoldDustERC1155Address) {
            _checkBalanceForERC1155(listDTO.tokenId, listDTO.amount, sender);
            realAmount = listDTO.amount;
        } else {
            revert MustBeERC721OrERC1155();
        }

        /// @custom:daigaro
        // if (
        //     _isSecondarySale[address(_mintGoldDustNFT)][_listDTO.tokenId]
        //         .owner == address(0)
        // ) {
        //     uint256 amountMinted = 1;

        //     if (address(_mintGoldDustNFT) == mintGoldDustERC1155Address) {
        //         amountMinted = (
        //             MintGoldDustERC1155(mintGoldDustERC1155Address)
        //         ).balanceOf(sender, _listDTO.tokenId);
        //     }

        //     _isSecondarySale[address(_mintGoldDustNFT)][
        //         _listDTO.tokenId
        //     ] = ManageSecondarySale(sender, false, amountMinted);
        //     mintGoldDustMarketplace.setSecondarySale(
        //         _listDTO.contractAddress,
        //         _listDTO.tokenId,
        //         sender,
        //         false,
        //         amountMinted
        //     );
        // }

        ManagePrimarySale memory managePS = listDTO.nft.getManagePrimarySale(
            listDTO.tokenId
        );

        /// @dev why we need this? We need to check if there are some amount listed for the other market.
        /// I mean, if the item was listed for the set price market and the seller is trying to list it for auction.
        /// It needs to be added to the sommary of the quantity restant for primary sales.
        (, , , , uint256 returnedTokenAmount, ) = mintGoldDustMarketplace
            .idMarketItemsByContractByOwner(
                address(listDTO.nft),
                listDTO.tokenId,
                sender
            );

        if (!managePS.soldout && sender == managePS.owner) {
            require(
                listDTO.amount + returnedTokenAmount <= managePS.amount,
                "Invalid amount for primary sale"
            );
        }

        AuctionProps memory auctionProps = AuctionProps(
            auctionId,
            0,
            0,
            payable(address(0)),
            0,
            false
        );

        idMarketItemsByContractByOwner[address(listDTO.nft)][listDTO.tokenId][
            sender
        ] = MarketItem(
            listDTO.tokenId,
            sender,
            listDTO.price,
            isERC721,
            realAmount,
            auctionProps
        );

        listDTO.nft.transfer(
            sender,
            address(this),
            listDTO.tokenId,
            realAmount
        );
    }

    /// @notice that this function check a boolean and depending of the value return a MintGoldDustERC721 or a MintGoldDustERC1155.
    /// @dev If true is created an instance of a MintGoldDustERC721 using polymorphism with the parent contract. If not
    ///      it creates an isntance for MintGoldDustERC1155.
    /// @param _isERC721 a boolean that say if the address is an ERC721 or not.
    /// @return MintGoldDustNFT an instance of MintGoldDustERC721 or MintGoldDustERC1155.
    /// @custom:daigaro
    // function _getERC1155OrERC721(
    //     bool _isERC721
    // ) internal view returns (MintGoldDustNFT) {
    //     if (_isERC721) {
    //         return MintGoldDustNFT(mintGoldDustERC721Address);
    //     } else {
    //         return MintGoldDustNFT(mintGoldDustERC1155Address);
    //     }
    // }

    /**
     * @param saleDTO The SaleDTO struct parameter to use.
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
     *                    - isERC721: true is an MintGoldDustERC721 token.
     *                    - tokenAmount: The quantity of tokens to be listed for an MintGoldDustERC1155. For
     *                              MintGoldDustERC721 the amout must be always one.
     *                    - auctionProps:
     *                        - endTime: the time that the auction must be finished. Is the start time plus 24 hours.
     *                        - highestBidder: the bidder that did bid the highest value.
     *                        - highestBid: the value of the high bid.
     *                        - ended: a boolean that indicates if the auction was already finished or not.
     */
    function _getMarketItem(
        SaleDTO memory saleDTO
    ) internal view returns (MarketItem memory) {
        return
            idMarketItemsByContractByOwner[address(saleDTO.nft)][
                saleDTO.tokenId
            ][saleDTO.seller];
    }

    /**
     * @notice function will fail if the token was not listed to the set price market.
     * @notice function will fail if the contract address is not a MintGoldDustERC721 neither a MintGoldDustERC1155.
     * @notice function will fail if the amount paid by the buyer does not cover the purshace amount required.
     * @param saleDTO The SaleDTO struct parameter to use.
     *                 It consists of the following fields:
     *                    - tokenid: The tokenId of the marketItem.
     *                    - amount: The quantity of tokens to be listed for an MintGoldDustERC1155. For
     *                              MintGoldDustERC721 the amout must be always one.
     *                    - contractAddress: The MintGoldDustERC1155 or the MintGoldDustERC721 address.
     *                    - seller: The seller of the marketItem.
     * @param sender The address that started this flow.
     * @param value The value to be paid for the purchase.
     */
    function _executePurchaseNftFlow(
        SaleDTO memory saleDTO,
        address sender,
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

        MarketItem memory marketItem = _getMarketItem(saleDTO);

        /// @dev if the flow goes for ERC721 the amount of tokens MUST be ONE.
        uint256 realAmount = 1;

        if (!marketItem.isERC721) {
            realAmount = saleDTO.amount;
        }

        _checkIfIsPrimaryOrSecondarySaleAndCall(
            marketItem,
            saleDTO,
            value,
            sender,
            realAmount
        );
    }

    /**
     * @dev this function check if the item was already sold some time and *      direct the flow to
     *     a primary or a secondary sale flow.
     * @param marketItem The MarketItem struct parameter to use.
     * @param saleDTO The SaleDTO struct parameter to use.
     * @param value The value to be paid for the purchase.
     * @param sender The address that started this flow.
     *    @dev we need to receive the sender this way, because in the auction flow the purchase starts from
     *         the endAuction function in the MintGoldDustMarketplaceAuction contract. So from there the address
     *         that we get is the highest bidder that is stored in the marketItem struct. So we need to manage this way.
     */
    function _checkIfIsPrimaryOrSecondarySaleAndCall(
        MarketItem memory marketItem,
        SaleDTO memory saleDTO,
        uint256 value,
        address sender,
        uint256 realAmount
    ) internal {
        ManagePrimarySale memory managePS = saleDTO.nft.getManagePrimarySale(
            saleDTO.tokenId
        );

        if (
            (managePS.owner == saleDTO.seller && managePS.soldout) ||
            (managePS.owner != saleDTO.seller)
        ) {
            _isMsgValueEnough(
                marketItem.price,
                realAmount,
                value,
                marketItem.auctionProps.auctionId
            );
            _secondarySale(marketItem, saleDTO, value, sender);
        } else {
            _isMsgValueEnoughPrimarySale(
                marketItem.price,
                realAmount,
                value,
                marketItem.auctionProps.auctionId
            );
            _primarySale(marketItem, saleDTO, value, sender, realAmount);
        }
    }

    /**
     * @dev for the auction market, when an artist or collector decides to put a MintGoldDustERC1155 for auction
     *      is necessary to inform the quantity of tokens to be listed.
     *    @notice that in this case, at the moment of the purchase, the buyer needs to buy all the tokens
     *            listed for auction.
     *    @notice that this function check if the amount being purchased by the onwer is the same of the amount
     *            of listed MintGoldDustERC1155 tokenId.
     * @param saleDTO a parameter just like in doxygen (must be followed by parameter name)
     */
    function _isBuyingAllListedTokens(SaleDTO memory saleDTO) internal view {
        if (
            saleDTO.amount <
            idMarketItemsByContractByOwner[address(saleDTO.nft)][
                saleDTO.tokenId
            ][saleDTO.seller].tokenAmount
        ) {
            revert PurchaseOfERC1155InAuctionThatCoverAllListedItems();
        }
    }

    /**
     * @dev this function check if the an address represents a MintGoldDustNFT contract.
     *      It MUST be a MintGoldDustERC721 address or a MintGoldDustERC1155 address.
     * @notice that the function REVERTS with a MustBeERC721OrERC1155() error if the conditon is not met.
     * @param nft is a MintGoldDustNFT address.
     */
    function _mustBeMintGoldDustERC721Or1155(address nft) internal view {
        //   // Get the interfaces that the contract supports
        bool isERC721 = nft == mintGoldDustERC721Address;
        bool isERC1155 = nft == mintGoldDustERC1155Address;

        // Ensure that the contract is either an ERC721 or ERC1155
        if (!isERC1155 && !isERC721) {
            revert MustBeERC721OrERC1155();
        }
    }

    /**
     * @dev the main goal of this function is check if the address calling the function is the
     *      owner of the tokenId.
     * @notice that it REVERTS with a AddressUnauthorized error if the condition is not met.
     * @param tokenId is the id that represent the token.
     * @param sender is the address that started this flow.
     */
    function _isNFTowner(uint256 tokenId, address sender) internal view {
        if (
            (MintGoldDustERC721(mintGoldDustERC721Address)).ownerOf(tokenId) !=
            sender
        ) {
            revert AddressUnauthorized("Not owner!");
        }
    }

    /**
     * @dev the goal here is, depending of the contract address (MintGoldDustERC721 or MintGoldDustERC1155)
     *      verify if the tokenId is really listed.
     * @notice that if not it REVERTS with a Item_isNotListed() error.
     * @param tokenId is the id that represent the token.
     * @param nft is a MintGoldDustNFT address.
     * @param seller is the address of the seller of this tokenId.
     */
    function _isTokenListed(
        uint256 tokenId,
        address nft,
        address seller
    ) internal view {
        if (
            idMarketItemsByContractByOwner[nft][tokenId][seller].tokenAmount ==
            0
        ) {
            revert ItemIsNotListedBySeller(
                tokenId,
                address(this),
                nft,
                seller,
                msg.sender
            );
        }
        if (
            nft == mintGoldDustERC721Address &&
            (MintGoldDustERC721(mintGoldDustERC721Address)).ownerOf(tokenId) !=
            address(this)
        ) {
            revert ItemIsNotListed(nft);
        }

        if (
            nft == mintGoldDustERC1155Address &&
            (MintGoldDustERC1155(mintGoldDustERC1155Address)).balanceOf(
                address(this),
                tokenId
            ) ==
            0
        ) {
            revert ItemIsNotListed(nft);
        }
    }

    /**
     * @dev the goal here is verify if the MintGoldDustMarketplace contract has the quantity of
     *      MintGoldDustERC1155 tokens that the collector is trying to buy.
     * @notice that if not it REVERTS with a LessItemsListedThanTheRequiredAmount() error.
     * @param tokenId is the id that represent the token.
     * @param nft is a MintGoldDustNFT address.
     * @param marketPlaceAddress it can be a MintGoldDustMarketplaceAuction or a MintGoldDustSetPrice address.
     * @param tokenQuantity the quantity of tokens desired by the buyer.
     * @param seller is the address of the seller of this tokenId.
     */
    function _hasEnoughAmountListed(
        uint256 tokenId,
        address nft,
        address marketPlaceAddress,
        uint256 tokenQuantity,
        address seller
    ) internal view {
        if (
            nft == mintGoldDustERC1155Address &&
            (MintGoldDustERC1155(mintGoldDustERC1155Address)).balanceOf(
                marketPlaceAddress,
                tokenId
            ) <
            tokenQuantity
        ) {
            revert LessItemsListedThanTheRequiredAmount();
        }
        if (
            idMarketItemsByContractByOwner[nft][tokenId][seller].tokenAmount <
            tokenQuantity
        ) {
            revert LessItemsListedThanTheRequiredAmount();
        }
    }

    /**
     * @dev the goal here is verify if the address is the seller of the respective tokenId for a contract address.
     * @notice that if not it REVERTS with a AddressUnauthorized() error.
     * @param tokenId is the id that represent the token.
     * @param nft is a MintGoldDustNFT address.
     * @param seller is the address of the seller of this tokenId.
     */
    function _isSeller(
        uint256 tokenId,
        address nft,
        address seller
    ) internal view {
        if (
            msg.sender !=
            idMarketItemsByContractByOwner[nft][tokenId][seller].seller
        ) {
            revert AddressUnauthorized("Not seller!");
        }
    }

    function _isNotListed(
        uint256 tokenId,
        address nft,
        address _seller
    ) internal view {
        if (
            idMarketItemsByContractByOwner[nft][tokenId][_seller].tokenAmount >
            0
        ) {
            revert ItemIsAlreadyListed(nft);
        }
    }

    function _checkAmount(uint256 amount) internal pure {
        if (amount <= 0) {
            revert InvalidAmount();
        }
    }

    /**
     * @dev the main goal of this function is check if the address calling the function is the
     *      owner of the tokenId. For ERC1155 it means if the address has some balance for this token.
     * @notice that it REVERTS with a AddressUnauthorized error if the condition is not met.
     * @param tokenId is the id that represent the token.
     * @param _tokenAmount is the quantity of tokens desired by the buyer.
     * @param sender is the address that started this flow.
     */
    function _checkBalanceForERC1155(
        uint256 tokenId,
        uint256 _tokenAmount,
        address sender
    ) private view {
        if (
            (MintGoldDustERC1155(mintGoldDustERC1155Address)).balanceOf(
                sender,
                tokenId
            ) < _tokenAmount
        ) {
            revert AddressUnauthorized(
                "Not owner or not has enough token quantity!"
            );
        }
    }

    /**
     * @notice that this function is responsible to start the primary sale flow.
     * @dev here we apply the fees related with the primary market that are:
     *                 - the primarySaleFeePercent and the collectorFee.
     * @param marketItem The MarketItem struct parameter to use.
     *                 It consists of the following fields:
     *                    - tokenId: The tokenId of the marketItem.
     *                    - seller: The seller of the marketItem.
     *                    - price: The price which the item should be sold.
     *                    - isERC721: true is an MintGoldDustERC721 token.
     *                    - tokenAmount: The quantity of tokens to be listed for an MintGoldDustERC1155. For
     *                              MintGoldDustERC721 the amout must be always one.
     *                    - auctionProps:
     *                        - auctionId: the auctionId for the auction.
     *                        - startTime: the time that the auction have started.
     *                        - endTime: the time that the auction must be finished. Is the start time plus 24 hours.
     *                        - highestBidder: the bidder that did bid the highest value.
     *                        - highestBid: the value of the high bid.
     *                        - ended: a boolean that indicates if the auction was already finished or not.
     * @param saleDTO The SaleDTO struct parameter to use.
     *                 It consists of the following fields:
     *                    - tokenid: The tokenId of the marketItem.
     *                    - amount: The quantity of tokens to be listed for an MintGoldDustERC1155. For
     *                              MintGoldDustERC721 the amout must be always one.
     *                    - contractAddress: The MintGoldDustERC1155 or the MintGoldDustERC721 address.
     *                    - seller: The seller of the marketItem.
     * @param value The value to be paid for the purchase.
     * @param sender The address that started this flow.
     *    @dev we need to receive the sender this way, because in the auction flow the purchase starts from
     *         the endAuction function in the MintGoldDustMarketplaceAuction contract. So from there the address
     *         that we get is the highst bidder that is stored in the marketItem struct. So we need to manage this way.
     */
    function _primarySale(
        MarketItem memory marketItem,
        SaleDTO memory saleDTO,
        uint256 value,
        address sender,
        uint256 realAmount
    ) private {
        // MintGoldDustNFT _mintGoldDustNFT = _getERC1155OrERC721(
        //     marketItem.isERC721
        // );

        ManagePrimarySale memory mPSale = saleDTO.nft.getManagePrimarySale(
            saleDTO.tokenId
        );

        saleDTO.nft.updatePrimarySaleQuantityToSell(
            saleDTO.tokenId,
            realAmount
        );

        if (mPSale.amount - realAmount == 0) {
            saleDTO.nft.setTokenWasSold(saleDTO.tokenId);
        }

        itemsSold.increment();

        uint256 fee;
        uint256 collFee;
        uint256 balance;

        /// @dev it removes the fee from the value that the buyer sent.
        uint256 netValue = (value * (100e18)) / (103e18);

        fee =
            (netValue * mintGoldDustCompany.primarySaleFeePercent()) /
            (100e18);
        collFee = (netValue * mintGoldDustCompany.collectorFee()) / (100e18);
        balance = netValue - fee;

        _checkIfIsSplitPaymentAndCall(
            saleDTO.nft,
            marketItem,
            saleDTO,
            balance,
            fee,
            collFee,
            true,
            netValue,
            sender
        );

        (bool successOwner, ) = payable(mintGoldDustCompany.owner()).call{
            value: collFee + fee
        }("");
        require(successOwner, "Transfer to owner failed.");
    }

    /**
     * @notice that this function will check if the item has or not the collaborator and call the correct
     *         flow (unique sale or split sale)
     * @dev Explain to a developer any extra details
     * @param nft MintGoldDustNFT is an instance of MintGoldDustERC721 or MintGoldDustERC1155.
     * @param marketItem the struct MarketItem - check it in the primarySale or secondary sale functions.
     * @param saleDTO the struct SaleDTO - check it in the primarySale or secondary sale functions.
     * @param balance uint256 that represents the total amount to be received by the seller after fee calculations.
     * @param fee uint256 the primary or the secondary fee to be paid by the buyer.
     * @param collFeeOrRoyalty uint256 that represent the collector fee or the royalty depending of the flow.
     * @param isPrimarySale bool that helps the code to go for the correct flow (Primary or Secondary sale).
     * @param value The value to be paid for the purchase.
     * @param sender The address that started this flow.
     *    @dev we need to receive the sender this way, because in the auction flow the purchase starts from
     *         the endAuction function in the MintGoldDustMarketplaceAuction contract. So from there the address
     *         that we get is the highst bidder that is stored in the marketItem struct. So we need to manage this way.
     */
    function _checkIfIsSplitPaymentAndCall(
        MintGoldDustNFT nft,
        MarketItem memory marketItem,
        SaleDTO memory saleDTO,
        uint256 balance,
        uint256 fee,
        uint256 collFeeOrRoyalty,
        bool isPrimarySale,
        uint256 value,
        address sender
    ) private {
        address artistOrSeller = nft.tokenIdArtist(saleDTO.tokenId);

        if (isPrimarySale) {
            artistOrSeller = saleDTO.seller;
        }

        if (nft.hasTokenCollaborators(saleDTO.tokenId)) {
            _handleSplitPaymentCall(
                nft,
                saleDTO,
                balance,
                fee,
                collFeeOrRoyalty,
                artistOrSeller,
                isPrimarySale,
                value,
                sender
            );
            return;
        }

        if (isPrimarySale) {
            _uniqueOwnerPrimarySale(
                nft,
                marketItem,
                saleDTO,
                fee,
                collFeeOrRoyalty,
                balance,
                value,
                sender
            );
            return;
        }

        _uniqueOwnerSecondarySale(
            marketItem,
            nft,
            saleDTO,
            artistOrSeller,
            fee,
            collFeeOrRoyalty,
            balance,
            value,
            sender
        );
    }

    /**
     * @dev this function is called when in the checkIfIsSplitPaymentAndCall function the flow goes for
     *      a sale for an item that does not has collaborators and is its first sale in the MintGoldDustMarketplace.
     *    @dev we need to receive the sender this way, because in the auction flow the purchase starts from
     *         the endAuction function in the MintGoldDustMarketplaceAuction contract. So from there the address
     *         that we get is the highst bidder that is stored in the marketItem struct. So we need to manage this way.
     */
    function _uniqueOwnerPrimarySale(
        MintGoldDustNFT nft,
        MarketItem memory marketItem,
        SaleDTO memory saleDTO,
        uint256 /* fee */,
        uint256 /* _collFee */,
        uint256 balance,
        uint256 /* value */,
        address sender
    ) private {
        nft.transfer(address(this), sender, saleDTO.tokenId, saleDTO.amount);

        _updateIdMarketItemsByContractByOwnerMapping(saleDTO);
        /// @custom:silence-large-stack-events
        // emit MintGoldDustNftPurchasedPrimaryMarket(
        //     itemsSold.current(),
        //     saleDTO.tokenId,
        //     saleDTO.seller,
        //     sender,
        //     value,
        //     balance,
        //     fee,
        //     _collFee,
        //     saleDTO.amount,
        //     false,
        //     marketItem.isERC721
        // );

        (bool successSeller, ) = payable(marketItem.seller).call{
            value: balance
        }("");
        require(successSeller, "Transfer to seller failed.");
    }

    function _updateIdMarketItemsByContractByOwnerMapping(
        SaleDTO memory saleDTO
    ) private {
        MarketItem storage item = idMarketItemsByContractByOwner[
            address(saleDTO.nft)
        ][saleDTO.tokenId][saleDTO.seller];

        item.tokenAmount = item.tokenAmount - saleDTO.amount;

        if (item.tokenAmount == 0) {
            delete idMarketItemsByContractByOwner[address(saleDTO.nft)][
                saleDTO.tokenId
            ][saleDTO.seller];
        }
    }

    /**
     * @dev this function is called when in the checkIfIsSplitPaymentAndCall function the flow goes for
     *      a sale for an item that does not has collaborators and was already sold the first time.
     *    @dev we need to receive the sender this way, because in the auction flow the purchase starts from
     *         the endAuction function in the MintGoldDustMarketplaceAuction contract. So from there the address
     *         that we get is the highst bidder that is stored in the marketItem struct. So we need to manage this way.
     */
    function _uniqueOwnerSecondarySale(
        MarketItem memory /* marketItem */,
        MintGoldDustNFT nft,
        SaleDTO memory saleDTO,
        address artist,
        uint256 /* fee */,
        uint256 _royalty,
        uint256 /* balance */,
        uint256 /* value */,
        address sender
    ) private {
        nft.transfer(address(this), sender, saleDTO.tokenId, saleDTO.amount);

        _updateIdMarketItemsByContractByOwnerMapping(saleDTO);
        /// @custom:silence-large-stack-events
        // emit MintGoldDustNftPurchasedSecondaryMarket(
        //     itemsSold.current(),
        //     saleDTO.tokenId,
        //     saleDTO.seller,
        //     sender,
        //     value,
        //     balance,
        //     nft.tokenIdRoyaltyPercent(saleDTO.tokenId),
        //     _royalty,
        //     artist,
        //     fee,
        //     saleDTO.amount,
        //     false,
        //     marketItem.isERC721
        // );

        (bool successArtist, ) = payable(artist).call{value: _royalty}("");
        require(successArtist, "Transfer to artist failed.");
    }

    /**
     * @notice that is the function responsible to manage the split sale flow.
     * @dev the _isPrimarySale is very important. It define if the value to be received is
     *      the balance for primary sale or the royalty for secondary sales.
     *    @notice that the emitEventForSplitPayment os called to trigger the correct event depending of the flow.
     *    @dev we need to receive the sender this way, because in the auction flow the purchase starts from
     *         the endAuction function in the MintGoldDustMarketplaceAuction contract. So from there the address
     *         that we get is the highst bidder that is stored in the marketItem struct. So we need to manage this way.
     */
    function _splittedSale(
        uint256 balance,
        uint256 /* fee */,
        uint256 collFeeOrRoyalty,
        address artist,
        MintGoldDustNFT nft,
        SaleDTO memory saleDTO,
        bool _isPrimarySale,
        uint256 /* value */,
        address /* sender */
    ) private {
        /* MarketItem memory marketItem = _getMarketItem(saleDTO); */

        uint256 balanceOrRoyalty = collFeeOrRoyalty;

        if (_isPrimarySale) {
            balanceOrRoyalty = balance;
        }

        uint256 tokenIdCollaboratorsQuantity = nft.tokenIdCollaboratorsQuantity(
            saleDTO.tokenId
        );

        uint256 balanceSplitPart = (balanceOrRoyalty *
            nft.tokenIdCollaboratorsPercentage(saleDTO.tokenId, 0)) / (100e18);

        (bool successArtist, ) = payable(artist).call{value: balanceSplitPart}(
            ""
        );
        require(successArtist, "Split tx to artist failed.");

        emit NftPurchasedCollaboratorAmount(
            itemsSold.current(),
            artist,
            balanceSplitPart
        );

        for (uint256 i = 1; i < tokenIdCollaboratorsQuantity; i++) {
            balanceSplitPart =
                (balanceOrRoyalty *
                    nft.tokenIdCollaboratorsPercentage(saleDTO.tokenId, i)) /
                (100e18);
            address collaborator = nft.tokenCollaborators(
                saleDTO.tokenId,
                i - 1
            );

            (bool successCollaborator, ) = payable(collaborator).call{
                value: balanceSplitPart
            }("");
            require(successCollaborator, "Split tx to collab failed.");

            emit NftPurchasedCollaboratorAmount(
                itemsSold.current(),
                collaborator,
                balanceSplitPart
            );
        }

        _updateIdMarketItemsByContractByOwnerMapping(saleDTO);
        /// @custom:silence-large-stack-events
        // _emitEventForSplitPayment(
        //     saleDTO,
        //     marketItem,
        //     nft,
        //     artist,
        //     balance,
        //     fee,
        //     collFeeOrRoyalty,
        //     _isPrimarySale,
        //     value,
        //     sender
        // );
    }

    /**
     * @notice that is the function responsible to trigger the correct event for splitted sales.
     * @dev the _isPrimarySale defines if the primary sale or the secondary sale should be triggered.
     *    @dev we need to receive the sender this way, because in the auction flow the purchase starts from
     *         the endAuction function in the MintGoldDustMarketplaceAuction contract. So from there the address
     *         that we get is the highst bidder that is stored in the marketItem struct. So we need to manage this way.
     */
    function _emitEventForSplitPayment(
        SaleDTO memory /* saleDTO */,
        MarketItem memory /* marketItem */,
        MintGoldDustNFT /* nft */,
        address /* artist */,
        uint256 /* balance */,
        uint256 /* fee */,
        uint256 /* collFeeOrRoyalty */,
        bool isPrimarySale,
        uint256 /* value */,
        address /* sender */
    ) private pure {
        if (isPrimarySale) {
            /// @custom:silence-large-stack-events
            // emit MintGoldDustNftPurchasedPrimaryMarket(
            //     itemsSold.current(),
            //     saleDTO.tokenId,
            //     saleDTO.seller,
            //     sender,
            //     value,
            //     balance,
            //     fee,
            //     collFeeOrRoyalty,
            //     saleDTO.amount,
            //     true,
            //     marketItem.isERC721
            // );
            return;
        }
        /// @custom:silence-large-stack-events
        // emit MintGoldDustNftPurchasedSecondaryMarket(
        //     itemsSold.current(),
        //     saleDTO.tokenId,
        //     saleDTO.seller,
        //     sender,
        //     value,
        //     balance,
        //     nft.tokenIdRoyaltyPercent(saleDTO.tokenId),
        //     collFeeOrRoyalty,
        //     artist,
        //     fee,
        //     saleDTO.amount,
        //     true,
        //     marketItem.isERC721
        // );
    }

    /**
     * @notice that this function do continuity to split payment flow.
     * @dev Explain to a developer any extra details
     * @param nft MintGoldDustNFT is an instance of MintGoldDustERC721 or MintGoldDustERC1155.
     * @param saleDTO The SaleDTO struct parameter to use.
     *                 It consists of the following fields:
     *                    - tokenid: The tokenId of the marketItem.
     *                    - amount: The quantity of tokens to be listed for an MintGoldDustERC1155. For
     *                              MintGoldDustERC721 the amout must be always one.
     *                    - contractAddress: The MintGoldDustERC1155 or the MintGoldDustERC721 address.
     *                    - seller: The seller of the marketItem.
     * @param balance uint256 that represents the total amount to be received by the seller after fee calculations.
     * @param fee uint256 the primary or the secondary fee to be paid by the buyer.
     * @param collFeeOrRoyalty uint256 that represent the collerctor fee or the royalty depending of the flow.
     * @param artistOrSeller address for the artist on secondary sales and for the seller on the primary sales.
     * @param isPrimarySale bool that helps the code to go for the correct flow (Primary or Secondary sale).
     * @param value The value to be paid for the purchase.
     * @param sender The address that started this flow.
     *    @dev we need to receive the sender this way, because in the auction flow the purchase starts from
     *         the endAuction function in the MintGoldDustMarketplaceAuction contract. So from there the address
     *         that we get is the highst bidder that is stored in the marketItem struct. So we need to manage this way.
     */
    function _handleSplitPaymentCall(
        MintGoldDustNFT nft,
        SaleDTO memory saleDTO,
        uint256 balance,
        uint256 fee,
        uint256 collFeeOrRoyalty,
        address artistOrSeller,
        bool isPrimarySale,
        uint256 value,
        address sender
    ) private {
        nft.transfer(address(this), sender, saleDTO.tokenId, saleDTO.amount);
        _splittedSale(
            balance,
            fee,
            collFeeOrRoyalty,
            artistOrSeller,
            nft,
            saleDTO,
            isPrimarySale,
            value,
            sender
        );
    }

    /**
     * @notice that this function is responsible to start the secondary sale flow.
     * @dev here we apply the fees related with the secondary market that are:
     *                 - the secondarySaleFeePercent and the tokenIdRoyaltyPercent.
     * @param marketItem The MarketItem struct parameter to use.
     *                 It consists of the following fields:
     *                    - tokenId: The tokenId of the marketItem.
     *                    - seller: The seller of the marketItem.
     *                    - price: The price which the item should be sold.
     *                    - sold: It says if an item was or not sold.
     *                    - isAuction: true if the item was listed for marketplace auction and false if for set price market.
     *                    - isERC721: true is an MintGoldDustERC721 token.
     *                    - tokenAmount: The quantity of tokens to be listed for an MintGoldDustERC1155. For
     *                              MintGoldDustERC721 the amout must be always one.
     *                    - auctionProps:
     *                        - endTime: the time that the auction must be finished. Is the start time plus 24 hours.
     *                        - highestBidder: the bidder that did bid the highest value.
     *                        - highestBid: the value of the high bid.
     *                        - ended: a boolean that indicates if the auction was already finished or not.
     * @param saleDTO The SaleDTO struct parameter to use.
     *                 It consists of the following fields:
     *                    - tokenid: The tokenId of the marketItem.
     *                    - amount: The quantity of tokens to be listed for an MintGoldDustERC1155. For
     *                              MintGoldDustERC721 the amout must be always one.
     *                    - contractAddress: The MintGoldDustERC1155 or the MintGoldDustERC721 address.
     *                    - seller: The seller of the marketItem.
     * @param value The value to be paid for the purchase.
     * @param sender The address that started this flow.
     *    @dev we need to receive the sender this way, because in the auction flow the purchase starts from
     *         the endAuction function in the MintGoldDustMarketplaceAuction contract. So from there the address
     *         that we get is the highst bidder that is stored in the marketItem struct. So we need to manage this way.
     */
    function _secondarySale(
        MarketItem memory marketItem,
        SaleDTO memory saleDTO,
        uint256 value,
        address sender
    ) private {
        itemsSold.increment();

        uint256 fee;
        uint256 royalty;
        uint256 balance;

        fee =
            (value * mintGoldDustCompany.secondarySaleFeePercent()) /
            (100e18);
        royalty =
            (value * saleDTO.nft.tokenIdRoyaltyPercent(saleDTO.tokenId)) /
            (100e18);

        balance = value - (fee + royalty);

        _checkIfIsSplitPaymentAndCall(
            saleDTO.nft,
            marketItem,
            saleDTO,
            balance,
            fee,
            royalty,
            false,
            value,
            sender
        );

        (bool successOwner, ) = payable(mintGoldDustCompany.owner()).call{
            value: fee
        }("");
        require(successOwner, "Transaction to owner failed.");

        (bool successSeller, ) = payable(marketItem.seller).call{
            value: balance
        }("");
        require(successSeller, "Transaction to seller failed.");
    }

    /// @dev it is a private function to verify if the msg.value is enough to pay the product between the
    ///      price of the token and the quantity desired.
    /// @param price the price of one market item.
    /// @param amount the quantity desired for this purchase.
    /// @param value the value sent by the buyer.
    /// @notice that it REVERTS with a InvalidAmountForThisPurchase() error if the condition is not met.
    function _isMsgValueEnough(
        uint256 price,
        uint256 amount,
        uint256 value,
        uint256 _auctionId
    ) private pure {
        uint256 realAmount = amount;
        if (_auctionId != 0) {
            realAmount = 1;
        }

        if (value != price * realAmount) {
            revert InvalidAmountForThisPurchase();
        }
    }

    /**
     * @dev Checks if the provided value is enough to cover the total price of the product, including a 3% fee.
     * @param price The unit price of the item.
     * @param amount The quantity of items desired for purchase.
     * @param value The value sent with the transaction, expected to cover the totalPrice including the 3% fee.
     * @notice Reverts with the InvalidAmountForThisPurchase error if the provided value doesn't match the expected amount.
     */
    function _isMsgValueEnoughPrimarySale(
        uint256 price,
        uint256 amount,
        uint256 value,
        uint256 _auctionId
    ) private pure {
        uint256 realAmount = amount;
        if (_auctionId != 0) {
            realAmount = 1;
        }

        // Calculate total price for the amount
        uint256 totalPrice = price * realAmount;

        // Calculate the increase using higher precision
        uint256 increase = (totalPrice * 3) / 100;

        uint256 realPrice = totalPrice + increase;

        // Check if value is equal to totalPrice + realPrice
        if (value != realPrice && _auctionId == 0) {
            revert InvalidAmountForThisPurchase();
        }

        if (value < realPrice && _auctionId > 0) {
            revert InvalidAmountForThisPurchase();
        }
    }
}
