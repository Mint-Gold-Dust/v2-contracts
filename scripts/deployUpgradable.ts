const { ethers, upgrades } = require("hardhat");
const fs = require("fs");

async function main() {
  const [deployer] = await ethers.getSigners();
  const primary_sale_fee_percent_initial = 15000000000000000000n;
  const secondary_sale_fee_percent_initial = 5000000000000000000n;
  const collector_fee_initial = 3000000000000000000n;
  const max_royalty_initial = 20000000000000000000n;

  console.log("Deploying contracts with the account:", deployer.address);

  /************************************** MGDCompany INIT *************************************/

  const MGDCompanyFactory = await ethers.getContractFactory("MGDCompany");
  const mgdCompany = await upgrades.deployProxy(
    MGDCompanyFactory,
    [
      deployer.address,
      primary_sale_fee_percent_initial,
      secondary_sale_fee_percent_initial,
      collector_fee_initial,
      max_royalty_initial,
    ],
    { initializer: "initialize" }
  );
  await mgdCompany.deployed();
  console.log("MGDCompany deployed to:", mgdCompany.address);

  const mgdCompanyImplementationAddress =
    await upgrades.erc1967.getImplementationAddress(mgdCompany.address);
  console.log(
    "MintGoldDustERC721 Implementation deployed to:",
    mgdCompanyImplementationAddress
  );

  const mgdCompanyProxyAdminAddress = await upgrades.erc1967.getAdminAddress(
    mgdCompany.address
  );
  console.log(
    "MintGoldDustERC721 Proxy Admin deployed to:",
    mgdCompanyProxyAdminAddress
  );
  /************************************** MGDCompany FINAL ************************************/

  /**************************************** MGD721 INIT ***************************************/

  // Deploy MintGoldDustERC721 contract
  const MGDnftFactory = await ethers.getContractFactory("MintGoldDustERC721");
  const mintGoldDustERC721 = await upgrades.deployProxy(
    MGDnftFactory,
    [mgdCompany.address],
    { initializer: "initialize" }
  );
  await mintGoldDustERC721.deployed();
  console.log(
    "MintGoldDustERC721 Proxy deployed to:",
    mintGoldDustERC721.address
  );

  const nftImplementationAddress =
    await upgrades.erc1967.getImplementationAddress(mintGoldDustERC721.address);
  console.log(
    "MintGoldDustERC721 Implementation deployed to:",
    nftImplementationAddress
  );

  const nftProxyAdminAddress = await upgrades.erc1967.getAdminAddress(
    mintGoldDustERC721.address
  );
  console.log(
    "MintGoldDustERC721 Proxy Admin deployed to:",
    nftProxyAdminAddress
  );
  /**************************************** MGD721 FINAL ***************************************/

  /************************************* MGDSetPrice INIT **************************************/
  // Deploy MGDSetPrice contract
  const MGDSetPriceFactory = await ethers.getContractFactory("MGDSetPrice");
  const mgdSetPrice = await upgrades.deployProxy(
    MGDSetPriceFactory,
    [mgdCompany.address, mintGoldDustERC721.address],
    { initializer: "initialize" }
  );
  await mgdSetPrice.deployed();
  console.log("MGDSetPrice Proxy deployed to:", mgdSetPrice.address);

  const setPriceImplementationAddress =
    await upgrades.erc1967.getImplementationAddress(mgdSetPrice.address);
  console.log(
    "MGDSetPrice Implementation deployed to:",
    setPriceImplementationAddress
  );

  const setPriceProxyAdminAddress = await upgrades.erc1967.getAdminAddress(
    mgdSetPrice.address
  );
  console.log(
    "MGDSetPrice Proxy Admin deployed to:",
    setPriceProxyAdminAddress
  );
  /************************************* MGDSetPrice FINAL *************************************/

  /************************************** MGDAuction INIT **************************************/
  // Deploy MGDAuction contract
  const MGDAuctionFactory = await ethers.getContractFactory("MGDAuction");
  const mgdAuction = await upgrades.deployProxy(
    MGDAuctionFactory,
    [mgdCompany.address, mintGoldDustERC721.address],
    { initializer: "initialize" }
  );
  await mgdAuction.deployed();
  console.log("MGDAuction Proxy deployed to:", mgdAuction.address);

  const auctionImplementationAddress =
    await upgrades.erc1967.getImplementationAddress(mgdAuction.address);
  console.log(
    "MGDAuction Implementation deployed to:",
    auctionImplementationAddress
  );

  const auctionProxyAdminAddress = await upgrades.erc1967.getAdminAddress(
    mgdAuction.address
  );
  console.log("MGDAuction Proxy Admin deployed to:", auctionProxyAdminAddress);
  /************************************** MGDAuction FINAL *************************************/

  /**************************************** MGDMemoir INIT ***************************************/
  // Deploy MGDMemoir contract
  const MGDMemoirFactory = await ethers.getContractFactory("MGDMemoir");
  const mgdMemoir = await upgrades.deployProxy(MGDMemoirFactory, [], {
    initializer: "initialize",
  });
  await mgdMemoir.deployed();
  console.log("MGDMemoir Proxy deployed to:", mgdMemoir.address);

  const memoirImplementationAddress =
    await upgrades.erc1967.getImplementationAddress(mgdMemoir.address);
  console.log(
    "MGDMemoir Implementation deployed to:",
    memoirImplementationAddress
  );

  const memoirProxyAdminAddress = await upgrades.erc1967.getAdminAddress(
    mgdMemoir.address
  );
  console.log("MGDMemoir Proxy Admin deployed to:", memoirProxyAdminAddress);
  /**************************************** MGDMemoir FINAL **************************************/

  const contractAddresses = {
    MGDCompany: {
      proxy: mgdCompany.address,
      implementation: mgdCompanyImplementationAddress,
      proxyAdmin: mgdCompanyProxyAdminAddress,
    },
    MintGoldDustERC721: {
      proxy: mintGoldDustERC721.address,
      implementation: nftImplementationAddress,
      proxyAdmin: nftProxyAdminAddress,
    },
    MGDSetPrice: {
      proxy: mgdSetPrice.address,
      implementation: setPriceImplementationAddress,
      proxyAdmin: setPriceProxyAdminAddress,
    },
    MGDAuction: {
      proxy: mgdAuction.address,
      implementation: auctionImplementationAddress,
      proxyAdmin: auctionProxyAdminAddress,
    },
    MGDMemoir: {
      proxy: mgdMemoir.address,
      implementation: memoirImplementationAddress,
      proxyAdmin: memoirProxyAdminAddress,
    },
  };

  fs.writeFileSync(
    "contractAddresses.json",
    JSON.stringify(contractAddresses, null, 2)
  );

  console.log("Contract addresses saved to contractAddresses.json");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
