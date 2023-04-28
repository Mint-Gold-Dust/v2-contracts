// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.17;

import "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";
import "./MGDMarketplace.sol";

/// @title A contract responsible by the Set Price Market functionalities
/// @notice Contains functions for list, update a listed item and delist an item.
/// @author Mint Gold Dust LLC
/// @custom:contact klvh@mintgolddust.io
contract MGDSetPrice is MGDMarketplace, ReentrancyGuardUpgradeable {
    /**
     *
     * @notice MGDSetPrice is a children of MGDMarketplace and this one is
     * composed by other two contracts.
     * @param mgdCompany The contract responsible to MGD management features.
     * @param mgdNft The MGD ERC721.
     */
    function initialize(
        address mgdCompany,
        address mgdNft
    ) public override initializer {
        MGDMarketplace.initialize(mgdCompany, mgdNft);
        __ReentrancyGuard_init();
    }

    event NftListedToSetPrice(
        uint256 indexed tokenId,
        address seller,
        uint256 price
    );

    event NftListedItemUpdated(
        uint256 indexed tokenId,
        address seller,
        uint256 price
    );

    event NftRemovedFromMarketplace(uint256 indexed tokenId, address seller);

    /**
     *
     * @notice Only the owner of the NFT can call this function.
     * @dev This is an implementation of a virtual function declared in the father
     * contract. Here we're listing an NFT to the Set Price MGD Market that the item has
     * a fixed price. After that the user can update the price of this item or if necessary
     * delist it. After delist is possible to list again here of for auction.
     * @param _tokenId The id of the NFT token to be listed.
     * @param _price  The respective price that the seller wants to list this item.
     */
    function list(
        uint256 _tokenId,
        uint256 _price
    ) public override isNFTowner(_tokenId) {
        if (_price <= 0) {
            revert MGDMarketplaceInvalidInput();
        }

        AuctionProps memory auctionProps = AuctionProps(
            0,
            address(0),
            0,
            false,
            false
        );

        idMarketItem[_tokenId] = MarketItem(
            _tokenId,
            msg.sender,
            _price,
            false,
            false,
            idMarketItem[_tokenId].isSecondarySale,
            auctionProps
        );

        /**
         * @dev Here we have an external call to the MGD ERC721 contract
         * because of that we have the try catch.
         */
        try _mgdNft.transfer(msg.sender, address(this), _tokenId) {
            emit NftListedToSetPrice(_tokenId, msg.sender, _price);
        } catch {
            revert MGDMarketErrorToTransfer();
        }
    }

    /**
     * Updates an already listed NFT
     * @notice Only seller can call this function and this item must be
     * listed.
     * @dev The intention here is allow a user update the price of a
     * Market Item struct.
     * @param _tokenId The token ID of the the token to update.
     * @param _price The price of the NFT.
     */
    function updateListedNft(
        uint256 _tokenId,
        uint256 _price
    ) public isListed(_tokenId) isSeller(_tokenId) {
        if (_price <= 0) {
            revert MGDMarketplaceInvalidInput();
        }

        idMarketItem[_tokenId] = MarketItem(
            idMarketItem[_tokenId].tokenId,
            idMarketItem[_tokenId].seller,
            _price,
            idMarketItem[_tokenId].sold,
            idMarketItem[_tokenId].isAuction,
            idMarketItem[_tokenId].isSecondarySale,
            idMarketItem[_tokenId].auctionProps
        );

        emit NftListedItemUpdated(_tokenId, msg.sender, _price);
    }

    /**
     * Delist NFT from marketplace
     * @notice Only seller can call this function
     * @dev Here we transfer back the token id to the seller that is
     * really the owner of the item. And set the sold attribute to true.
     * This in conjunction with the fact that this contract address is not more the
     * owner of the item, means that the item is not listed.
     * @param _tokenId The token ID of the the token to delist
     */
    function delistNft(
        uint256 _tokenId
    ) public nonReentrant isSeller(_tokenId) {
        if (idMarketItem[_tokenId].sold) {
            revert MGDMarketplaceItemIsNotListed();
        }

        idMarketItem[_tokenId].sold = true;
        /**
         * @dev Here we have an external call to the MGD ERC721 contract
         * because of that we have the try catch.
         */
        try _mgdNft.transfer(address(this), msg.sender, _tokenId) {
            emit NftRemovedFromMarketplace(_tokenId, msg.sender);
        } catch {
            idMarketItem[_tokenId].sold = false;
            revert MGDMarketErrorToTransfer();
        }
    }
}
