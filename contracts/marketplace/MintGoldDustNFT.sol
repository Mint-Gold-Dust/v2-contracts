// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.18;

import "@openzeppelin/contracts/utils/Counters.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "./MintGoldDustCompany.sol";

error MGDnftRoyaltyInvalidPercentage();
error MGDnftUnauthorized();
error NumberOfCollaboratorsAndPercentagesNotMatch();
error TheTotalPercentageCantBeGreaterThan100();

abstract contract MintGoldDustNFT is Initializable {
    // Add your custom code and functions here
    /**
     *
     * @notice that the MintGoldDustERC721 is composed by other contract.
     * @param _mgdCompany The contract responsible to MGD management features.
     */
    function initialize(address _mgdCompany) public initializer {
        mgdCompany = MintGoldDustCompany(payable(_mgdCompany));
    }

    MintGoldDustCompany internal mgdCompany;

    mapping(uint256 => address) public tokenIdArtist;
    mapping(uint256 => uint256) public tokenIdRoyaltyPercent;

    mapping(uint256 => address[4]) public tokenCollaborators;
    mapping(uint256 => uint256[5]) public tokenIdCollaboratorsPercentage;
    mapping(uint256 => bool) public hasTokenCollaborators;
    mapping(uint256 => uint256) public tokenIdCollaboratorsQuantity;

    event NftMinted(
        uint256 indexed tokenId,
        address owner,
        uint256 royalty,
        uint256 amount
    );

    event NftSplitted(
        uint256 indexed tokenId,
        address owner,
        address[] collaborators,
        uint256[] ownersPercentage,
        address contractAddress
    );

    function transfer(
        address from,
        address to,
        uint256 tokenId,
        uint256 amount
    ) external virtual;

    function mintNft(
        string calldata _tokenURI,
        uint256 _royalty,
        uint256 _amount
    ) public payable virtual returns (uint256);

    function splitMint(
        string calldata _tokenURI,
        uint256 _royalty,
        address[] calldata newOwners,
        uint256[] calldata ownersPercentage,
        uint256 _amount
    ) public returns (uint256) {
        if (ownersPercentage.length != newOwners.length + 1) {
            revert NumberOfCollaboratorsAndPercentagesNotMatch();
        }
        uint256 _tokenId = mintNft(_tokenURI, _royalty, _amount);
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
        emit NftSplitted(
            _tokenId,
            msg.sender,
            newOwners,
            ownersPercentage,
            address(this)
        );

        return _tokenId;
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
