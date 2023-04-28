import { ethers, upgrades } from "hardhat";
import fs from "fs";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Upgrading MGDSetPrice with the account:", deployer.address);

  // Read the contract addresses from the JSON file
  const contractAddresses = JSON.parse(
    fs.readFileSync("addresses.json", { encoding: "utf-8" })
  );

  const proxyAddress = contractAddresses.MGDSetPrice.proxy;
  const proxyAdminAddress = contractAddresses.MGDSetPrice.proxyAdmin;

  // Deploy the new implementation of MGDSetPrice
  const MGDSetPriceFactory = await ethers.getContractFactory("MGDSetPrice");
  const newMGDSetPriceImplementation = await upgrades.prepareUpgrade(
    proxyAddress,
    MGDSetPriceFactory
  );
  console.log(
    "New MGDSetPrice implementation deployed at:",
    newMGDSetPriceImplementation
  );

  // Connect to the ProxyAdmin contract
  const ProxyAdminFactory = await ethers.getContractFactory("ProxyAdmin");
  const proxyAdmin = ProxyAdminFactory.attach(proxyAdminAddress);

  // Upgrade the proxy to the new implementation
  await proxyAdmin
    .connect(deployer)
    .upgrade(proxyAddress, newMGDSetPriceImplementation);
  console.log("MGDSetPrice proxy upgraded to the new implementation");

  // Update the JSON file with the new implementation address
  contractAddresses.MGDSetPrice.implementation = newMGDSetPriceImplementation;
  fs.writeFileSync(
    "addresses.json",
    JSON.stringify(contractAddresses, null, 2)
  );
  console.log(
    "Updated addresses.json with the new MGDSetPrice implementation address"
  );
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
