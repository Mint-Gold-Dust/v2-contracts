// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.18;

import "@openzeppelin/contracts/utils/Counters.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721Receiver.sol";
import "./MGDCompany.sol";
import "./MGDnft.sol";

error MGDMarketplaceIncorrectAmountSent();
error MGDMarketplaceItemIsNotListed();
error MGDMarketplaceItemIsAlreadyListed();
error MGDMarketplaceUnauthorized();
error MGDMarketplaceTokenForSecondSale();
error MGDMarketplaceInvalidInput();
error MGDMarketErrorToTransfer();

error MGDMarketFunctionForSetPriceListedNFT();
error MGDMarketFunctionForAuctionListedNFT();

abstract contract MGDMarketplace {
    using Counters for Counters.Counter;
    Counters.Counter public itemsSold;

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
        bool isSecondarySale;
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
        uint256 collectorFeeAmount
    );

    event NftPurchasedSecondaryMarket(
        uint256 indexed tokenId,
        address seller,
        address newOwner,
        uint256 buyPrice,
        uint256 royaltyPercent,
        uint256 royaltyAmount,
        address royaltyRecipient,
        uint256 feeAmount
    );

    function list(uint256 _tokenId, uint256 _price) public virtual;

    function primarySale(
        uint256 _value,
        address _sender,
        uint256 _tokenId
    ) private {
        uint256 price = idMarketItem[_tokenId].price;
        if (_value != price) {
            revert MGDMarketplaceIncorrectAmountSent();
        }

        idMarketItem[_tokenId].sold = true;
        itemsSold.increment();

        uint256 fee;
        uint256 collFee;
        uint256 balance;

        fee = (_value * _mgdCompany.primarySaleFeePercent()) / (100 * 10 ** 18);
        collFee = (_value * _mgdCompany.collectorFee()) / (100 * 10 ** 18);
        balance = _value - (fee + collFee);

        idMarketItem[_tokenId].isSecondarySale = true;

        payable(_mgdCompany.owner()).transfer(collFee);

        emit NftPurchasedPrimaryMarket(
            _tokenId,
            idMarketItem[_tokenId].seller,
            _sender,
            price,
            fee,
            collFee
        );

        payable(_mgdCompany.owner()).transfer(fee);
        payable(idMarketItem[_tokenId].seller).transfer(balance);

        _mgdNft.transfer(address(this), _sender, _tokenId);
    }

    function secondarySale(
        uint256 _value,
        address _sender,
        uint256 _tokenId
    ) private {
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

        payable(_mgdNft.tokenIdArtist(_tokenId)).transfer(royalty);

        emit NftPurchasedSecondaryMarket(
            _tokenId,
            idMarketItem[_tokenId].seller,
            _sender,
            price,
            _mgdNft.tokenIdRoyaltyPercent(_tokenId),
            royalty,
            _mgdNft.tokenIdArtist(_tokenId),
            fee
        );

        payable(_mgdCompany.owner()).transfer(fee);
        payable(idMarketItem[_tokenId].seller).transfer(balance);
        _mgdNft.transfer(address(this), _sender, _tokenId);
    }

    /**
     * Acquire a listed NFT to Set Price market
     * Primary fee percentage from primary sale is charged by the platform
     * Secondary fee percentage from secondary sale is charged by the platform while royalty is sent to artist
     * @notice Function will fail is artist has marked NFT as restricted
     * @param _tokenId The token ID of the the token to acquire
     */
    function purchaseNft(
        uint256 _tokenId
    ) public payable isListed(_tokenId) isSetPrice(_tokenId) {
        if (!idMarketItem[_tokenId].isSecondarySale) {
            primarySale(msg.value, msg.sender, _tokenId);
            return;
        }

        secondarySale(msg.value, msg.sender, _tokenId);
    }

    /**
     * Acquire a listed NFT to auction
     * Primary fee percentage from primary sale is charged by the platform
     * Secondary fee percentage from secondary sale is charged by the platform while royalty is sent to artist
     * @notice Function will fail is artist has marked NFT as restricted
     * @param _tokenId The token ID of the the token to acquire
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
        if (
            msg.sender == idMarketItem[_tokenId].seller ||
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

    modifier isNotListed(uint256 _tokenId) {
        if (!idMarketItem[_tokenId].sold) {
            revert MGDMarketplaceItemIsAlreadyListed();
        }
        _;
    }

    modifier isPrimarySale(uint256 _tokenId) {
        if (idMarketItem[_tokenId].isSecondarySale) {
            revert MGDMarketplaceTokenForSecondSale();
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
