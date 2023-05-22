import { ethers, upgrades } from "hardhat";
import fs from "fs";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log(
    "Upgrading MintGoldDustERC721 with the account:",
    deployer.address
  );

  // Read the contract addresses from the JSON file
  const contractAddresses = JSON.parse(
    fs.readFileSync("addresses.json", { encoding: "utf-8" })
  );

  const proxyAddress = contractAddresses.MintGoldDustERC721.proxy;
  const proxyAdminAddress = contractAddresses.MintGoldDustERC721.proxyAdmin;

  // Deploy the new implementation of MintGoldDustERC721
  const MGDnftFactory = await ethers.getContractFactory("MintGoldDustERC721");
  const newMGDnftImplementation = await upgrades.prepareUpgrade(
    proxyAddress,
    MGDnftFactory
  );
  console.log(
    "New MintGoldDustERC721 implementation deployed at:",
    newMGDnftImplementation
  );

  // Connect to the ProxyAdmin contract
  const ProxyAdminFactory = await ethers.getContractFactory("ProxyAdmin");
  const proxyAdmin = ProxyAdminFactory.attach(proxyAdminAddress);

  // Upgrade the proxy to the new implementation
  await proxyAdmin
    .connect(deployer)
    .upgrade(proxyAddress, newMGDnftImplementation);
  console.log("MintGoldDustERC721 proxy upgraded to the new implementation");

  // Update the JSON file with the new implementation address
  contractAddresses.MintGoldDustERC721.implementation = newMGDnftImplementation;
  fs.writeFileSync(
    "addresses.json",
    JSON.stringify(contractAddresses, null, 2)
  );
  console.log(
    "Updated addresses.json with the new MintGoldDustERC721 implementation address"
  );
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
