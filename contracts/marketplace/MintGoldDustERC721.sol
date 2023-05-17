// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.18;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC721/ERC721Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC721/extensions/ERC721URIStorageUpgradeable.sol";
import "./MGDCompany.sol";
import "./MintGoldDustNFT.sol";
import "./MGDAuction.sol";

/// @title A contract responsible by mint and transfer Mint Gold Dust ERC721 tokens.
/// @notice Contains functions to mint and transfer MGD ERC721 tokens.
/// @author Mint Gold Dust LLC
/// @custom:contact klvh@mintgolddust.io

contract MintGoldDustERC721 is
    ERC721Upgradeable,
    ERC721URIStorageUpgradeable,
    MintGoldDustNFT
{
    /**
     *
     * @notice that the MintGoldDustERC721 is composed by other contract.
     * @param _mgdCompany The contract responsible to MGD management features.
     */
    function initializeChild(address _mgdCompany) public initializer {
        __ERC721_init("Mint Gold Dust NFT", "MGDNFT");
        super.initialize(_mgdCompany);
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
     */
    function transfer(
        address _from,
        address _to,
        uint256 _tokenId,
        uint256 _amount
    ) public override {
        _transfer(_from, _to, _tokenId);
    }

    /**
     * Mints a new Mint Gold Dust token.
     * @notice Fails if artist is not whitelisted or if the royalty surpass the max royalty limit
     * setted on MGDCompany smart contract.
     * @dev tokenIdArtist keeps track of the work of each artist and tokenIdRoyaltyPercent the royalty
     * percent for each art work.
     * @param _tokenURI The uri of the the token metadata.
     * @param _royaltyPercent The royalty percentage for this art work.
     */
    function mintNft(
        string calldata _tokenURI,
        uint256 _royaltyPercent,
        uint256 _amount
    )
        public
        payable
        override
        validPercentage(_royaltyPercent)
        isApproved
        returns (uint256)
    {
        _tokenIds.increment();
        uint256 newTokenId = _tokenIds.current();
        _safeMint(msg.sender, newTokenId);
        _setTokenURI(newTokenId, _tokenURI);
        tokenIdArtist[newTokenId] = msg.sender;
        tokenIdRoyaltyPercent[newTokenId] = _royaltyPercent;

        emit NftMinted(newTokenId, msg.sender, _royaltyPercent, 1);
        return newTokenId;
    }

    function _burn(
        uint256 tokenId
    ) internal override(ERC721Upgradeable, ERC721URIStorageUpgradeable) {
        super._burn(tokenId);
    }

    function tokenURI(
        uint256 tokenId
    )
        public
        view
        override(ERC721Upgradeable, ERC721URIStorageUpgradeable)
        returns (string memory)
    {
        return super.tokenURI(tokenId);
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
