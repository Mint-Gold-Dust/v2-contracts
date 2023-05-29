// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.18;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC1155/ERC1155Upgradeable.sol";
import "@openzeppelin/contracts/token/ERC1155/extensions/ERC1155URIStorage.sol";

import "@openzeppelin/contracts-upgradeable/token/ERC1155/extensions/ERC1155URIStorageUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/CountersUpgradeable.sol";
import "./MintGoldDustCompany.sol";
import "./MintGoldDustNFT.sol";
import "./MintGoldDustMarketplaceAuction.sol";
import "./MintGoldDustMarketplace.sol";

contract MintGoldDustERC1155 is
    Initializable,
    ERC1155Upgradeable,
    ERC1155URIStorageUpgradeable,
    MintGoldDustNFT
{
    // Add your custom code and functions here
    /**
     *
     * @notice that the MintGoldDustERC721 is composed by other contract.
     * @param _mgdCompany The contract responsible to MGD management features.
     */
    function initializeChild(
        address _mgdCompany,
        string calldata baseURI
    ) public initializer {
        __ERC1155_init(baseURI);
        MintGoldDustNFT.initialize(_mgdCompany);
    }

    using Counters for Counters.Counter;
    Counters.Counter public _tokenIds;

    function uri(
        uint256 tokenId
    )
        public
        view
        virtual
        override(ERC1155Upgradeable, ERC1155URIStorageUpgradeable)
        returns (string memory)
    {
        return super.uri(tokenId);
    }

    /**
     * @dev The transfer function wraps the safeTransferFrom function of ERC1155.
     * @param from Sender of the token.
     * @param to Token destination.
     * @param tokenId ID of the token.
     * @param amount Amount of tokens to be transferred.
     */
    function transfer(
        address from,
        address to,
        uint256 tokenId,
        uint256 amount
    ) public override {
        safeTransferFrom(from, to, tokenId, amount, "");
    }

    /**
     * Mints a new Mint Gold Dust token.
     * @notice Fails if artist is not whitelisted or if the royalty surpass the max royalty limit
     * setted on MintGoldDustCompany smart contract.
     * @dev tokenIdArtist keeps track of the work of each artist and tokenIdRoyaltyPercent the royalty
     * percent for each art work.
     * @param _tokenURI The uri of the token metadata.
     * @param _royaltyPercent The royalty percentage for this art work.
     * @param _amount The amount of tokens to be minted.
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
        _mint(msg.sender, newTokenId, _amount, "");
        tokenIdArtist[newTokenId] = msg.sender;
        tokenIdRoyaltyPercent[newTokenId] = _royaltyPercent;

        emit MintGoldDustNFTMinted(
            newTokenId,
            msg.sender,
            _royaltyPercent,
            _amount,
            address(this)
        );

        return newTokenId;
    }
}