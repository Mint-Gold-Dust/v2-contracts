import { ethers, upgrades } from "hardhat";
import fs from "fs";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Upgrading MGDCompany with the account:", deployer.address);

  // Read the contract addresses from the JSON file
  const contractAddresses = JSON.parse(
    fs.readFileSync("addresses.json", { encoding: "utf-8" })
  );

  const proxyAddress = contractAddresses.MGDCompany.proxy;
  const proxyAdminAddress = contractAddresses.MGDCompany.proxyAdmin;

  // Deploy the new implementation of MGDCompany
  const MGDCompanyFactory = await ethers.getContractFactory("MGDCompany");
  const newMGDCompanyImplementation = await upgrades.prepareUpgrade(
    proxyAddress,
    MGDCompanyFactory
  );
  console.log(
    "New MGDCompany implementation deployed at:",
    newMGDCompanyImplementation
  );

  // Connect to the ProxyAdmin contract
  const ProxyAdminFactory = await ethers.getContractFactory("ProxyAdmin");
  const proxyAdmin = ProxyAdminFactory.attach(proxyAdminAddress);

  // Upgrade the proxy to the new implementation
  await proxyAdmin
    .connect(deployer)
    .upgrade(proxyAddress, newMGDCompanyImplementation);
  console.log("MGDCompany proxy upgraded to the new implementation");

  // Update the JSON file with the new implementation address
  contractAddresses.MGDCompany.implementation = newMGDCompanyImplementation;
  fs.writeFileSync(
    "addresses.json",
    JSON.stringify(contractAddresses, null, 2)
  );
  console.log(
    "Updated addresses.json with the new MGDCompany implementation address"
  );
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
