// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.18;

import "./MintGoldDustMarketplace.sol";
import "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";

contract MintGoldDustSetPrice is
    MintGoldDustMarketplace,
    ReentrancyGuardUpgradeable
{
    /**
     *
     * @notice MGDAuction is a children of MintGoldDustMarketplace and this one is
     * composed by other two contracts.
     * @param _mgdCompany The contract responsible to MGD management features.
     * @param _mintGoldDustERC721Address The MGD ERC721.
     * @param _mintGoldDustERC1155Address The MGD ERC721.
     */
    function initializeChild(
        address _mgdCompany,
        address payable _mintGoldDustERC721Address,
        address payable _mintGoldDustERC1155Address
    ) public initializer {
        MintGoldDustMarketplace.initialize(
            _mgdCompany,
            _mintGoldDustERC721Address,
            _mintGoldDustERC1155Address
        );
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
        uint256 _price,
        bool _isERC721,
        uint256 _tokenAmount
    )
        public
        override
        isNFTowner(_tokenId)
        checkBalanceForERC1155(_isERC721, _tokenId, _tokenAmount)
    {
        if (_price <= 0) {
            revert MGDMarketplaceInvalidInput();
        }

        MintGoldDustNFT _mintGoldDustNFT;

        if (_isERC721) {
            _mintGoldDustNFT = MintGoldDustNFT(mintGoldDustERC721Address);
        } else {
            _mintGoldDustNFT = MintGoldDustNFT(mintGoldDustERC1155Address);
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
            _isERC721,
            _tokenAmount,
            auctionProps
        );

        /**
         * @dev Here we have an external call to the MGD ERC721 or to the
         * ERC1155 contract because of that we have the try catch.
         */
        try
            _mintGoldDustNFT.transfer(
                msg.sender,
                address(this),
                _tokenId,
                _tokenAmount
            )
        {
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
            idMarketItem[_tokenId].isERC721,
            idMarketItem[_tokenId].tokenAmount,
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
        uint256 _tokenId,
        uint256 _tokenAmount
    ) public nonReentrant isSeller(_tokenId) {
        if (idMarketItem[_tokenId].sold) {
            revert MGDMarketplaceItemIsNotListed();
        }

        if (
            !idMarketItem[_tokenId].isERC721 &&
            _tokenAmount > idMarketItem[_tokenId].tokenAmount
        ) {
            revert MGDMarketplaceItemIsNotListed();
        }

        MintGoldDustNFT _mintGoldDustNFT;

        if (idMarketItem[_tokenId].isERC721) {
            _mintGoldDustNFT = MintGoldDustNFT(mintGoldDustERC721Address);
        } else {
            _mintGoldDustNFT = MintGoldDustNFT(mintGoldDustERC1155Address);
        }

        idMarketItem[_tokenId].sold = true;

        /**
         * @dev Here we have an external call to the MGD ERC721 contract
         * because of that we have the try catch.
         */
        try
            _mintGoldDustNFT.transfer(
                address(this),
                msg.sender,
                _tokenId,
                _tokenAmount
            )
        {
            emit NftRemovedFromMarketplace(_tokenId, msg.sender);
        } catch {
            idMarketItem[_tokenId].sold = false;
            revert MGDMarketErrorToTransfer();
        }
    }
}
