// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.18;

import "./MGDMarketplace.sol";

contract MGDSetPrice is MGDMarketplace {
    constructor(
        address mgdCompany,
        address mgdNft
    ) MGDMarketplace(mgdCompany, mgdNft) {}

    function list(
        uint256 _tokenId,
        uint256 _price
    ) public override isArtist(_tokenId) isNFTowner(_tokenId) {
        if (_price <= 0) {
            revert MGDMarketplaceInvalidInput();
        }

        AuctionProps memory auctionProps = AuctionProps(
            0,
            payable(address(0)),
            payable(address(0)),
            false,
            false
        );

        idMarketItem[_tokenId] = MarketItem(
            _tokenId,
            payable(msg.sender),
            _price,
            false,
            false,
            true,
            auctionProps
        );

        _mgdNft.transfer(msg.sender, address(this), _tokenId);

        emit NftListedToSetPrice(_tokenId, payable(msg.sender), _price);
    }

    /**
     * Updates already listed NFT
     * @notice Only seller can call this function
     * @param _tokenId The token ID of the the token to update
     * @param _price The price of the NFT
     */
    function updateListedNft(
        uint256 _tokenId,
        uint256 _price
    ) public isListed(_tokenId) isSeller(_tokenId) {
        if (_price <= 0) {
            revert MGDMarketplaceInvalidInput();
        }

        idMarketItem[_tokenId] = MarketItem(
            _tokenId,
            payable(msg.sender),
            _price,
            false,
            false,
            true,
            idMarketItem[_tokenId].auctionProps
        );

        emit NftListedItemUpdated(_tokenId, msg.sender, _price);
    }

    /**
     * Delist NFT from marketplace
     * @notice Only seller can call this function
     * @param _tokenId The token ID of the the token to delist
     */
    function delistNft(uint256 _tokenId) public isSeller(_tokenId) {
        idMarketItem[_tokenId].sold = true;
        incrementItemsSold();
        _mgdNft.transfer(address(this), msg.sender, _tokenId);
        emit NftRemovedFromMarketplace(_tokenId, msg.sender);
    }
}
