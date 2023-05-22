import { ethers, upgrades } from "hardhat";
import fs from "fs";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Upgrading MGDAuction with the account:", deployer.address);

  // Read the contract addresses from the JSON file
  const contractAddresses = JSON.parse(
    fs.readFileSync("addresses.json", { encoding: "utf-8" })
  );

  const proxyAddress = contractAddresses.MGDAuction.proxy;
  const proxyAdminAddress = contractAddresses.MGDAuction.proxyAdmin;

  // Deploy the new implementation of MGDAuction
  const MGDAuctionFactory = await ethers.getContractFactory("MGDAuction");
  const newMGDAuctionImplementation = await upgrades.prepareUpgrade(
    proxyAddress,
    MGDAuctionFactory
  );
  console.log(
    "New MGDAuction implementation deployed at:",
    newMGDAuctionImplementation
  );

  // Connect to the ProxyAdmin contract
  const ProxyAdminFactory = await ethers.getContractFactory("ProxyAdmin");
  const proxyAdmin = ProxyAdminFactory.attach(proxyAdminAddress);

  // Upgrade the proxy to the new implementation
  await proxyAdmin
    .connect(deployer)
    .upgrade(proxyAddress, newMGDAuctionImplementation);
  console.log("MGDAuction proxy upgraded to the new implementation");

  // Update the JSON file with the new implementation address
  contractAddresses.MGDAuction.implementation = newMGDAuctionImplementation;
  fs.writeFileSync(
    "addresses.json",
    JSON.stringify(contractAddresses, null, 2)
  );
  console.log(
    "Updated addresses.json with the new MGDAuction implementation address"
  );
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
