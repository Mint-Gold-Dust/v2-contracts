import { ethers, upgrades } from "hardhat";
import fs from "fs";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log(
    "Upgrading MintGoldDustMemoir with the account:",
    deployer.address
  );

  // Read the contract addresses from the JSON file
  const contractAddresses = JSON.parse(
    fs.readFileSync("addresses.json", { encoding: "utf-8" })
  );

  const proxyAddress = contractAddresses.MintGoldDustMemoir.proxy;
  const proxyAdminAddress = contractAddresses.MintGoldDustMemoir.proxyAdmin;

  // Deploy the new implementation of MintGoldDustMemoir
  const MGDMemoirFactory = await ethers.getContractFactory(
    "MintGoldDustMemoir"
  );
  const newMGDMemoirImplementation = await upgrades.prepareUpgrade(
    proxyAddress,
    MGDMemoirFactory
  );
  console.log(
    "New MintGoldDustMemoir implementation deployed at:",
    newMGDMemoirImplementation
  );

  // Connect to the ProxyAdmin contract
  const ProxyAdminFactory = await ethers.getContractFactory("ProxyAdmin");
  const proxyAdmin = ProxyAdminFactory.attach(proxyAdminAddress);

  // Upgrade the proxy to the new implementation
  await proxyAdmin
    .connect(deployer)
    .upgrade(proxyAddress, newMGDMemoirImplementation);
  console.log("MintGoldDustMemoir proxy upgraded to the new implementation");

  // Update the JSON file with the new implementation address
  contractAddresses.MintGoldDustMemoir.implementation =
    newMGDMemoirImplementation;
  fs.writeFileSync(
    "addresses.json",
    JSON.stringify(contractAddresses, null, 2)
  );
  console.log(
    "Updated addresses.json with the new MintGoldDustMemoir implementation address"
  );
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
