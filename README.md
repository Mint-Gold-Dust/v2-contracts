# MGD Smart Contracts V2

If you starting now at this project, please do the next configurations:

Install the VSCode extension:

```
code --install-extension esbenp.prettier-vscode
```

In VSCode Open User Settings (JSON), add:

```
{
  "editor.formatOnSave": true,
  "[solidity]": {
    "editor.defaultFormatter": "esbenp.prettier-vscode"
  }
}
```

Some of the following tasks:

```shell
npx hardhat help
npx hardhat test
REPORT_GAS=true npx hardhat test
npx hardhat node
npx hardhat run scripts/deploy.ts
```

# GDNFTMarketplace Contract Documentation

The GDNFTMarketplace contract is an Ethereum smart contract that enables the minting and selling of Gold Dust NFTs (GDNFT) on the Ethereum blockchain. This contract is based on the ERC721 token standard, and uses OpenZeppelin libraries for token ownership tracking and management.

## Contract Details

- Name: GDNFTMarketplace
- ERC: ERC721URIStorage
- Symbol: GDNFT

## Contract Functions

- `constructor()`: The contract constructor function initializes the GDNFT token with the name and symbol parameters, and sets up the Counters library for tracking the token IDs and items sold.

- `updatePrimarySaleFeePercent(uint256 _percentage)`: This function updates the platform's primary sale fee percentage, which is taken from each original sale on the marketplace. Only the contract deployer can call this function. The `_percentage` parameter is the new fee percentage in wei format.

- `updateSecondarySaleFeePercent(uint256 _percentage)`: This function updates the platform's secondary sale fee percentage, which is taken from each resale on the marketplace. Only the contract deployer can call this function. The `_percentage` parameter is the new fee percentage in wei format.

- `updateCollectorFee(uint256 _percentage)`: This function updates the collector fee percentage, which is charged from each primary sale. Only the contract deployer can call this function. The `_percentage` parameter is the new fee percentage in wei format.

- `updateMaxRoyalty(uint256 _percentage)`: This function updates the maximum royalty percentage that can be set by the artist when they mint their NFT. Only the contract deployer can call this function. The `_percentage` parameter is the new maximum royalty percentage in wei format.

- `mintNft(string memory _tokenURI, uint256 _royaltyPercent)`: This function allows artists to mint a new GDNFT token and list it on the marketplace. The `_tokenURI` parameter is the URI of the token metadata, and `_royaltyPercent` is the royalty percentage that the artist wants to set for their work. The function fails if the artist is not whitelisted.

- `listNft(uint256 _tokenId, uint256 _price)`: This function allows artists to list their GDNFT token on the marketplace. The `_tokenId` parameter is the ID of the token to be listed, and the `_price` parameter is the price at which the token will be listed. The function fails if the price is less than or equal to 0.

- `buyNft(uint256 _tokenId)`: This function allows buyers to purchase a GDNFT token from the marketplace. The `_tokenId` parameter is the ID of the token to be purchased. The function fails if the token is not listed on the marketplace, or if the buyer does not have sufficient funds to make the purchase.

- `updateListedNft(uint256 _tokenId, uint256 _price)`: This function allows the seller to update the price of an already listed NFT the marketplace. The `_tokenId` parameter is the ID of the token to be updated. The `_price` parameter is the new price to be set. The function fails if the token is not listed on the marketplace, if the price is less or equal to zero or if the caller is not the seller.

- `reListNft(uint256 _tokenId, uint256 _price)`: This function allows an NFT owner(not original artist) to list the token on the secondary marketplace. The `_tokenId` parameter is the ID of the token to be listed, and the `_price` parameter is the price at which the token will be listed. The function fails if the price is less than or equal to 0 or the caller is not the owner of the token.

- `delistNft(uint256 _tokenId)`: This function allows the seller of an NFT to remove the token from the marketplace. The `_tokenId` parameter is the ID of the token to be removed. The function fails if the caller is not the seller of the token. When the token is removed, the `id_MarketItem[_tokenId]` struct is updated to reflect that the token has been sold. The `_itemsSold` counter is incremented since the token is no longer listed for sale. The token is transferred from the marketplace contract to the seller, and an `NftRemovedFromMarketplace` event is emitted.

- `auction(uint256 _tokenId, address _auctionContract)`: This function allows the owner of an NFT to move the token to an auction contract. The `_tokenId` parameter is the ID of the token to be moved, and the `_auctionContract` parameter is the address of the auction contract to which the token will be moved. The function fails if the caller is not the owner of the token. When the token is moved, it is transferred from the caller to the auction contract, and an `NftSentToAuction` event is emitted.

- `setValidator(address _address, bool _state)`: This function allows the contract owner to whitelist or blacklist an address as a validator. The `_address` parameter is the address to be validated, and the \_state parameter is the boolean state of the validation. The function emits a `ValidatorAdded` event when an address is added to the validator list.

- `whitelist(address _address, bool _state)`: This function allows a validator to whitelist or blacklist an artist. The `_address` parameter is the address of the artist to be whitelisted or blacklisted, and the `_state` parameter is the boolean state of the artist's approval. The function emits an `ArtistWhitelisted` event when an artist is added to the whitelist.

# 🎉 Interface Functions 🎉

The `IGD` interface defines the following events:

## NftMinted 💰

This event is emitted when a new Gold Dust NFT is minted and added to the marketplace.

**Parameters:**

- `tokenId`: the ID of the new NFT
- `owner`: the address of the owner of the NFT
- `tokenURI`: the URI of the metadata for the NFT
- `royalty`: the royalty percentage set by the artist for the NFT

## NftListed 📈

This event is emitted when a Gold Dust NFT is listed on the marketplace for the first time.

**Parameters:**

- `tokenId`: the ID of the NFT that was listed
- `seller`: the address of the seller who listed the NFT
- `price`: the price at which the NFT was listed

## NftListedItemUpdated 🔄

This event is emitted when a listed Gold Dust NFT is updated with a new price.

**Parameters:**

- `tokenId`: the ID of the NFT that was updated
- `seller`: the address of the seller who updated the NFT
- `price`: the new price of the NFT

## NftPurchased 🛍️

This event is emitted when a Gold Dust NFT is purchased from the marketplace.

**Parameters:**

- `tokenId`: the ID of the NFT that was purchased
- `seller`: the address of the seller who sold the NFT
- `newOwner`: the address of the new owner of the NFT
- `buyPrice`: the price at which the NFT was purchased
- `royaltyPercent`: the royalty percentage set by the artist for the NFT
- `royaltyAmount`: the amount of royalty paid to the artist for the NFT
- `royaltyRecipient`: the address of the recipient of the royalty payment
- `feeAmount`: the platform's fee for the purchase
- `collectorFeeAmount`: the collector fee paid to the artist for the secondary sale

## NftRemovedFromMarketplace 🚫

This event is emitted when a Gold Dust NFT is removed from the marketplace.

**Parameters:**

- `tokenId`: the ID of the NFT that was removed
- `seller`: the address of the seller who removed the NFT

## NftSentToAuction 🎁

This event is emitted when a Gold Dust NFT is sent to auction.

**Parameters:**

- `tokenId`: the ID of the NFT that was sent to auction
- `seller`: the address of the seller who sent the NFT to auction
- `auctionAddress`: the address of the auction contract

## ArtistWhitelisted 🎨

This event is emitted when an artist is whitelisted to mint NFTs.

**Parameters:**

- `artistAddress`: the address of the artist who was whitelisted
- `state`: the state of the whitelist (true or false)

## ValidatorAdded ✅

This event is emitted when a validator is added to the platform.

**Parameters:**

- `validatorAddress`: the address of the validator who was added
- `state`: the state of the validator (true or false)
