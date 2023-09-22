/**
 * @dev This one is if you want to deploy only one contract, but is not useful now
 */
// const { ethers, upgrades } = require("hardhat");
// const fs = require("fs");

// async function main() {
//   const [deployer] = await ethers.getSigners();
//   const safeWalletAddress = "0xddC05793C103ddaa7A3dc2b3Ca2C17611b98D7E1";
//   const primary_sale_fee_percent_initial = 15000000000000000000n;
//   const secondary_sale_fee_percent_initial = 5000000000000000000n;
//   const collector_fee_initial = 3000000000000000000n;
//   const max_royalty_initial = 20000000000000000000n;
//   const auction_duration = 86400;
//   const auction_extension_duration = 300;

//   const MintGoldDustCompanyFactory = await ethers.getContractFactory(
//     "MintGoldDustCompany"
//   );
//   const mintGoldDustCompany = await upgrades.deployProxy(
//     MintGoldDustCompanyFactory,
//     [
//       safeWalletAddress,
//       primary_sale_fee_percent_initial,
//       secondary_sale_fee_percent_initial,
//       collector_fee_initial,
//       max_royalty_initial,
//       auction_duration,
//       auction_extension_duration,
//     ],
//     { initializer: "initialize" }
//   );
//   await mintGoldDustCompany.deployed();
//   console.log("MintGoldDustCompany deployed to:", mintGoldDustCompany.address);

//   const mintGoldDustCompanyImplementationAddress =
//     await upgrades.erc1967.getImplementationAddress(
//       mintGoldDustCompany.address
//     );
//   console.log(
//     "MintGoldDustCompany Implementation deployed to:",
//     mintGoldDustCompanyImplementationAddress
//   );

//   const mintGoldDustCompanyProxyAdminAddress =
//     await upgrades.erc1967.getAdminAddress(mintGoldDustCompany.address);
//   console.log(
//     "MintGoldDustCompany Proxy Admin deployed to:",
//     mintGoldDustCompanyProxyAdminAddress
//   );

//   const contractAddresses = {
//     MintGoldDustCompany: {
//       proxy: mintGoldDustCompany.address,
//       implementation: mintGoldDustCompanyImplementationAddress,
//       proxyAdmin: mintGoldDustCompanyProxyAdminAddress,
//     },
//   };

//   fs.writeFileSync(
//     "contractAddresses.json",
//     JSON.stringify(contractAddresses, null, 2)
//   );

//   console.log("Contract addresses saved to companyAddresses.json");
// }

// main()
//   .then(() => process.exit(0))
//   .catch((error) => {
//     console.error(error);
//     process.exit(1);
//   });

// export {};
