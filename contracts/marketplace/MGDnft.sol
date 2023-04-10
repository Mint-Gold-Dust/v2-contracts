// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.18;

import "@openzeppelin/contracts/utils/Counters.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "./MGDCompany.sol";

error MGDnftRoyaltyInvalidPercentage();
error MGDnftUnauthorized();

contract MGDnft is ERC721URIStorage {
    using Counters for Counters.Counter;
    Counters.Counter private _tokenIds;

    MGDCompany private mgdCompany;

    mapping(uint256 => address) public tokenIdArtist;
    mapping(uint256 => uint256) public tokenIdRoyaltyPercent;

    constructor(address _mgdCompany) ERC721("Mint Gold Dust NFT", "MGDNFT") {
        mgdCompany = MGDCompany(_mgdCompany);
    }

    event NftMinted(
        uint256 indexed tokenId,
        address owner,
        string tokenURI,
        uint256 royalty
    );

    function transfer(address _from, address _to, uint256 _tokenId) public {
        _transfer(_from, _to, _tokenId);
    }

    /**
     * Mints a new Mint Gold Dust token and lists on the marketplace.
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
        _mint(msg.sender, newTokenId);
        _setTokenURI(newTokenId, _tokenURI);
        tokenIdArtist[newTokenId] = msg.sender;
        tokenIdRoyaltyPercent[newTokenId] = _royaltyPercent;

        emit NftMinted(newTokenId, msg.sender, _tokenURI, _royaltyPercent);
        return newTokenId;
    }

    modifier validPercentage(uint256 percentage) {
        if (percentage > mgdCompany.maxRoyalty()) {
            revert MGDnftRoyaltyInvalidPercentage();
        }
        _;
    }

    modifier isApproved() {
        if (mgdCompany.isArtistApproved(msg.sender) == false) {
            revert MGDnftUnauthorized();
        }
        _;
    }
}
