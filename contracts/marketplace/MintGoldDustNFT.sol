// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.18;

import "@openzeppelin/contracts/utils/Counters.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "./MintGoldDustCompany.sol";
import "./MintGoldDustMemoir.sol";

error MGDnftRoyaltyInvalidPercentage();
error MGDnftUnauthorized();
error NumberOfCollaboratorsAndPercentagesNotMatch();
error TheTotalPercentageCantBeGreaterThan100();

abstract contract MintGoldDustNFT is Initializable {
    // Add your custom code and functions here
    /**
     *
     * @notice that the MintGoldDustERC721 is composed by other contract.
     * @param _mintGoldDustCompany The contract responsible to MGD management features.
     */
    function initialize(
        address _mintGoldDustCompany,
        address _mintGoldDustMemoir
    ) public initializer {
        mintGoldDustCompany = MintGoldDustCompany(
            payable(_mintGoldDustCompany)
        );
        mintGoldDustMemoir = MintGoldDustMemoir((_mintGoldDustMemoir));
    }

    MintGoldDustCompany internal mintGoldDustCompany;
    MintGoldDustMemoir internal mintGoldDustMemoir;

    mapping(uint256 => address) public tokenIdArtist;
    mapping(uint256 => uint256) public tokenIdRoyaltyPercent;

    mapping(uint256 => address[4]) public tokenCollaborators;
    mapping(uint256 => uint256[5]) public tokenIdCollaboratorsPercentage;
    mapping(uint256 => bool) public hasTokenCollaborators;
    mapping(uint256 => uint256) public tokenIdCollaboratorsQuantity;

    /**
     * @notice that this is an event that contains the info for a mint.
     * @dev it will be triggered after a successfully traditional minting or split minting.
     * @param tokenId the uint256 generated for this token.
     * @param owner the address of the artist creator.
     * @param royalty the royalty percetage choosen by the artist for this token.
     * @param amount the quantity to be minted for this token.
     *    @dev for MingGoldDustERC721 this amount is always one.
     * @param contractAddress a MintGoldDustERC721 address or a MintGoldDustERC1155 address.
     */
    event MintGoldDustNFTMinted(
        uint256 indexed tokenId,
        address owner,
        uint256 royalty,
        uint256 amount,
        address contractAddress,
        bool isCollectorMint
    );

    /**
     * @notice that this is an event that contains the info for a split mint.
     * @dev it will be triggered after a successfully split minting.
     * @param tokenId the uint256 generated for this token.
     * @param collaborators an array of address that can be a number of maximum 4 collaborators.
     * @param ownersPercentage an array of uint256 that are the percetages for the artist and for each one of the collaborators.
     */
    event MintGoldDustNftMintedAndSplitted(
        uint256 indexed tokenId,
        address[] collaborators,
        uint256[] ownersPercentage
    );

    function transfer(
        address from,
        address to,
        uint256 tokenId,
        uint256 amount
    ) external virtual;

    function executeMintFlow(
        string calldata _tokenURI,
        uint256 _royaltyPercent,
        uint256 _amount,
        address _sender,
        bool isCollectorMint,
        string calldata _memoir
    ) internal virtual returns (uint256);

    /**
     * @notice that is the function responsible by the mint a new MintGoldDustNFT token.
     * @dev that is a virtual function that MUST be implemented by the NFT contracts childrens.
     * @param _tokenURI the URI that contains the metadata for the NFT.
     * @param _royaltyPercent the royalty percentage to be applied for this NFT secondary sales.
     * @param _amount the quantity to be minted for this token.
     */
    function mintNft(
        string calldata _tokenURI,
        uint256 _royaltyPercent,
        uint256 _amount,
        string calldata _memoir
    ) public payable validPercentage(_royaltyPercent) returns (uint256) {
        uint256 newTokenId = executeMintFlow(
            _tokenURI,
            _royaltyPercent,
            _amount,
            msg.sender,
            false,
            _memoir
        );

        return newTokenId;
    }

    function collectorMint(
        string calldata _tokenURI,
        uint256 _royaltyPercent,
        uint256 _amount,
        address _sender,
        string calldata _memoir
    ) public validPercentage(_royaltyPercent) returns (uint256) {
        uint256 newTokenId = executeMintFlow(
            _tokenURI,
            _royaltyPercent,
            _amount,
            _sender,
            true,
            _memoir
        );

        return newTokenId;
    }

    //   function mintNft(
    //     string calldata _tokenURI,
    //     uint256 _royalty,
    //     uint256 _amount
    //   ) public payable virtual returns (uint256);

    /**
     * @notice that is the function responsible by the mint and split a new MintGoldDustNFT token.
     * @dev that it receives two arrays one with the _newOwners that are the collaborators for this NFT
     *      and the _ownersPercentage that is the percentage of participation for each collaborators.
     *      @notice that the _newOwners array MUST always have the length equals the _ownersPercentage length minus one.
     *              it is because the fist collaborators we already have that is the creator of the NFT and is saved in
     *              the tokenIdArtist mapping.
     * @param _tokenURI the URI that contains the metadata for the NFT.
     * @param _royalty the royalty percentage to be applied for this NFT secondary sales.
     * @param _newOwners an array of address that can be a number of maximum 4 collaborators.
     * @param _ownersPercentage an array of uint256 that are the percetages for the artist and for each one of the collaborators.
     *    @dev @notice that the percetages will be applied in order that the f position 0 is the percetage for the artist and
     *                 the others will match with the _newOwners array order.
     * @param _amount the quantity to be minted for this token.
     */
    function splitMint(
        string calldata _tokenURI,
        uint256 _royalty,
        address[] calldata _newOwners,
        uint256[] calldata _ownersPercentage,
        uint256 _amount,
        string calldata _memoir
    ) external returns (uint256) {
        if (_ownersPercentage.length != _newOwners.length + 1) {
            revert NumberOfCollaboratorsAndPercentagesNotMatch();
        }
        uint256 _tokenId = mintNft(_tokenURI, _royalty, _amount, _memoir);
        executeSplitMintFlow(_tokenId, _newOwners, _ownersPercentage);
        return _tokenId;
    }

    function collectorSplitMint(
        string calldata _tokenURI,
        uint256 _royalty,
        address[] calldata _newOwners,
        uint256[] calldata _ownersPercentage,
        uint256 _amount,
        address _sender,
        string calldata _memoir
    ) external returns (uint256) {
        if (_ownersPercentage.length != _newOwners.length + 1) {
            revert NumberOfCollaboratorsAndPercentagesNotMatch();
        }
        uint256 _tokenId = collectorMint(
            _tokenURI,
            _royalty,
            _amount,
            _sender,
            _memoir
        );
        executeSplitMintFlow(_tokenId, _newOwners, _ownersPercentage);
        return _tokenId;
    }

    function executeSplitMintFlow(
        uint256 _tokenId,
        address[] calldata _newOwners,
        uint256[] calldata _ownersPercentage
    ) private {
        uint256 ownersCount = 0;
        /// @dev it is a new variable to keep track of the total percentage assigned to collaborators.
        uint256 totalPercentage = 0;

        for (uint256 i = 0; i < _newOwners.length; i++) {
            if (_newOwners[i] != address(0)) {
                ownersCount++;
                totalPercentage += _ownersPercentage[i]; /// @dev Accumulate the percentage for each valid collaborator
            }
        }

        require(ownersCount > 1, "Add more than 1 owner!");

        require(ownersCount < 5, "Add max 5!");

        /// @dev the array of percentages is always one number greater than the collaborators length.
        /// So is necessary do one more addition here.
        totalPercentage += _ownersPercentage[ownersCount];

        if (totalPercentage != 100000000000000000000) {
            revert TheTotalPercentageCantBeGreaterThan100();
        }

        tokenIdCollaboratorsQuantity[_tokenId] = ownersCount + 1;

        /// @dev it assign new owners to the token
        for (uint256 i = 0; i < ownersCount; i++) {
            if (_newOwners[i] != address(0)) {
                tokenCollaborators[_tokenId][i] = _newOwners[i];
                tokenIdCollaboratorsPercentage[_tokenId][i] = _ownersPercentage[
                    i
                ];
            }
        }

        tokenIdCollaboratorsPercentage[_tokenId][
            ownersCount
        ] = _ownersPercentage[ownersCount];

        hasTokenCollaborators[_tokenId] = true;
        emit MintGoldDustNftMintedAndSplitted(
            _tokenId,
            _newOwners,
            _ownersPercentage
        );
    }

    modifier validPercentage(uint256 percentage) {
        if (percentage > mintGoldDustCompany.maxRoyalty()) {
            revert MGDnftRoyaltyInvalidPercentage();
        }
        _;
    }

    function isApproved(address _msgSender) internal view {
        if (mintGoldDustCompany.isArtistApproved(_msgSender) == false) {
            revert MGDnftUnauthorized();
        }
    }
}
