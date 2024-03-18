## Role playing tests

Artist1 (the 721 minter):
Artist2 (the 1155 minter):
Artist3 (the collector minter):

Collector1:
Collector2:
Collector3:

### Pre-upgrade Tasks:

APPLICABLE TO ALL ACTIONS

- Do all actions in https://sepolia.mintgolddust.com/
- For all purposes use royalty equals 10 percent.
- Use sell price or reserve price equal to 0.001 ETH

**Artist1** mints and lists the following in the indicated sequence:

1. Mint a 721 NFT normal and list it. Call the artpiece "721Normal"
2. Mint a 721 NFT split mint with Artist2 (20%) and Artist3 (15%) as collaborators and list it. Call the artpiece "721Split"
3. Mint another 721 NFT normal and auction it. Call the artpiece "721NAuctionable"
4. Mint another 721 NFT split mint with Artist2 (20%) and Artist3 (15%) and auction it. Call the artpiece "721SAuctionable"

**Artist2** mints and lists the following in the indicated sequence:

1. Mint a 1155 NFT edition of 10 editions then list ALL the edition. Call the artpiece "1155Normal"
2. Mint a 1155 NFT edition of 10 editions and split mint it with Artist2 (20%) and Artist3 (15%) as collaborators then list ALL the edition. Call the artpiece "1155Split"
3. Mint another 1155 NFT edition of 10 and then auction ONLY ONE of the edition. Call the artpiece "1155NAuctionable"
4. Mint another 1155 NFT edition of 10 and split mint with Artist2 (20%) and Artist3 (15%) as collaborators and then auction ONLY ONE of the edition. Call the artpiece "1155SAuctionable"

**Artist3** creates the following:

1. Collector mint an 721. Call the artpiece "CM721N".
2. Collector mint another 721 with split with Artist2 (20%) and Artist3 (15%). Call the artpiece "CM721S".
3. Collector mint an 1155 with 10 editions. Call the artpiece "CM1155N".
4. Collector mint another 1155 with 10 editions and split with Artist2 (20%) and Artist3 (15%). Call the artpiece "CM1155S".

**Collector1**

1. Buy the NFT from Artist1 described in item #1. "721Normal"
2. Bid on the auction of Artist2 line described item #3. "1155NAuctionable"

**Collector2**

1. Buy 1 edition NFT from Artist2 described in item #1. "1155Normal"
2. Collect mint 1 NFT from Artist3 described in item #3. "CM1155N"

**Collector3**

1. Bid on the auction of Artist1 described in item #3. "721NAuctionable"
2. Collect mint NFT from Artist3 described in item #1. "CM721N"

### Post-upgrade Tasks:

PLEASE WAIT UNTIL UPGRADE IS EXECUTED.

**Collector1**

1. Bid on the auction of Artist1 line described item #4. "721SAuctionable"
2. Collect mint NFT from Artist3 described in item#2. "CM721S"

**Collector2**

1. Buy the NFT from Artist1 described in item #2. "721Split"
2. Bid on the auction of Artist2 line described item #4. "1155SAuctionable"

**Collector3**

1. Buy 1 edition NFT from Artist2 described in item #2. "1155Split"
2. Collect mint 1 NFT from Artist3 described in item #4. "CM1155S"

test/
├x── AuctionPlaceBidBadPathsERC1155.ts
├x── AuctionPlaceBidBadPathsERC721.ts
├x── AuctionReservePriceCompleteFlow.ts
├x── AuctionReservePriceEndAuctionBadPathsERC1155.ts
├x── AuctionReservePriceEndAuctionBadPathsERC721.ts
├x── AuctionReservePriceHappyERC1155.ts
├x── AuctionReservePriceHappyERC721.ts
├x── CancelMarketPlaceAuctionWithERC1155.ts
├x── CancelMarketPlaceAuctionWithERC721.ts
├x── ListItemERC1155ForAuction.ts
├x── ListItemERC721ForAuction.ts
├x── ListSameTokenIDERC721AndERC1155.ts
├x── MintGoldDustCompany.ts
├x── MintGoldDustERC1155Burn.ts
├x── MintGoldDustERC1155NoBurnAfterPrimarySale.ts
├x── MintGoldDustERC1155SalePartOfTokensAndBurnRest.ts
├x── MintGoldDustERC1155SetPriceCollectorMint.ts
├x── MintGoldDustERC1155SetPriceCollectorSplitMint.ts
├x── MintGoldDustERC1155.ts
├x── MintGoldDustERC721Burn.ts
├x── MintGoldDustERC721NoBurnAfterPrimarySale.ts
├x── MintGoldDustERC721SetPriceCollectorMint.ts
├x── MintGoldDustERC721SetPriceCollectorSplitMint.ts
├x── MintGoldDustERC721.ts
├o── MintGoldDustMarketplaceAuctionERC1155SplitPayments.ts
├o── MintGoldDustMarketplaceAuctionERC1155.ts
├x── MintGoldDustMarketplaceAuctionERC721SplitPayments.ts
├x─ MintGoldDustMarketplaceAuctionERC721.ts
├x── MintGoldDustMemoir.ts
├0── MintGoldDustSetPriceERC1155StressTests.ts
├x── MintGoldDustSetPriceERC1155.ts
├x── MintGoldDustSetPriceERC721.ts
├x── MintGoldDustSetPriceSplitERC1155.ts
├x── MintGoldDustSetPriceSplitERC721PenTest.ts
├x── MintGoldDustSetPriceSplitERC721.ts
├── upgrades
└── utils
