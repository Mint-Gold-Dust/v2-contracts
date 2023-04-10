// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.18;

import "./MGDMarketplace.sol";
import "./MGDnft.sol";

error MGDMainErroToList();
error MGDMainErrorAtSafeTransfer();

contract MGDMain {
MGDMarketplace \_marketplaceChild;
MGDMarketplace \_marketplaceParent;
MGDnft \_mgdNft;

constructor(
address setPriceOrAuctionAddress,
address marketplaceAddress,
address mdgNftAddress
) {
\_marketplaceChild = MGDMarketplace(setPriceOrAuctionAddress);
\_marketplaceParent = MGDMarketplace(marketplaceAddress);
\_mgdNft = MGDnft(mdgNftAddress);
}

/\*\*

- Acquire a listed NFT
- Primary fee percentage from primary sale is charged by the platform
- Secondary fee percentage from secondary sale is charged by the platform while royalty is sent to artist
- @notice Function will fail is artist has marked NFT as restricted
- @param \_tokenId The token ID of the the token to acquire
  \*/
  function executeList(uint256 \_tokenId, uint256 \_price) public payable {
  try \_marketplaceChild.list(\_tokenId, \_price) {} catch {
  revert MGDMainErroToList();
  }


    _mgdNft.safeTransferFrom(address(_marketplaceParent), msg.sender, _tokenId);

}

// function buyNFT(uint256 \_tokenId) public payable isListed(\_tokenId) {
// uint256 price = idMarketItem[_tokenId].price;
// if (msg.value != price) {
// revert GDNFTMarketplace\_\_IncorrectAmountSent();
// }
// idMarketItem[_tokenId].sold = true;
// \_itemsSold.increment();

// uint256 fee;
// uint256 collFee;
// uint256 royalty;
// uint256 balance;

// if (idMarketItem[_tokenId].isPrimarySale == true) {
// fee = (msg.value _ \_mgdCompany.primarySaleFeePercent) / (100 _ 10 ** 18);
// collFee = (msg.value _ \_mgdCompany.collectorFee) / (100 _ 10 ** 18);
// balance = msg.value - (fee + collFee);
// idMarketItem[_tokenId].isPrimarySale = false;

// try payable(\_mgdCompany.owner).transfer(collFee) {
// NftPurchasedPrimaryMarket(
// \_tokenId,
// idMarketItem[_tokenId].seller,
// msg.sender,
// price,
// fee,
// collFee
// );
// } catch {
// revert MGDMarketplaceSaleNotConcluded();
// }
// } else {
// fee =
// (msg.value _ \_mgdCompany.secondarySaleFeePercent) /
// (100 _ 10 ** 18);
// royalty =
// (msg.value _ \_mgdCompany.tokenIdRoyaltyPercent[_tokenId]) /
// (100 _ 10 ** 18);

// balance = msg.value - (fee + royalty);

// payable(idMarketItem[_tokenId].seller).transfer(royalty);

// emit NftPurchasedSecondaryMarket(
// \_tokenId,
// idMarketItem[_tokenId].seller,
// msg.sender,
// price,
// tokenIdRoyaltyPercent[_tokenId],
// royalty,
// tokenIdArtist[_tokenId],
// fee,
// collFee
// );
// }
// payable(\_mgdCompany.ownerOf).transfer(fee);
// payable(idMarketItem[_tokenId].seller).transfer(balance);

// \_transfer(address(this), msg.sender, \_tokenId);
// }

// modifier validPercentage(uint256 percentage) {
// if (percentage > max*royalty) {
// revert GDNFTMarketplace\_\_InvalidPercentage();
// }
// *;
// }

// modifier isApproved() {
// if (artist*IsApproved[msg.sender] == false) {
// revert GDNFTMarketplace\_\_Unauthorized();
// }
// *;
// }
}
