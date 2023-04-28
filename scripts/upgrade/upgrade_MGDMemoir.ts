import { ethers, upgrades } from "hardhat";
import fs from "fs";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Upgrading MGDMemoir with the account:", deployer.address);

  // Read the contract addresses from the JSON file
  const contractAddresses = JSON.parse(
    fs.readFileSync("addresses.json", { encoding: "utf-8" })
  );

  const proxyAddress = contractAddresses.MGDMemoir.proxy;
  const proxyAdminAddress = contractAddresses.MGDMemoir.proxyAdmin;

  // Deploy the new implementation of MGDMemoir
  const MGDMemoirFactory = await ethers.getContractFactory("MGDMemoir");
  const newMGDMemoirImplementation = await upgrades.prepareUpgrade(
    proxyAddress,
    MGDMemoirFactory
  );
  console.log(
    "New MGDMemoir implementation deployed at:",
    newMGDMemoirImplementation
  );

  // Connect to the ProxyAdmin contract
  const ProxyAdminFactory = await ethers.getContractFactory("ProxyAdmin");
  const proxyAdmin = ProxyAdminFactory.attach(proxyAdminAddress);

  // Upgrade the proxy to the new implementation
  await proxyAdmin
    .connect(deployer)
    .upgrade(proxyAddress, newMGDMemoirImplementation);
  console.log("MGDMemoir proxy upgraded to the new implementation");

  // Update the JSON file with the new implementation address
  contractAddresses.MGDMemoir.implementation = newMGDMemoirImplementation;
  fs.writeFileSync(
    "addresses.json",
    JSON.stringify(contractAddresses, null, 2)
  );
  console.log(
    "Updated addresses.json with the new MGDMemoir implementation address"
  );
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
