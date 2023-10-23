/**
 * @dev This one will deploy all the contracts first time with the upgrade proxy pattern
 *      So for each contract we'll have 3 addresses:
 *        - The proxy address: The one that will always be used to interact with the contract
 *        - The implementation address: The one that will be upgraded
 *        - The proxy admin address: The one that will be used to upgrade the proxy
 */
const { ethers, upgrades, network } = require("hardhat");
const fs = require("fs");

async function main() {
  await network.provider.request({
    method: "hardhat_impersonateAccount",
    params: ["0x098809aF9e0650ED1Fd9c7615021D9384032a613"],
  });

  const signer = await ethers.getSigner("0x098809aF9e0650ED1Fd9c7615021D9384032a613")

  const mintGoldDustMarketplaceV1Address = "0x76cDa4e918581c4a57CB3e65975768c5F295f4D9"

  // await upgrades.forceImport("0x831DFcE1ccB493a2B0116Ce0d512b75E142eC3F4");
  // const old = await upgrades.forceImport("0x831DFcE1ccB493a2B0116Ce0d512b75E142eC3F4", await ethers.getContractFactory(abi, bytecode, undefined)); `
  
  await upgrades.forceImport("0x831DFcE1ccB493a2B0116Ce0d512b75E142eC3F4", await ethers.getContractFactory("MintGoldDustSetPrice", signer));

  const MintGoldDustSetPrice = await ethers.getContractFactory("MintGoldDustSetPrice", signer);
  console.log('Upgrading MintGoldDustSetPrice...');
  const mintGoldDustSetPrice = await upgrades.upgradeProxy(mintGoldDustMarketplaceV1Address, MintGoldDustSetPrice, { signer });        
  console.log('MintGoldDustSetPrice upgraded address:', mintGoldDustSetPrice.address);  
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

export {};
