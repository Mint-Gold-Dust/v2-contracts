// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.18;

import "@openzeppelin/contracts/utils/Counters.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721Receiver.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/utils/introspection/ERC165Upgradeable.sol";
import "./MintGoldDustCompany.sol";
import "./MintGoldDustERC721.sol";
import "./MintGoldDustNFT.sol";
import "./MintGoldDustERC1155.sol";

error MGDMarketplaceIncorrectAmountSent();
error MGDMarketplaceItemIsNotListed();
error MGDMarketplaceItemIsAlreadyListed();
error MGDMarketplaceUnauthorized();
error MGDMarketplaceTokenForSecondSale();
error MGDMarketplaceInvalidInput();
error MGDMarketErrorToTransfer();
error MGDMarketFunctionForSetPriceListedNFT();
error MGDMarketFunctionForAuctionListedNFT();
error MustBeERC721OrERC1155();
error NotOwnerOrDoesNotHasEnoughAmountOfToken();
error LessItemsListedThanThePurchaseAmount();

/// @title An abstract contract responsible to define some general responsibilites related with
/// a marketplace for its childrens.
/// @notice Contain a general function for purchases in primary and secondary sales
/// and also a virtual function that each children should have a specif implementation.
/// @author Mint Gold Dust LLC
/// @custom:contact klvh@mintgolddust.io
abstract contract MintGoldDustMarketplace is Initializable {
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

    mapping(address => mapping(uint256 => MarketItem))
        public idMarketItemsByContract;

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

    struct AuctionProps {
        uint256 endTime;
        address highestBidder;
        uint256 highestBid;
        bool cancelled;
        bool ended;
    }

    event NftPurchasedPrimaryMarket(
        uint256 indexed tokenId,
        address seller,
        address newOwner,
        uint256 buyPrice,
        uint256 feeAmount,
        uint256 collectorFeeAmount,
        bool auction,
        bool isERC721,
        uint256 tokenIdAmount
    );

    event NftPurchasedSecondaryMarket(
        uint256 indexed tokenId,
        address seller,
        address newOwner,
        uint256 buyPrice,
        uint256 royaltyPercent,
        uint256 royaltyAmount,
        address royaltyRecipient,
        uint256 feeAmount,
        bool auction,
        bool isERC721,
        uint256 tokenIdAmount
    );

    /**
     *
     * @notice that is a general function to be used by the more specif makets.
     * @dev it is a internal function and should be implemented by the childrens
     * if these are not abstract also.
     * @param _tokenId the id of the NFT token to be listed.
     * @param _price the respective price to list this item.
     */
    function list(
        uint256 _tokenId,
        uint256 _price,
        uint256 _tokenAmount,
        address _contractAddress
    ) public virtual;

    /**
     * Primary sale flow
     * @notice that the function will fails if the amount sent is
     * less than the item price.
     * @dev here we apply the fees related with the primary market that are:
     * the primarySaleFeePercent and the collectorFee.
     * @param _value is the amount to be paid for the sale.
     * @param _sender is the address of the buyer.
     * @param _tokenId is the token id to be exchanged.
     */
    function primarySale(
        uint256 _value,
        address _sender,
        uint256 _tokenId,
        uint256 _amount,
        address _contractAddress
    ) private {
        MintGoldDustNFT _mintGoldDustNFT;
        MarketItem memory marketItem = idMarketItemsByContract[
            _contractAddress
        ][_tokenId];

        if (marketItem.isERC721) {
            _mintGoldDustNFT = MintGoldDustNFT(mintGoldDustERC721Address);
        } else {
            _mintGoldDustNFT = MintGoldDustNFT(mintGoldDustERC1155Address);
        }

        if (_value != marketItem.price) {
            revert MGDMarketplaceIncorrectAmountSent();
        }

        idMarketItemsByContract[_contractAddress][_tokenId].sold = true;
        idMarketItemsByContract[_contractAddress][_tokenId]
            .isSecondarySale = true;
        itemsSold.increment();

        uint256 fee;
        uint256 collFee;
        uint256 balance;

        fee = (_value * mgdCompany.primarySaleFeePercent()) / (100 * 10 ** 18);
        collFee = (_value * mgdCompany.collectorFee()) / (100 * 10 ** 18);
        balance = _value - (fee + collFee);

        if (_mintGoldDustNFT.hasTokenCollaborators(_tokenId)) {
            try
                _mintGoldDustNFT.transfer(
                    address(this),
                    _sender,
                    _tokenId,
                    _amount
                )
            {
                splittedSale(
                    balance,
                    _tokenId,
                    idMarketItemsByContract[_contractAddress][_tokenId].seller,
                    _contractAddress
                );
            } catch {
                idMarketItemsByContract[_contractAddress][_tokenId]
                    .sold = false;
                idMarketItemsByContract[_contractAddress][_tokenId]
                    .isSecondarySale = false;
                itemsSold.decrement();
                revert MGDMarketErrorToTransfer();
            }
        } else {
            try
                _mintGoldDustNFT.transfer(
                    address(this),
                    _sender,
                    _tokenId,
                    _amount
                )
            {
                payable(marketItem.seller).transfer(balance);
                emit NftPurchasedPrimaryMarket(
                    _tokenId,
                    marketItem.seller,
                    _sender,
                    marketItem.price,
                    fee,
                    collFee,
                    marketItem.isAuction,
                    marketItem.isERC721,
                    marketItem.tokenAmount
                );
            } catch {
                idMarketItemsByContract[_contractAddress][_tokenId]
                    .sold = false;
                idMarketItemsByContract[_contractAddress][_tokenId]
                    .isSecondarySale = false;
                itemsSold.decrement();
                revert MGDMarketErrorToTransfer();
            }
        }

        payable(mgdCompany.owner()).transfer(collFee + fee);
    }

    function splittedSale(
        uint256 _balance,
        uint256 _tokenId,
        address _artist,
        address _contractAddress
    ) private {
        MintGoldDustNFT _mintGoldDustNFT;

        if (idMarketItemsByContract[_contractAddress][_tokenId].isERC721) {
            _mintGoldDustNFT = MintGoldDustNFT(mintGoldDustERC721Address);
        } else {
            _mintGoldDustNFT = MintGoldDustNFT(mintGoldDustERC1155Address);
        }

        uint256 _tokenIdCollaboratorsQuantity = _mintGoldDustNFT
            .tokenIdCollaboratorsQuantity(_tokenId);

        uint256 balanceSplitPart = (_balance *
            _mintGoldDustNFT.tokenIdCollaboratorsPercentage(_tokenId, 0)) /
            (100 * 10 ** 18);
        payable(_artist).transfer(balanceSplitPart);
        for (uint256 i = 1; i < _tokenIdCollaboratorsQuantity; i++) {
            balanceSplitPart =
                (_balance *
                    _mintGoldDustNFT.tokenIdCollaboratorsPercentage(
                        _tokenId,
                        i
                    )) /
                (100 * 10 ** 18);
            payable(_mintGoldDustNFT.tokenCollaborators(_tokenId, i - 1))
                .transfer(balanceSplitPart);
        }
    }

    /**
     * Secondary sale flow
     * @notice that the function will fails if the amount sent is
     * less than the item price.
     * @dev here we apply the fees related with the secondary market that are:
     * the secondarySaleFeePercent and the tokenIdRoyaltyPercent.
     * @param _value is the amount to be paid for the sale.
     * @param _sender is the address of the buyer.
     * @param _tokenId is the token id to be exchanged.
     */
    function secondarySale(
        uint256 _value,
        address _sender,
        uint256 _tokenId,
        uint256 _amount,
        address _contractAddress
    ) private {
        MintGoldDustNFT _mintGoldDustNFT;
        MarketItem memory marketItem = idMarketItemsByContract[
            _contractAddress
        ][_tokenId];

        if (marketItem.isERC721) {
            _mintGoldDustNFT = MintGoldDustNFT(mintGoldDustERC721Address);
        } else {
            _mintGoldDustNFT = MintGoldDustNFT(mintGoldDustERC1155Address);
        }

        if (_value != marketItem.price) {
            revert MGDMarketplaceIncorrectAmountSent();
        }
        idMarketItemsByContract[_contractAddress][_tokenId].sold = true;
        itemsSold.increment();

        uint256 fee;
        uint256 royalty;
        uint256 balance;

        fee =
            (_value * mgdCompany.secondarySaleFeePercent()) /
            (100 * 10 ** 18);
        royalty =
            (_value * _mintGoldDustNFT.tokenIdRoyaltyPercent(_tokenId)) /
            (100 * 10 ** 18);

        balance = _value - (fee + royalty);
        address _artistAddress = _mintGoldDustNFT.tokenIdArtist(_tokenId);
        if (_mintGoldDustNFT.hasTokenCollaborators(_tokenId)) {
            try
                _mintGoldDustNFT.transfer(
                    address(this),
                    _sender,
                    _tokenId,
                    _amount
                )
            {
                splittedSale(
                    royalty,
                    _tokenId,
                    _artistAddress,
                    _contractAddress
                );
            } catch {
                idMarketItemsByContract[_contractAddress][_tokenId]
                    .sold = false;
                itemsSold.decrement();
                revert MGDMarketErrorToTransfer();
            }
        } else {
            try
                _mintGoldDustNFT.transfer(
                    address(this),
                    _sender,
                    _tokenId,
                    _amount
                )
            {
                payable(_artistAddress).transfer(royalty);
                emit NftPurchasedSecondaryMarket(
                    _tokenId,
                    marketItem.seller,
                    _sender,
                    marketItem.price,
                    _mintGoldDustNFT.tokenIdRoyaltyPercent(_tokenId),
                    royalty,
                    _artistAddress,
                    fee,
                    marketItem.isAuction,
                    marketItem.isERC721,
                    marketItem.tokenAmount
                );
            } catch {
                idMarketItemsByContract[_contractAddress][_tokenId]
                    .sold = false;
                itemsSold.decrement();
                revert MGDMarketErrorToTransfer();
            }
        }
        payable(mgdCompany.owner()).transfer(fee);
        payable(marketItem.seller).transfer(balance);
    }

    /**
     * Acquire a listed NFT to Set Price market
     * @notice Function will fail if the token was not listed to a set price market.
     * @dev This function is specific for the set price market. Because in this case
     * the function will be called externally. So is possible to get the msg.value.
     * For the auction market we have a second purchaseNft function. See below.
     * @param _tokenId The token ID of the the token to acquire
     */
    function purchaseNft(
        uint256 _tokenId,
        uint256 _amount,
        address _contractAddress
    )
        external
        payable
        hasEenoughAmountListed(
            _tokenId,
            _contractAddress,
            address(this),
            _amount
        )
        isListed(_tokenId, _contractAddress)
        isSetPrice(_tokenId, _contractAddress)
    {
        if (
            !idMarketItemsByContract[_contractAddress][_tokenId].isSecondarySale
        ) {
            primarySale(
                msg.value,
                msg.sender,
                _tokenId,
                _amount,
                _contractAddress
            );
            return;
        }

        secondarySale(
            msg.value,
            msg.sender,
            _tokenId,
            _amount,
            _contractAddress
        );
    }

    /**
     * Acquire a listed MGD Auction market.
     * @notice Function will fail if the token was not listed to the auction market.
     * @dev This function is specific for the auction market. Because in this case
     * the function will be called internally from the MGDAuction contract. So is
     * not possible to get the msg.value. Then we're receiving the value by param.
     * For the auction market we have a second purchaseNft function. See below.
     * @param _tokenId The token ID of the the token to acquire.
     * @param _value The value to be paid for the purchase.
     */
    function purchaseAuctionNft(
        uint256 _tokenId,
        uint256 _value,
        uint256 _amount,
        address _contractAddress
    )
        internal
        isListed(_tokenId, _contractAddress)
        isAuction(_tokenId, _contractAddress)
    {
        if (
            !idMarketItemsByContract[_contractAddress][_tokenId].isSecondarySale
        ) {
            primarySale(
                _value,
                idMarketItemsByContract[_contractAddress][_tokenId]
                    .auctionProps
                    .highestBidder,
                _tokenId,
                _amount,
                _contractAddress
            );
            return;
        }

        secondarySale(
            _value,
            idMarketItemsByContract[_contractAddress][_tokenId]
                .auctionProps
                .highestBidder,
            _tokenId,
            _amount,
            _contractAddress
        );
    }

    modifier isERC721(address _contractAddress) {
        //   // Get the interfaces that the contract supports
        bool _isERC721 = _contractAddress == mintGoldDustERC721Address;

        bool _isERC1155 = _contractAddress == mintGoldDustERC1155Address;

        // Ensure that the contract is either an ERC721 or ERC1155
        if (!_isERC1155 && !_isERC721) {
            revert MustBeERC721OrERC1155();
        }
        _;
    }

    // function isERC721(address _contractAddress) private view returns (bool) {
    //   bytes4 ERC721InterfaceID = 0x80ac58cd;
    //   return ERC165(_contractAddress).supportsInterface(ERC721InterfaceID);
    // }

    // function isERC1155(address _contractAddress) private view returns (bool) {
    //   bytes4 ERC1155InterfaceID = 0xd9b67a26;
    //   return ERC165(_contractAddress).supportsInterface(ERC1155InterfaceID);
    // }

    // function isERC721Or1155(address _contractAddress) public view returns (bool) {
    //   // Get the interfaces that the contract supports
    //   bool _isERC721 = isERC721(_contractAddress);

    //   if (_isERC721) {
    //     return true;
    //   }

    //   bool _isERC1155 = isERC1155(_contractAddress);

    //   // Ensure that the contract is either an ERC721 or ERC1155
    //   // if (!_isERC1155) {
    //   //   revert MustBeERC721OrERC1155();
    //   // }
    //   require(_isERC1155, "erro");

    //   return _isERC721;
    // }

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
            revert NotOwnerOrDoesNotHasEnoughAmountOfToken();
        }
    }

    function isNFTowner(uint256 _tokenId) internal view {
        if (
            (MintGoldDustERC721(mintGoldDustERC721Address)).ownerOf(_tokenId) !=
            msg.sender
        ) {
            revert MGDMarketplaceUnauthorized();
        }
    }

    modifier hasEenoughAmountListed(
        uint256 _tokenId,
        address _contractAddress,
        address _marketPlaceAddress,
        uint256 _amount
    ) {
        if (
            _contractAddress == mintGoldDustERC1155Address &&
            (MintGoldDustERC1155(mintGoldDustERC1155Address)).balanceOf(
                _marketPlaceAddress,
                _tokenId
            ) <
            _amount
        ) {
            revert LessItemsListedThanThePurchaseAmount();
        }
        _;
    }

    modifier isSeller(uint256 _tokenId, address _contractAddress) {
        if (
            msg.sender !=
            idMarketItemsByContract[_contractAddress][_tokenId].seller
        ) {
            revert MGDMarketplaceUnauthorized();
        }
        _;
    }

    modifier isListed(uint256 _tokenId, address _contractAddress) {
        if (
            _contractAddress == mintGoldDustERC721Address &&
            (MintGoldDustERC721(mintGoldDustERC721Address)).ownerOf(_tokenId) !=
            address(this)
        ) {
            revert MGDMarketplaceItemIsNotListed();
        }

        if (
            _contractAddress == mintGoldDustERC1155Address &&
            (MintGoldDustERC1155(mintGoldDustERC1155Address)).balanceOf(
                address(this),
                _tokenId
            ) ==
            0
        ) {
            revert MGDMarketplaceItemIsNotListed();
        }
        _;
    }

    modifier isNotListed(uint256 _tokenId, address _contractAddress) {
        if (!idMarketItemsByContract[_contractAddress][_tokenId].sold) {
            revert MGDMarketplaceItemIsAlreadyListed();
        }
        _;
    }

    modifier isSetPrice(uint256 _tokenId, address _contractAddress) {
        if (idMarketItemsByContract[_contractAddress][_tokenId].isAuction) {
            revert MGDMarketFunctionForSetPriceListedNFT();
        }
        _;
    }

    modifier isAuction(uint256 _tokenId, address _contractAddress) {
        if (!idMarketItemsByContract[_contractAddress][_tokenId].isAuction) {
            revert MGDMarketFunctionForAuctionListedNFT();
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
