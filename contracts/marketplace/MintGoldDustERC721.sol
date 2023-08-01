// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.18;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC721/extensions/ERC721URIStorageUpgradeable.sol";
import "./MintGoldDustCompany.sol";
import "./MintGoldDustNFT.sol";
import "./MintGoldDustMarketplaceAuction.sol";

/// @title A contract responsible by mint and transfer Mint Gold Dust ERC721 tokens.
/// @notice Contains functions to mint and transfer MGD ERC721 tokens.
/// @author Mint Gold Dust LLC
/// @custom:contact klvh@mintgolddust.io

contract MintGoldDustERC721 is
    Initializable,
    ERC721URIStorageUpgradeable,
    MintGoldDustNFT
{
    using Counters for Counters.Counter;
    Counters.Counter public _tokenIds;

    /**
     *
     * @notice that the MintGoldDustERC721 is composed by other contract.
     * @param _mintGoldDustCompany The contract responsible to MGD management features.
     */
    function initializeChild(
        address _mintGoldDustCompany
    ) external initializer {
        __ERC721_init("Mint Gold Dust NFT", "MGDNFT");
        __ERC721URIStorage_init();
        MintGoldDustNFT.initialize(_mintGoldDustCompany);
    }

    /**
     * @dev the _transfer function is an internal function of ERC721. And because of the
     * necessity of call this function from other contract by composition we did need to
     * create this public function.
     * @param _from sender of the token.
     * @param _to token destionation.
     * @param _tokenId id of the token.
     * @param _amount is unused for MintGoldDustERC721.
     */
    function transfer(
        address _from,
        address _to,
        uint256 _tokenId,
        uint256 _amount
    ) external override nonReentrant {
        _safeTransfer(_from, _to, _tokenId, "");
    }

    function tokenURI(
        uint256 tokenId
    )
        public
        view
        override(ERC721URIStorageUpgradeable)
        returns (string memory)
    {
        return super.tokenURI(tokenId);
    }

    function executeMintFlow(
        string calldata _tokenURI,
        uint256 _royaltyPercent,
        uint256 _amount,
        address _sender,
        uint256 _collectorMintId,
        bytes calldata _memoir
    ) internal override isZeroAddress(_sender) returns (uint256) {
        _tokenIds.increment();
        uint256 newTokenId = _tokenIds.current();
        _safeMint(_sender, newTokenId);
        _setTokenURI(newTokenId, _tokenURI);
        tokenIdArtist[newTokenId] = _sender;
        tokenIdRoyaltyPercent[newTokenId] = _royaltyPercent;
        tokenIdMemoir[newTokenId] = _memoir;

        emit MintGoldDustNFTMinted(
            newTokenId,
            _tokenURI,
            _sender,
            _royaltyPercent,
            1,
            true,
            _collectorMintId,
            _memoir
        );
        return newTokenId;
    }

    function _burn(
        uint256 tokenId
    ) internal override(ERC721URIStorageUpgradeable) {
        super._burn(tokenId);
    }
}
