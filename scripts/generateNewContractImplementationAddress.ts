/**
 * @dev This one show how go generate a new implementation contract to upgrade the proxy one using the ProxyAdmin contract
 * @attention go to the main function calll and replace the newContractName with the name of your contract
 */
const { ethers, upgrades } = require("hardhat");
const fs = require("fs");

/**
 * @dev replace with the proxy address you wanna upgrade
 */
const PROXY_ADDRESS = "0x...";

async function main(newContractName: string) {
  console.log("newContractName: ", newContractName);
  /**
   * @attention Uncommnet the lines below to deploy a new implementation contract
   */
  const newImplementationAddress = await deployNewImplementation(
    newContractName
  );
  console.log("New implementation deployed to:", newImplementationAddress);

  /**
   * @attention this one will not be necessary using the safe app
   */
  //const data = await generateUpgradeData(newImplementationAddress);
  //console.log("Encoded Upgrade Data:", data);
}

/**
 *
 * @dev you can use this function to generate the encoded data to upgrade the proxy, but it will not necessary using the safe app
 * @param newImplementationAddress
 * @returns the encoded data to upgrade the proxy
 */
async function generateUpgradeData(newImplementationAddress: string) {
  //const newImplementationAddress = "0xNEW_IMPLEMENTATION_ADDRESS_HERE"; // Replace with your new implementation's address
  const proxyAddress = PROXY_ADDRESS; // Your proxy's address

  const proxyAdminABI = [
    "function upgrade(address proxy, address implementation) external",
  ];

  const proxyAdmin = new ethers.utils.Interface(proxyAdminABI);

  const data = proxyAdmin.encodeFunctionData("upgrade", [
    proxyAddress,
    newImplementationAddress,
  ]);

  return data;
}

/**
 *
 * @dev This one will get your new contract reference and will deploy it to the network
 * @returns the address of the new implementation contract
 */
async function deployNewImplementation(newContractName: string) {
  // Deploy the new version of the contract
  const NewContractFactory = await ethers.getContractFactory(newContractName); // Assuming the new contract is named "MintGoldDustERC721V2"
  const newImplementation = await NewContractFactory.deploy();
  await newImplementation.deployed();

  // Save the new implementation address to a file
  //fs.writeFileSync("newImplementationAddress.txt", newImplementation.address);

  return newImplementation.address;
}

/**
 * @dev for example: "MintGoldDustCompanyV2"
 */
main("MintGoldCompanyV2")
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

export {};
