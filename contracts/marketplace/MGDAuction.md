// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.18;

import "./MGDMarketplace.sol";

contract MGDAuction is MGDMarketplace {
  constructor(
    address mgdCompany,
    address mgdNft
  ) MGDMarketplace(mgdCompany, mgdNft) {}

  function list(
    uint256 _tokenId,
    uint256 _price
  ) public override isArtist(_tokenId) isNFTowner(_tokenId) {
    AuctionProps memory auctionProps = AuctionProps(
      0,
      payable(address(0)),
      payable(address(0)),
      false,
      false
    );

    idMarketItem[_tokenId] = MarketItem(
      _tokenId,
      payable(msg.sender),
      _price,
      false,
      true,
      true,
      auctionProps
    );

    emit NftListedToAuction(_tokenId, payable(msg.sender), _price, 0);
  }
}
