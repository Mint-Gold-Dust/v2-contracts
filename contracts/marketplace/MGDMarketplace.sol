// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.18;

import "@openzeppelin/contracts/utils/Counters.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721Receiver.sol";
import "./MGDCompany.sol";
import "./IMGDMarketplace.sol";
import "./MGDnft.sol";

error MGDMarketplaceIncorrectAmountSent();
error MGDMarketplaceSaleNotConcluded();
error MGDMarketplaceItemIsNotListed();
error MGDMarketplaceUnauthorized();
error MGDMarketplaceInvalidInput();
error MGDMarketplaceTokenForSecondSale();

abstract contract MGDMarketplace is IMGDMarketplace {
    using Counters for Counters.Counter;
    Counters.Counter public _itemsSold;

    MGDCompany internal _mgdCompany;
    MGDnft internal _mgdNft;

    mapping(uint256 => MarketItem) public idMarketItem;

    constructor(address mgdCompany, address mgdNft) {
        _mgdCompany = MGDCompany(mgdCompany);
        _mgdNft = MGDnft(mgdNft);
    }

    struct MarketItem {
        uint256 tokenId;
        address seller;
        uint256 price;
        bool sold;
        bool isAuction;
        bool isPrimarySale;
        AuctionProps auctionProps;
    }

    struct AuctionProps {
        uint256 endTime;
        address highestBidder;
        address highestBid;
        bool cancelled;
        bool ended;
    }

    function list(uint256 _tokenId, uint256 _price) public virtual;

    function primarySale(
        uint256 _value,
        uint256 _tokenId
    ) private isListed(_tokenId) {
        uint256 price = idMarketItem[_tokenId].price;
        if (msg.value != price) {
            revert MGDMarketplaceIncorrectAmountSent();
        }

        uint256 fee;
        uint256 collFee;
        uint256 balance;

        fee = (_value * _mgdCompany.primarySaleFeePercent()) / (100 * 10 ** 18);
        collFee = (_value * _mgdCompany.collectorFee()) / (100 * 10 ** 18);
        balance = _value - (fee + collFee);

        idMarketItem[_tokenId].isPrimarySale = false;

        payable(_mgdCompany.owner()).transfer(collFee);

        emit NftPurchasedPrimaryMarket(
            _tokenId,
            idMarketItem[_tokenId].seller,
            msg.sender,
            price,
            fee,
            collFee
        );

        payable(_mgdCompany.owner()).transfer(fee);
        payable(idMarketItem[_tokenId].seller).transfer(balance);

        _mgdNft.transfer(address(this), msg.sender, _tokenId);
    }

    function secondarySale(uint256 _value, uint256 _tokenId) private {
        uint256 price = idMarketItem[_tokenId].price;
        if (msg.value != price) {
            revert MGDMarketplaceIncorrectAmountSent();
        }
        idMarketItem[_tokenId].sold = true;
        _itemsSold.increment();

        uint256 fee;
        uint256 collFee;
        uint256 royalty;
        uint256 balance;

        fee =
            (_value * _mgdCompany.secondarySaleFeePercent()) /
            (100 * 10 ** 18);
        royalty =
            (_value * _mgdNft.tokenIdRoyaltyPercent(_tokenId)) /
            (100 * 10 ** 18);

        balance = _value - (fee + royalty);

        payable(idMarketItem[_tokenId].seller).transfer(royalty);

        emit NftPurchasedSecondaryMarket(
            _tokenId,
            idMarketItem[_tokenId].seller,
            msg.sender,
            price,
            _mgdNft.tokenIdRoyaltyPercent(_tokenId),
            royalty,
            _mgdNft.tokenIdArtist(_tokenId),
            fee,
            collFee
        );

        payable(_mgdCompany.owner()).transfer(fee);
        payable(idMarketItem[_tokenId].seller).transfer(balance);
        _mgdNft.transfer(address(this), msg.sender, _tokenId);
    }

    /**
     * Acquire a listed NFT
     * Primary fee percentage from primary sale is charged by the platform
     * Secondary fee percentage from secondary sale is charged by the platform while royalty is sent to artist
     * @notice Function will fail is artist has marked NFT as restricted
     * @param _tokenId The token ID of the the token to acquire
     */
    function purchaseNft(uint256 _tokenId) public payable {
        if (idMarketItem[_tokenId].isPrimarySale == true) {
            primarySale(msg.value, _tokenId);
            return;
        }

        secondarySale(msg.value, _tokenId);
    }

    function incrementItemsSold() internal {
        _itemsSold.increment();
    }

    //   modifier isListed(uint256 _tokenId) {
    //     if (idMarketItem[_tokenId].sold == true) {
    //       revert MGDMarketplaceItemIsNotListed();
    //     }
    //     _;
    //   }

    modifier isSeller(uint256 _tokenId) {
        if (
            msg.sender == idMarketItem[_tokenId].seller ||
            _mgdCompany.isAddressValidator(msg.sender) == true
        ) {
            _;
        } else {
            revert MGDMarketplaceUnauthorized();
        }
    }

    modifier isArtist(uint256 _tokenId) {
        if (
            _mgdNft.tokenIdArtist(_tokenId) == msg.sender ||
            _mgdCompany.isAddressValidator(msg.sender) == true
        ) {
            _;
        } else {
            revert MGDMarketplaceUnauthorized();
        }
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

    modifier isPrimarySale(uint256 _tokenId) {
        if (!idMarketItem[_tokenId].isPrimarySale) {
            revert MGDMarketplaceTokenForSecondSale();
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