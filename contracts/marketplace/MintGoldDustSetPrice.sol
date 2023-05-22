// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.18;

import "./MintGoldDustMarketplace.sol";
import "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/token/ERC1155/IERC1155.sol";
import "@openzeppelin/contracts/token/ERC1155/IERC1155Receiver.sol";

error YouCannotDelistMoreThanListed();

contract MintGoldDustSetPrice is
    MintGoldDustMarketplace,
    ReentrancyGuardUpgradeable,
    IERC1155Receiver
{
    bytes4 private constant ERC165_ID = 0x01ffc9a7; //ERC165

    function supportsInterface(
        bytes4 interfaceId
    ) public view override returns (bool) {
        return interfaceId == ERC165_ID;
    }

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

    function onERC1155Received(
        address operator,
        address from,
        uint256 id,
        uint256 value,
        bytes calldata data
    ) external override returns (bytes4) {
        return this.onERC1155Received.selector;
    }

    function onERC1155BatchReceived(
        address operator,
        address from,
        uint256[] calldata ids,
        uint256[] calldata values,
        bytes calldata data
    ) external override returns (bytes4) {
        return this.onERC1155BatchReceived.selector;
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
        uint256 _tokenAmount,
        address _contractAddress
    ) public override isERC721(_contractAddress) {
        if (_price <= 0) {
            revert MGDMarketplaceInvalidInput();
        }

        MintGoldDustNFT _mintGoldDustNFT;
        bool _isERC721 = false;

        if (_contractAddress == mintGoldDustERC721Address) {
            isNFTowner(_tokenId);
            _mintGoldDustNFT = MintGoldDustNFT(mintGoldDustERC721Address);
            _isERC721 = true;
        } else {
            checkBalanceForERC1155(_tokenId, _tokenAmount);
            _mintGoldDustNFT = MintGoldDustNFT(mintGoldDustERC1155Address);
        }

        AuctionProps memory auctionProps = AuctionProps(
            0,
            address(0),
            0,
            false,
            false
        );

        idMarketItemsByContract[_contractAddress][_tokenId] = MarketItem(
            _tokenId,
            msg.sender,
            _price,
            false,
            false,
            idMarketItemsByContract[_contractAddress][_tokenId].isSecondarySale,
            _isERC721,
            _tokenAmount,
            auctionProps
        );

        _mintGoldDustNFT.transfer(
            msg.sender,
            address(this),
            _tokenId,
            _tokenAmount
        );

        emit NftListedToSetPrice(_tokenId, msg.sender, _price);
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
        uint256 _price,
        address _contractAddress
    )
        public
        isERC721(_contractAddress)
        isListed(_tokenId, _contractAddress)
        isSeller(_tokenId, _contractAddress)
    {
        if (_price <= 0) {
            revert MGDMarketplaceInvalidInput();
        }

        MarketItem memory _marketItem = idMarketItemsByContract[
            _contractAddress
        ][_tokenId];

        idMarketItemsByContract[_contractAddress][_tokenId] = MarketItem(
            _marketItem.tokenId,
            _marketItem.seller,
            _price,
            _marketItem.sold,
            _marketItem.isAuction,
            _marketItem.isSecondarySale,
            _marketItem.isERC721,
            _marketItem.tokenAmount,
            _marketItem.auctionProps
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
        address _contractAddress
    )
        public
        nonReentrant
        isERC721(_contractAddress)
        isListed(_tokenId, _contractAddress)
        isSeller(_tokenId, _contractAddress)
    {
        MarketItem memory _marketItem = idMarketItemsByContract[
            _contractAddress
        ][_tokenId];

        if (_marketItem.sold) {
            revert MGDMarketplaceItemIsNotListed();
        }

        MintGoldDustNFT _mintGoldDustNFT;

        if (_marketItem.isERC721) {
            _mintGoldDustNFT = MintGoldDustNFT(mintGoldDustERC721Address);
        } else {
            _mintGoldDustNFT = MintGoldDustNFT(mintGoldDustERC1155Address);
        }

        idMarketItemsByContract[_contractAddress][_tokenId].sold = true;

        /**
         * @dev Here we have an external call to the MGD ERC721 contract
         * because of that we have the try catch.
         */
        try
            _mintGoldDustNFT.transfer(
                address(this),
                msg.sender,
                _tokenId,
                _marketItem.tokenAmount
            )
        {
            emit NftRemovedFromMarketplace(_tokenId, msg.sender);
        } catch {
            idMarketItemsByContract[_contractAddress][_tokenId].sold = false;
            revert MGDMarketErrorToTransfer();
        }
    }
}
