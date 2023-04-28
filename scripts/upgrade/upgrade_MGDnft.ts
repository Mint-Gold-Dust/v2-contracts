import { ethers, upgrades } from "hardhat";
import fs from "fs";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Upgrading MGDnft with the account:", deployer.address);

  // Read the contract addresses from the JSON file
  const contractAddresses = JSON.parse(
    fs.readFileSync("addresses.json", { encoding: "utf-8" })
  );

  const proxyAddress = contractAddresses.MGDnft.proxy;
  const proxyAdminAddress = contractAddresses.MGDnft.proxyAdmin;

  // Deploy the new implementation of MGDnft
  const MGDnftFactory = await ethers.getContractFactory("MGDnft");
  const newMGDnftImplementation = await upgrades.prepareUpgrade(
    proxyAddress,
    MGDnftFactory
  );
  console.log(
    "New MGDnft implementation deployed at:",
    newMGDnftImplementation
  );

  // Connect to the ProxyAdmin contract
  const ProxyAdminFactory = await ethers.getContractFactory("ProxyAdmin");
  const proxyAdmin = ProxyAdminFactory.attach(proxyAdminAddress);

  // Upgrade the proxy to the new implementation
  await proxyAdmin
    .connect(deployer)
    .upgrade(proxyAddress, newMGDnftImplementation);
  console.log("MGDnft proxy upgraded to the new implementation");

  // Update the JSON file with the new implementation address
  contractAddresses.MGDnft.implementation = newMGDnftImplementation;
  fs.writeFileSync(
    "addresses.json",
    JSON.stringify(contractAddresses, null, 2)
  );
  console.log(
    "Updated addresses.json with the new MGDnft implementation address"
  );
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
