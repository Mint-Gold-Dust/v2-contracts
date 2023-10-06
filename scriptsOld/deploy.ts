// const { ethers, upgrades } = require("hardhat");
// const fs = require("fs");

// async function main() {
//   const [deployer] = await ethers.getSigners();
//   const primary_sale_fee_percent_initial = 15000000000000000000n;
//   const secondary_sale_fee_percent_initial = 5000000000000000000n;
//   const collector_fee_initial = 3000000000000000000n;
//   const max_royalty_initial = 20000000000000000000n; const auction_duration = 5;
const auction_extension_duration = 1;

//   console.log("Deploying contracts with the account:", deployer.address);

//   // Deploy MintGoldDustCompany contract
//   const MGDCompanyFactory = await ethers.getContractFactory("MintGoldDustCompany");
//   const mgdCompany = await MGDCompanyFactory.deploy(
//     deployer.address,
//     primary_sale_fee_percent_initial,
//     secondary_sale_fee_percent_initial,
//     collector_fee_initial,
//     max_royalty_initial
//   );
//   await mgdCompany.deployed();
//   console.log("MintGoldDustCompany deployed to:", mgdCompany.address);

//   // Deploy MintGoldDustERC721 contract
//   const MGDnftFactory = await ethers.getContractFactory("MintGoldDustERC721");
//   const mintGoldDustERC721 = await MGDnftFactory.deploy(mgdCompany.address);
//   await mintGoldDustERC721.deployed();
//   console.log("MintGoldDustERC721 deployed to:", mintGoldDustERC721.address);

//   // Deploy MintGoldDustSetPrice contract
//   const MGDSetPriceFactory = await ethers.getContractFactory("MintGoldDustSetPrice");
//   const mgdSetPrice = await MGDSetPriceFactory.deploy(
//     mgdCompany.address,
//     mintGoldDustERC721.address
//   );
//   await mgdSetPrice.deployed();
//   console.log("MintGoldDustSetPrice deployed to:", mgdSetPrice.address);

//   // Deploy MGDAuction contract
//   const MGDAuctionFactory = await ethers.getContractFactory("MGDAuction");
//   const mgdAuction = await MGDAuctionFactory.deploy(
//     mgdCompany.address,
//     mintGoldDustERC721.address
//   );
//   await mgdAuction.deployed();
//   console.log("MGDAuction deployed to:", mgdAuction.address);

//   // Deploy MintGoldDustMemoir contract
//   const MGDMemoirFactory = await ethers.getContractFactory("MintGoldDustMemoir");
//   const mgdMemoir = await MGDMemoirFactory.deploy();
//   await mgdMemoir.deployed();
//   console.log("MintGoldDustMemoir deployed to:", mgdMemoir.address);

//   // Save important addresses to a JSON file
//   const addresses = {
//     mgdCompany: mgdCompany.address,
//     mintGoldDustERC721: mintGoldDustERC721.address,
//     mgdSetPrice: mgdSetPrice.address,
//     mgdAuction: mgdAuction.address,
//     mgdMemoir: mgdMemoir.address, // Add this line
//   };

//   fs.writeFileSync(
//     "deployed_addresses.json",
//     JSON.stringify(addresses, null, 2)
//   );
//   console.log("Deployed contract addresses saved to deployed_addresses.json");
// }

// // function saveFrontendFiles(contract: any, name: string) {
// //   const fs = require("fs");
// //   const contractsDir = __dirname + "/../../frontend/contractsData";

// //   if (!fs.existsSync(contractsDir)) {
// //     fs.mkdirSync(contractsDir);
// //   }

// //   fs.writeFileSync(
// //     contractsDir + `/${name}-address.json`,
// //     JSON.stringify({ address: contract.address }, undefined, 2)
// //   );

// //   const contractArtifact = artifacts.readArtifactSync(name);

// //   fs.writeFileSync(
// //     contractsDir + `/${name}.json`,
// //     JSON.stringify(contractArtifact, null, 2)
// //   );
// // }

// main()
//   .then(() => process.exit(0))
//   .catch((error) => {
//     console.error(error);
//     process.exit(1);
//   });