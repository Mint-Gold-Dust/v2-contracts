import { ethers, upgrades } from "hardhat";
import fs from "fs";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log(
    "Upgrading MintGoldDustSetPrice with the account:",
    deployer.address
  );

  // Read the contract addresses from the JSON file
  const contractAddresses = JSON.parse(
    fs.readFileSync("addresses.json", { encoding: "utf-8" })
  );

  const proxyAddress = contractAddresses.MintGoldDustSetPrice.proxy;
  const proxyAdminAddress = contractAddresses.MintGoldDustSetPrice.proxyAdmin;

  // Deploy the new implementation of MintGoldDustSetPrice
  const MGDSetPriceFactory = await ethers.getContractFactory(
    "MintGoldDustSetPrice"
  );
  const newMGDSetPriceImplementation = await upgrades.prepareUpgrade(
    proxyAddress,
    MGDSetPriceFactory
  );
  console.log(
    "New MintGoldDustSetPrice implementation deployed at:",
    newMGDSetPriceImplementation
  );

  // Connect to the ProxyAdmin contract
  const ProxyAdminFactory = await ethers.getContractFactory("ProxyAdmin");
  const proxyAdmin = ProxyAdminFactory.attach(proxyAdminAddress);

  // Upgrade the proxy to the new implementation
  await proxyAdmin
    .connect(deployer)
    .upgrade(proxyAddress, newMGDSetPriceImplementation);
  console.log("MintGoldDustSetPrice proxy upgraded to the new implementation");

  // Update the JSON file with the new implementation address
  contractAddresses.MintGoldDustSetPrice.implementation =
    newMGDSetPriceImplementation;
  fs.writeFileSync(
    "addresses.json",
    JSON.stringify(contractAddresses, null, 2)
  );
  console.log(
    "Updated addresses.json with the new MintGoldDustSetPrice implementation address"
  );
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
