// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.17;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC1155/ERC1155Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC1155/extensions/ERC1155URIStorageUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/CountersUpgradeable.sol";
import "./MGDCompany.sol";
import "./MintGoldDustNFT.sol";
import "./MGDSetPrice.sol";
import "./MGDAuction.sol";
import "./MGDMarketplace.sol";

error InsufficientTokensForSale();

contract MintGoldDustERC1155 is
    Initializable,
    ERC1155Upgradeable,
    ERC1155URIStorageUpgradeable,
    MintGoldDustNFT
{
    using CountersUpgradeable for CountersUpgradeable.Counter;
    CountersUpgradeable.Counter private _tokenIds;

    MGDCompany private _mgdCompany;
    MGDSetPrice private _mgdSetPrice;
    MGDAuction private _mgdAuction;

    mapping(uint256 => address) public tokenIdArtist;
    mapping(uint256 => uint256) public tokenIdRoyaltyPercent;
    mapping(uint256 => address[4]) public tokenCollaborators;
    mapping(uint256 => uint256[5]) public tokenIdCollaboratorsPercentage;
    mapping(uint256 => bool) public hasTokenCollaborators;
    mapping(uint256 => uint256) public tokenIdCollaboratorsQuantity;

    // Add your custom code and functions here
    /**
     *
     * @notice that the MintGoldDustERC721 is composed by other contract.
     * @param mgdCompany The contract responsible to MGD management features.
     */
    function initialize(
        address mgdCompany,
        address mintGoldDustSetPrice,
        address mintGoldDustAuction,
        string calldata baseURI
    ) public initializer {
        __ERC1155_init(baseURI);
        _mgdCompany = MGDCompany(payable(mgdCompany));
        _mgdSetPrice = MGDCompany(payable(mintGoldDustSetPrice));
        _mgdAuction = MGDCompany(payable(mintGoldDustAuction));
    }

    event NftMinted(
        uint256 indexed tokenId,
        address owner,
        string tokenURI,
        uint256 royalty
    );

    event NftSplitted(
        uint256 indexed tokenId,
        address owner,
        address[] collaborators,
        uint256[] ownersPercentage
    );

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

    function purchaseNft(
        uint256 _tokenId,
        address _nftContractAddress,
        address _marketplaceContractAddress,
        uint256 _amount
    ) public payable {
        MGDMarketplace mgdMarketplace = MGDMarketplace(
            _marketplaceContractAddress
        );
        uint256 contractBalance = balanceOf(mgdMarketplace, _tokenId);
        if (contractBalance < _amount) {
            revert InsufficientTokensForSale();
        }
        _mgdSetPrice.purchaseNft(_tokenId, address(this), _amount);
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

    function listForSetPrice(
        uint256 _tokenId,
        uint256 _price,
        uint256 _amount
    ) public override {
        _mgdSetPrice.list(_tokenId, _price, false, _amount);
    }

    function listForAuction(
        uint256 _tokenId,
        uint256 _price,
        uint256 _amount
    ) public override {
        _mgdAuction.list(_tokenId, _price, false, _amount);
    }

    /**
     * Mints a new Mint Gold Dust token.
     * @notice Fails if artist is not whitelisted or if the royalty surpass the max royalty limit
     * setted on MGDCompany smart contract.
     * @dev tokenIdArtist keeps track of the work of each artist and tokenIdRoyaltyPercent the royalty
     * percent for each art work.
     * @param _tokenURI The uri of the token metadata.
     * @param _royaltyPercent The royalty percentage for this art work.
     * @param amount The amount of tokens to be minted.
     */
    function mintNft(
        string memory _tokenURI,
        uint256 _royaltyPercent,
        uint256 amount
    ) public validPercentage(_royaltyPercent) isApproved returns (uint256) {
        _tokenIds.increment();
        uint256 newTokenId = _tokenIds.current();
        _mint(msg.sender, newTokenId, amount, "");
        _setURI(newTokenId, _tokenURI);
        tokenIdArtist[newTokenId] = msg.sender;
        tokenIdRoyaltyPercent[newTokenId] = _royaltyPercent;

        emit NftMinted(newTokenId, msg.sender, _tokenURI, _royaltyPercent);
        return newTokenId;
    }

    function splitMint(
        string calldata _tokenURI,
        uint256 _royalty,
        address[] calldata newOwners,
        uint256[] calldata ownersPercentage,
        uint256 amount
    ) public returns (uint256) {
        if (ownersPercentage.length != newOwners.length + 1) {
            revert NumberOfCollaboratorsAndPercentagesNotMatch();
        }
        uint256 _tokenId = mintNft(_tokenURI, _royalty, amount);
        uint256 ownersCount = 0;
        uint256 totalPercentage = 0; // New variable to keep track of the total percentage assigned to collaborators

        for (uint256 i = 0; i < newOwners.length; i++) {
            if (newOwners[i] != address(0)) {
                ownersCount++;
                totalPercentage += ownersPercentage[i]; // Accumulate the percentage for each valid collaborator
            }
        }

        // The array of percentages is always one number greater than the collaborators length
        // So is necessary do one more addition here
        totalPercentage += ownersPercentage[newOwners.length];

        if (totalPercentage != 100000000000000000000) {
            revert TheTotalPercentageCantBeGreaterThan100();
        }

        require(ownersCount > 1, "At least two different owners required");

        require(
            ownersCount < 5,
            "Add maximum one owner and 4 collaborators for it"
        );

        tokenIdCollaboratorsQuantity[_tokenId] = ownersCount + 1;

        // Assign new owners to the token
        for (uint256 i = 0; i < newOwners.length; i++) {
            if (newOwners[i] != address(0)) {
                tokenCollaborators[_tokenId][i] = newOwners[i];
                tokenIdCollaboratorsPercentage[_tokenId][i] = ownersPercentage[
                    i
                ];
            }
        }

        tokenIdCollaboratorsPercentage[_tokenId][
            ownersCount
        ] = ownersPercentage[ownersCount];

        hasTokenCollaborators[_tokenId] = true;
        emit NftSplitted(_tokenId, msg.sender, newOwners, ownersPercentage);

        return _tokenId;
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
}
