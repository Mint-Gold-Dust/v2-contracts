// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.17;

import "@openzeppelin/contracts/utils/Counters.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721Receiver.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/utils/introspection/ERC165Upgradeable.sol";
import "./MGDCompany.sol";
import "./MintGoldDustERC721.sol";
import "./MintGoldDustNFT.sol";

error MGDMarketplaceIncorrectAmountSent();
error MGDMarketplaceItemIsNotListed();
error MGDMarketplaceItemIsAlreadyListed();
error MGDMarketplaceUnauthorized();
error MGDMarketplaceTokenForSecondSale();
error MGDMarketplaceInvalidInput();
error MGDMarketErrorToTransfer();
error MGDMarketFunctionForSetPriceListedNFT();
error MGDMarketFunctionForAuctionListedNFT();

/// @title An abstract contract responsible to define some general responsibilites related with
/// a marketplace for its childrens.
/// @notice Contain a general function for purchases in primary and secondary sales
/// and also a virtual function that each children should have a specif implementation.
/// @author Mint Gold Dust LLC
/// @custom:contact klvh@mintgolddust.io
abstract contract MGDMarketplace is Initializable, ERC165Upgradeable {
    using Counters for Counters.Counter;
    Counters.Counter public itemsSold;

    MGDCompany internal _mgdCompany;
    MintGoldDustERC721 internal _mgdNft;

    mapping(uint256 => MarketItem) public idMarketItem;

    /**
     *
     * @notice MGDMarketplace is composed by other two contracts.
     * @param mgdCompany The contract responsible to MGD management features.
     * @param mintGoldDustERC721 The MGD ERC721.
     */
    function initialize(
        address mgdCompany,
        address mintGoldDustERC721
    ) public virtual initializer {
        _mgdCompany = MGDCompany(payable(mgdCompany));
        _mgdNft = MintGoldDustERC721(payable(mintGoldDustERC721));

        // Calculate the interface IDs for ERC721 and ERC1155
        bytes4 erc721InterfaceId = 0x80ac58cd; // ERC721 interface ID
        bytes4 erc1155InterfaceId = 0xd9b67a26; // ERC1155 interface ID

        // Register the supported interfaces
        _registerInterface(erc721InterfaceId);
        _registerInterface(erc1155InterfaceId);
    }

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
        uint256 _amount
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
        address _contract
    ) private {
        uint256 price = idMarketItem[_tokenId].price;
        if (_value != price) {
            revert MGDMarketplaceIncorrectAmountSent();
        }

        idMarketItem[_tokenId].sold = true;
        idMarketItem[_tokenId].isSecondarySale = true;
        itemsSold.increment();

        uint256 fee;
        uint256 collFee;
        uint256 balance;

        fee = (_value * _mgdCompany.primarySaleFeePercent()) / (100 * 10 ** 18);
        collFee = (_value * _mgdCompany.collectorFee()) / (100 * 10 ** 18);
        balance = _value - (fee + collFee);

        if (_mgdNft.hasTokenCollaborators(_tokenId)) {
            try _mgdNft.transfer(address(this), _sender, _tokenId) {
                splittedSale(balance, _tokenId, idMarketItem[_tokenId].seller);
            } catch {
                idMarketItem[_tokenId].sold = false;
                idMarketItem[_tokenId].isSecondarySale = false;
                itemsSold.decrement();
                revert MGDMarketErrorToTransfer();
            }
        } else {
            try _mgdNft.transfer(address(this), _sender, _tokenId) {
                payable(idMarketItem[_tokenId].seller).transfer(balance);
                emit NftPurchasedPrimaryMarket(
                    _tokenId,
                    idMarketItem[_tokenId].seller,
                    _sender,
                    price,
                    fee,
                    collFee,
                    idMarketItem[_tokenId].isAuction
                );
            } catch {
                idMarketItem[_tokenId].sold = false;
                idMarketItem[_tokenId].isSecondarySale = false;
                itemsSold.decrement();
                revert MGDMarketErrorToTransfer();
            }
        }

        payable(_mgdCompany.owner()).transfer(collFee + fee);
    }

    function splittedSale(
        uint256 _balance,
        uint256 _tokenId,
        address _artist
    ) private {
        uint256 _tokenIdCollaboratorsQuantity = _mgdNft
            .tokenIdCollaboratorsQuantity(_tokenId);

        uint256 balanceSplitPart = (_balance *
            _mgdNft.tokenIdCollaboratorsPercentage(_tokenId, 0)) /
            (100 * 10 ** 18);
        payable(_artist).transfer(balanceSplitPart);
        for (uint256 i = 1; i < _tokenIdCollaboratorsQuantity; i++) {
            balanceSplitPart =
                (_balance *
                    _mgdNft.tokenIdCollaboratorsPercentage(_tokenId, i)) /
                (100 * 10 ** 18);
            payable(_mgdNft.tokenCollaborators(_tokenId, i - 1)).transfer(
                balanceSplitPart
            );
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
        address _contract
    ) private {
        MintGoldDustNFT mintGoldDustNFT = MintGoldDustNFT(_contract);
        uint256 price = idMarketItem[_tokenId].price;
        if (_value != price) {
            revert MGDMarketplaceIncorrectAmountSent();
        }
        idMarketItem[_tokenId].sold = true;
        itemsSold.increment();

        uint256 fee;
        uint256 royalty;
        uint256 balance;

        fee =
            (_value * _mgdCompany.secondarySaleFeePercent()) /
            (100 * 10 ** 18);
        royalty =
            (_value * _mgdNft.tokenIdRoyaltyPercent(_tokenId)) /
            (100 * 10 ** 18);

        balance = _value - (fee + royalty);

        if (_mgdNft.hasTokenCollaborators(_tokenId)) {
            try mintGoldDustNFT.transfer(address(this), _sender, _tokenId) {
                splittedSale(
                    royalty,
                    _tokenId,
                    _mgdNft.tokenIdArtist(_tokenId)
                );
            } catch {
                idMarketItem[_tokenId].sold = false;
                itemsSold.decrement();
                revert MGDMarketErrorToTransfer();
            }
        } else {
            try mintGoldDustNFT.transfer(address(this), _sender, _tokenId) {
                payable(_mgdNft.tokenIdArtist(_tokenId)).transfer(royalty);
                emit NftPurchasedSecondaryMarket(
                    _tokenId,
                    idMarketItem[_tokenId].seller,
                    _sender,
                    price,
                    _mgdNft.tokenIdRoyaltyPercent(_tokenId),
                    royalty,
                    _mgdNft.tokenIdArtist(_tokenId),
                    fee,
                    idMarketItem[_tokenId].isAuction
                );
            } catch {
                idMarketItem[_tokenId].sold = false;
                itemsSold.decrement();
                revert MGDMarketErrorToTransfer();
            }
        }
        payable(_mgdCompany.owner()).transfer(fee);
        payable(idMarketItem[_tokenId].seller).transfer(balance);
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
        address _contract,
        uint256 _amount
    ) external payable isListed(_tokenId) isSetPrice(_tokenId) {
        if (!idMarketItem[_tokenId].isSecondarySale) {
            primarySale(msg.value, msg.sender, _tokenId, _amount, _contract);
            return;
        }

        secondarySale(msg.value, msg.sender, _tokenId, _amount, _contract);
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
    function purchaseNft(
        uint256 _tokenId,
        uint256 _value
    ) internal isListed(_tokenId) isAuction(_tokenId) {
        if (!idMarketItem[_tokenId].isSecondarySale) {
            primarySale(
                _value,
                idMarketItem[_tokenId].auctionProps.highestBidder,
                _tokenId
            );
            return;
        }

        secondarySale(
            _value,
            idMarketItem[_tokenId].auctionProps.highestBidder,
            _tokenId
        );
    }

    modifier isSeller(uint256 _tokenId) {
        if (msg.sender != idMarketItem[_tokenId].seller) {
            revert MGDMarketplaceUnauthorized();
        }
        _;
    }

    modifier isNFTowner(uint256 _tokenId) {
        if (_mgdNft.ownerOf(_tokenId) != msg.sender) {
            revert MGDMarketplaceUnauthorized();
        }
        _;
    }

    modifier isListed(uint256 _tokenId) {
        if (_mgdNft.ownerOf(_tokenId) != address(this)) {
            revert MGDMarketplaceItemIsNotListed();
        }
        _;
    }

    modifier isNotListed(uint256 _tokenId) {
        if (!idMarketItem[_tokenId].sold) {
            revert MGDMarketplaceItemIsAlreadyListed();
        }
        _;
    }

    modifier isSetPrice(uint256 _tokenId) {
        if (idMarketItem[_tokenId].isAuction) {
            revert MGDMarketFunctionForSetPriceListedNFT();
        }
        _;
    }

    modifier isAuction(uint256 _tokenId) {
        if (!idMarketItem[_tokenId].isAuction) {
            revert MGDMarketFunctionForAuctionListedNFT();
        }
        _;
    }

    /// @notice Fallbacks will forward funds to Mint Gold Dust LLC
    fallback() external payable {
        payable(_mgdCompany.owner()).transfer(msg.value);
    }

    /// @notice Fallbacks will forward funds to Mint Gold Dust LLC
    receive() external payable {
        payable(_mgdCompany.owner()).transfer(msg.value);
    }
}
