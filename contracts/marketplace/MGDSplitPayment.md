// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.18;

import "@openzeppelin/contracts/utils/Counters.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC721/ERC721Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC721/extensions/ERC721URIStorageUpgradeable.sol";
import "./MintGoldDustERC721.sol";
import "./MintGoldDustCompany.sol";

error NumberOfCollaboratorsDoesNotMatchWithPercentage();

/// @title A contract responsible by mint and transfer Mint Gold Dust ERC721 tokens.
/// @notice Contains functions to mint and transfer MGD ERC721 tokens.
/// @author Mint Gold Dust LLC
/// @custom:contact klvh@mintgolddust.io
contract MGDSplitPayment is Initializable {
using Counters for Counters.Counter;
Counters.Counter private \_tokenIds;

MintGoldDustERC721 private \_mgdNft;
MintGoldDustCompany private \_mgdCompany;

mapping(uint256 => uint256[5]) public tokenIdCollaboratorsPercentage;
mapping(uint256 => address[4]) public tokenCollaborators;

function initialize(address mintGoldDustERC721, address mgdCompany) public initializer {
\_mgdNft = MintGoldDustERC721(payable(mintGoldDustERC721));
\_mgdCompany = MintGoldDustCompany(payable(mgdCompany));
}

event NftMintedAndSplitted(
uint256 indexed tokenId,
address owner,
string tokenURI,
uint256 royalty,
address[] collaborators
);

function splitPayment(
string calldata \_tokenURI,
uint256 \_royalty,
address[] calldata newOwners,
uint256[] calldata ownersPercentage
) public {
if (ownersPercentage.length != newOwners.length) {
revert NumberOfCollaboratorsDoesNotMatchWithPercentage();
}
\_mgdNft.mintNft(\_tokenURI, \_royalty, msg.sender);
uint256 ownersCount = 0;

    for (uint256 i = 0; i < newOwners.length; i++) {
      if (newOwners[i] != address(0)) {
        ownersCount++;
      }
    }

    require(ownersCount > 1, "At least two different owners required");

    require(ownersCount < 5, "Add maximum 4 collaborators for it");

    // Assign new owners to the token
    // for (uint256 i = 0; i < newOwners.length; i++) {
    //   if (newOwners[i] != address(0)) {
    //     tokenCollaborators[_tokenId][i] = newOwners[i];
    //   }
    // }

}

/// @notice Fallbacks will forward funds to Mint Gold Dust LLC
fallback() external payable {
payable(\_mgdCompany.owner()).transfer(msg.value);
}

/// @notice Fallbacks will forward funds to Mint Gold Dust LLC
receive() external payable {
payable(\_mgdCompany.owner()).transfer(msg.value);
}
}
