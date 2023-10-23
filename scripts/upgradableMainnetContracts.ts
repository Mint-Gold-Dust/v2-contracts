/**
 * @dev This one will deploy all the contracts first time with the upgrade proxy pattern 
 */
const { ethers, upgrades } = require("hardhat");

async function main() {    
  // /************************************* MintGoldDustSetPrice INIT **************************************/
  const MintGoldDustSetPriceNewImpl = await ethers.getContractFactory("MintGoldDustSetPrice"); // Assuming the new contract is named "MintGoldDustERC721V2"
  const mintGoldDustSetPriceNewImpl = await MintGoldDustSetPriceNewImpl.deploy();
  await mintGoldDustSetPriceNewImpl.deployed();

  console.log("MintGoldDustSetPriceNewImpl address: ",mintGoldDustSetPriceNewImpl.address);

  /************************************* MintGoldDustSetPrice FINAL *************************************/

  // /************************************** MintGoldDustMarketplaceAuction INIT **************************************/
  // Deploy MintGoldDustMarketplaceAuction contract
  const MintGoldDustMarketplaceAuctionImpl = await ethers.getContractFactory("MintGoldDustMarketplaceAuction"); // Assuming the new contract is named "MintGoldDustERC721V2"
  const mintGoldDustMarketplaceAuctionImpl = await MintGoldDustMarketplaceAuctionImpl.deploy();
  await mintGoldDustMarketplaceAuctionImpl.deployed();

  console.log("MintGoldDustMarketplaceAuctionImpl address: ",mintGoldDustMarketplaceAuctionImpl.address);
  
  /************************************** MintGoldDustMarketplaceAuction FINAL *************************************/  

  console.log("Contracts upgraded");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

export {};
