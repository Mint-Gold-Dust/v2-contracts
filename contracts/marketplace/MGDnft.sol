// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.18;

import "@openzeppelin/contracts/utils/Counters.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "./MGDCompany.sol";

error MGDnftRoyaltyInvalidPercentage();
error MGDnftUnauthorized();

/// @title A contract responsible by mint and transfer Mint Gold Dust ERC721 tokens.
/// @notice Contains functions to mint and transfer MGD ERC721 tokens.
/// @author Mint Gold Dust LLC
/// @custom:contact klvh@mintgolddust.io
contract MGDnft is ERC721URIStorage {
    using Counters for Counters.Counter;
    Counters.Counter private _tokenIds;

    MGDCompany private _mgdCompany;

    mapping(uint256 => address) public tokenIdArtist;
    mapping(uint256 => uint256) public tokenIdRoyaltyPercent;

    /**
     *
     * @notice that the MGDnft is composed by other contract.
     * @param mgdCompany The contract responsible to MGD management features.
     */
    constructor(address mgdCompany) ERC721("Mint Gold Dust NFT", "MGDNFT") {
        _mgdCompany = MGDCompany(payable(mgdCompany));
    }

    event NftMinted(
        uint256 indexed tokenId,
        address owner,
        string tokenURI,
        uint256 royalty
    );

    /**
     * @dev the _transfer function is an internal function of ERC721. And because of the
     * necessity of call this function from other contract by composition we did need to
     * create this public function.
     * @param _from sender of the token.
     * @param _to token destionation.
     * @param _tokenId id of the token.
     */
    function transfer(address _from, address _to, uint256 _tokenId) public {
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
        string memory _tokenURI,
        uint256 _royaltyPercent
    ) public validPercentage(_royaltyPercent) isApproved returns (uint256) {
        _tokenIds.increment();
        uint256 newTokenId = _tokenIds.current();
        _safeMint(msg.sender, newTokenId);
        _setTokenURI(newTokenId, _tokenURI);
        tokenIdArtist[newTokenId] = msg.sender;
        tokenIdRoyaltyPercent[newTokenId] = _royaltyPercent;

        emit NftMinted(newTokenId, msg.sender, _tokenURI, _royaltyPercent);
        return newTokenId;
    }

    modifier validPercentage(uint256 percentage) {
        if (percentage > _mgdCompany.maxRoyalty()) {
            revert MGDnftRoyaltyInvalidPercentage();
        }
        _;
    }

    modifier isApproved() {
        if (_mgdCompany.isArtistApproved(msg.sender) == false) {
            revert MGDnftUnauthorized();
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
