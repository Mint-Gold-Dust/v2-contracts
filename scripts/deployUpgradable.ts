const { ethers, upgrades } = require("hardhat");
const fs = require("fs");

async function main() {
  const [deployer] = await ethers.getSigners();
  const primary_sale_fee_percent_initial = 15000000000000000000n;
  const secondary_sale_fee_percent_initial = 5000000000000000000n;
  const collector_fee_initial = 3000000000000000000n;
  const max_royalty_initial = 20000000000000000000n;
  const auction_duration = 5;
  const auction_extension_duration = 1;

  console.log("Deploying contracts with the account:", deployer.address);

  /************************************** MintGoldDustCompany INIT *************************************/

  const MintGoldDustCompanyFactory = await ethers.getContractFactory(
    "MintGoldDustCompany"
  );
  const mintGoldDustCompany = await upgrades.deployProxy(
    MintGoldDustCompanyFactory,
    [
      deployer.address,
      primary_sale_fee_percent_initial,
      secondary_sale_fee_percent_initial,
      collector_fee_initial,
      max_royalty_initial,
    ],
    { initializer: "initialize" }
  );
  await mintGoldDustCompany.deployed();
  console.log("MintGoldDustCompany deployed to:", mintGoldDustCompany.address);

  const mintGoldDustCompanyImplementationAddress =
    await upgrades.erc1967.getImplementationAddress(
      mintGoldDustCompany.address
    );
  console.log(
    "MintGoldDustCompany Implementation deployed to:",
    mintGoldDustCompanyImplementationAddress
  );

  const mintGoldDustCompanyProxyAdminAddress =
    await upgrades.erc1967.getAdminAddress(mintGoldDustCompany.address);
  console.log(
    "MintGoldDustCompany Proxy Admin deployed to:",
    mintGoldDustCompanyProxyAdminAddress
  );
  /************************************** MintGoldDustCompany FINAL ************************************/

  /**************************************** MintGoldDustMemoir INIT ***************************************/
  // Deploy MintGoldDustMemoir contract
  const MintGoldDustMemoirFactory = await ethers.getContractFactory(
    "MintGoldDustMemoir"
  );
  const mintGoldDustMemoir = await upgrades.deployProxy(
    MintGoldDustMemoirFactory,
    [],
    {
      initializer: "initialize",
    }
  );
  await mintGoldDustMemoir.deployed();
  console.log(
    "MintGoldDustMemoir Proxy deployed to:",
    mintGoldDustMemoir.address
  );

  const mintGoldDustMemoirImplementationAddress =
    await upgrades.erc1967.getImplementationAddress(mintGoldDustMemoir.address);
  console.log(
    "MintGoldDustMemoir Implementation deployed to:",
    mintGoldDustMemoirImplementationAddress
  );

  const mintGoldDustMemoirProxyAdminAddress =
    await upgrades.erc1967.getAdminAddress(mintGoldDustMemoir.address);
  console.log(
    "MintGoldDustMemoir Proxy Admin deployed to:",
    mintGoldDustMemoirProxyAdminAddress
  );
  /**************************************** MintGoldDustMemoir FINAL **************************************/

  /**************************************** MGD721 INIT ***************************************/

  // Deploy MintGoldDustERC721 contract
  const MintGoldDustERC721Factory = await ethers.getContractFactory(
    "MintGoldDustERC721"
  );
  const mintGoldDustERC721 = await upgrades.deployProxy(
    MintGoldDustERC721Factory,
    [mintGoldDustCompany.address, mintGoldDustMemoir.address],
    { initializer: "initializeChild" }
  );

  await mintGoldDustERC721.deployed();
  console.log(
    "MintGoldDustERC721 Proxy deployed to:",
    mintGoldDustERC721.address
  );

  const mintGoldDustERC721ImplementationAddress =
    await upgrades.erc1967.getImplementationAddress(mintGoldDustERC721.address);
  console.log(
    "MintGoldDustERC721 Implementation deployed to:",
    mintGoldDustERC721ImplementationAddress
  );

  const mintGoldDustERC721ProxyAdminAddress =
    await upgrades.erc1967.getAdminAddress(mintGoldDustERC721.address);
  console.log(
    "MintGoldDustERC721 Proxy Admin deployed to:",
    mintGoldDustERC721ProxyAdminAddress
  );
  /**************************************** MGD721 FINAL ***************************************/

  /**************************************** MGD1155 INIT ***************************************/

  // Deploy MintGoldDustERC1155 contract
  const MintGoldDustERC1155Factory = await ethers.getContractFactory(
    "MintGoldDustERC1155"
  );
  const mintGoldDustERC1155 = await upgrades.deployProxy(
    MintGoldDustERC1155Factory,
    [mintGoldDustCompany.address, mintGoldDustMemoir.address, "www.mgd.com"],
    { initializer: "initializeChild" }
  );

  await mintGoldDustERC1155.deployed();
  console.log(
    "MintGoldDustERC1155 Proxy deployed to:",
    mintGoldDustERC1155.address
  );

  const mintGoldDustERC1155ImplementationAddress =
    await upgrades.erc1967.getImplementationAddress(
      mintGoldDustERC1155.address
    );
  console.log(
    "MintGoldDustERC1155 Implementation deployed to:",
    mintGoldDustERC1155ImplementationAddress
  );

  const mintGoldDustERC1155ProxyAdminAddress =
    await upgrades.erc1967.getAdminAddress(mintGoldDustERC1155.address);
  console.log(
    "MintGoldDustERC1155 Proxy Admin deployed to:",
    mintGoldDustERC1155ProxyAdminAddress
  );
  /**************************************** MGD1155 FINAL ***************************************/

  /************************************* MintGoldDustSetPrice INIT **************************************/
  // Deploy MintGoldDustSetPrice contract
  const MintGoldDustSetPriceFactory = await ethers.getContractFactory(
    "MintGoldDustSetPrice"
  );
  const mintGoldDustSetPrice = await upgrades.deployProxy(
    MintGoldDustSetPriceFactory,
    [
      mintGoldDustCompany.address,
      mintGoldDustERC721.address,
      mintGoldDustERC1155.address,
    ],
    { initializer: "initializeChild" }
  );
  await mintGoldDustSetPrice.deployed();
  console.log(
    "MintGoldDustSetPrice Proxy deployed to:",
    mintGoldDustSetPrice.address
  );

  const mintGoldDustSetPriceImplementationAddress =
    await upgrades.erc1967.getImplementationAddress(
      mintGoldDustSetPrice.address
    );
  console.log(
    "MintGoldDustSetPrice Implementation deployed to:",
    mintGoldDustSetPriceImplementationAddress
  );

  const mintGoldDustSetPriceProxyAdminAddress =
    await upgrades.erc1967.getAdminAddress(mintGoldDustSetPrice.address);
  console.log(
    "MintGoldDustSetPrice Proxy Admin deployed to:",
    mintGoldDustSetPriceProxyAdminAddress
  );
  /************************************* MintGoldDustSetPrice FINAL *************************************/

  /************************************** MintGoldDustMarketplaceAuction INIT **************************************/
  // Deploy MintGoldDustMarketplaceAuction contract
  const MintGoldDustMarketplaceAuctionFactory = await ethers.getContractFactory(
    "MintGoldDustMarketplaceAuction"
  );
  const mintGoldDustMarketplaceAuction = await upgrades.deployProxy(
    MintGoldDustMarketplaceAuctionFactory,
    [
      mintGoldDustCompany.address,
      mintGoldDustERC721.address,
      mintGoldDustERC1155.address,
    ],
    { initializer: "initializeChild" }
  );
  await mintGoldDustMarketplaceAuction.deployed();
  console.log(
    "MintGoldDustMarketplaceAuction Proxy deployed to:",
    mintGoldDustMarketplaceAuction.address
  );

  const mintGoldDustMarketplaceAuctionImplementationAddress =
    await upgrades.erc1967.getImplementationAddress(
      mintGoldDustMarketplaceAuction.address
    );
  console.log(
    "MintGoldDustMarketplaceAuction Implementation deployed to:",
    mintGoldDustMarketplaceAuctionImplementationAddress
  );

  const mintGoldDustMarketplaceAuctionProxyAdminAddress =
    await upgrades.erc1967.getAdminAddress(
      mintGoldDustMarketplaceAuction.address
    );
  console.log(
    "MintGoldDustMarketplaceAuction Proxy Admin deployed to:",
    mintGoldDustMarketplaceAuctionProxyAdminAddress
  );
  /************************************** MintGoldDustMarketplaceAuction FINAL *************************************/

  const contractAddresses = {
    MintGoldDustCompany: {
      proxy: mintGoldDustCompany.address,
      implementation: mintGoldDustCompanyImplementationAddress,
      proxyAdmin: mintGoldDustCompanyProxyAdminAddress,
    },
    MintGoldDustMemoir: {
      proxy: mintGoldDustMemoir.address,
      implementation: mintGoldDustMemoirImplementationAddress,
      proxyAdmin: mintGoldDustMemoirProxyAdminAddress,
    },
    MintGoldDustERC721: {
      proxy: mintGoldDustERC721.address,
      implementation: mintGoldDustERC721ImplementationAddress,
      proxyAdmin: mintGoldDustERC721ProxyAdminAddress,
    },
    MintGoldDustERC1155: {
      proxy: mintGoldDustERC1155.address,
      implementation: mintGoldDustERC1155ImplementationAddress,
      proxyAdmin: mintGoldDustERC1155ProxyAdminAddress,
    },
    MintGoldDustSetPrice: {
      proxy: mintGoldDustSetPrice.address,
      implementation: mintGoldDustSetPriceImplementationAddress,
      proxyAdmin: mintGoldDustSetPriceProxyAdminAddress,
    },
    MGDAuction: {
      proxy: mintGoldDustMarketplaceAuction.address,
      implementation: mintGoldDustMarketplaceAuctionImplementationAddress,
      proxyAdmin: mintGoldDustMarketplaceAuctionProxyAdminAddress,
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
