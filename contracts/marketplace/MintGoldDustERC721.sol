// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.18;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC721/ERC721Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC721/extensions/ERC721URIStorageUpgradeable.sol";
import "./MintGoldDustCompany.sol";
import "./MintGoldDustNFT.sol";
import "./MintGoldDustMarketplaceAuction.sol";

/// @title A contract responsible by mint and transfer Mint Gold Dust ERC721 tokens.
/// @notice Contains functions to mint and transfer MGD ERC721 tokens.
/// @author Mint Gold Dust LLC
/// @custom:contact klvh@mintgolddust.io

contract MintGoldDustERC721 is ERC721URIStorageUpgradeable, MintGoldDustNFT {
    /**
     *
     * @notice that the MintGoldDustERC721 is composed by other contract.
     * @param _mintGoldDustCompany The contract responsible to MGD management features.
     */
    function initializeChild(address _mintGoldDustCompany) public initializer {
        __ERC721_init("Mint Gold Dust NFT", "MGDNFT");
        super.initialize(_mintGoldDustCompany);
    }

    using Counters for Counters.Counter;
    Counters.Counter public _tokenIds;

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
    ) public override whenNotPaused {
        _transfer(_from, _to, _tokenId);
    }

    function executeMintFlow(
        string calldata _tokenURI,
        uint256 _royaltyPercent,
        uint256 _amount,
        address _sender,
        uint256 _collectorMintId,
        bytes calldata _memoir
    ) internal override returns (uint256) {
        isApproved(_sender);
        _tokenIds.increment();
        uint256 newTokenId = _tokenIds.current();
        _safeMint(_sender, newTokenId);
        _setTokenURI(newTokenId, _tokenURI);
        tokenIdArtist[newTokenId] = _sender;
        tokenIdRoyaltyPercent[newTokenId] = _royaltyPercent;

        //mintGoldDustMemoir.addMemoirForContract(address(this), newTokenId, _memoir);

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

    function tokenURI(
        uint256 tokenId
    )
        public
        view
        override(ERC721URIStorageUpgradeable)
        whenNotPaused
        returns (string memory)
    {
        return super.tokenURI(tokenId);
    }

    /// @notice Fallbacks will forward funds to Mint Gold Dust LLC
    fallback() external payable {
        payable(mintGoldDustCompany.owner()).transfer(msg.value);
    }

    /// @notice Fallbacks will forward funds to Mint Gold Dust LLC
    receive() external payable {
        payable(mintGoldDustCompany.owner()).transfer(msg.value);
    }
}
