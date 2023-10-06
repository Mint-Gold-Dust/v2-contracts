// const fs = require("fs");
// const { ethers, upgrades } = require("hardhat");

// const proxyAdminABI =
//   require("@openzeppelin/upgrades-core/artifacts/ProxyAdmin.json").abi;
// // {
// //   "MintGoldDustCompany": {
// //     "proxy": "0x7F86cC2641C399a7A89b9eb92db5D31Ea685A543",
// //     "implementation": "0x5551a877d9CbC6ff84280B3b489C6b331EcaF32f",
// //     "proxyAdmin": "0xb2768233be3c57b81C42a348DBCe2A7F8adEE02C"
// //   },
// async function main() {
//   // Confirm network environment
//   const network = await ethers.provider.getNetwork();
//   if (network.name === "homestead") {
//     console.error("You're about to run this on mainnet! Aborting.");
//     return;
//   }

//   //console.log("proxyAdminABI: ", proxyAdminABI);

//   // Deploy the new implementation of the contract
//   const newImplementationAddress = await deployNewImplementation();

//   // Generate transaction data for the upgrade
//   const txData = await getUpgradeTransactionData(
//     "0x7F86cC2641C399a7A89b9eb92db5D31Ea685A543",
//     newImplementationAddress
//   );
//   console.log("Transaction Data for Gnosis Safe:", txData);

//   // Manual step: Use the above txData to create a transaction in Gnosis Safe UI
//   console.log(
//     "Submit the above transaction data in your Gnosis Safe UI. Set the destination to the ProxyAdmin address:",
//     "0xb2768233be3c57b81C42a348DBCe2A7F8adEE02C"
//   );
// }

// async function deployNewImplementation() {
//   const MintGoldDustCompanyFactory = await ethers.getContractFactory(
//     "MintGoldDustCompany"
//   );
//   return await upgrades.prepareUpgrade(
//     "0x7F86cC2641C399a7A89b9eb92db5D31Ea685A543",
//     MintGoldDustCompanyFactory
//   );
// }

// async function getUpgradeTransactionData(
//   proxyAddress: string,
//   newImplementationAddress: string
// ) {
//   // const proxyAdmin = await ethers.getContractAt(
//   //   "ProxyAdmin",
//   //   "0xb2768233be3c57b81C42a348DBCe2A7F8adEE02C"
//   // );

//   const [deployer] = await ethers.getSigners();

//   const proxyAdmin = new ethers.Contract(
//     "0xb2768233be3c57b81C42a348DBCe2A7F8adEE02C",
//     proxyAdminABI,
//     deployer
//   );

//   return proxyAdmin.interface.encodeFunctionData("upgrade", [
//     proxyAddress,
//     newImplementationAddress,
//   ]);
// }

// // Execute the main function
// main()
//   .then(() => process.exit(0))
//   .catch((error) => {
//     console.error(error);
//     process.exit(1);
//   });
