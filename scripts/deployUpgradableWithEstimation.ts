/**
 * @dev This one will deploy all the contracts first time with the upgrade proxy pattern
 *      So for each contract we'll have 3 addresses:
 *        - The proxy address: The one that will always be used to interact with the contract
 *        - The implementation address: The one that will be upgraded
 *        - The proxy admin address: The one that will be used to upgrade the proxy
 */
const { ethers, upgrades } = require("hardhat");
const fs = require("fs");

async function main() {
  const [deployer] = await ethers.getSigners(); // The metamask account
  const primary_sale_fee_percent_initial = 15000000000000000000n; // 15%
  const secondary_sale_fee_percent_initial = 5000000000000000000n; // 5%
  const collector_fee_initial = 3000000000000000000n; // 3%
  const max_royalty_initial = 20000000000000000000n; // 20%
  const auction_duration = 86400; // 1 day or 24 hours
  const auction_extension_duration = 300; // 5 minutes

  console.log("Deploying contracts with the account:", deployer.address);

  /************************************** MintGoldDustCompany INIT *************************************/

  const MintGoldDustCompanyFactory = await ethers.getContractFactory(
    "MintGoldDustCompany"
  );

  const mintGoldDustCompanyProxyInstance = await upgrades.deployProxy(
    MintGoldDustCompanyFactory,
    [
      deployer.address,
      primary_sale_fee_percent_initial,
      secondary_sale_fee_percent_initial,
      collector_fee_initial,
      max_royalty_initial,
      auction_duration,
      auction_extension_duration,
    ],
    { initializer: "initialize" }
  );

  await mintGoldDustCompanyProxyInstance.deployTransaction.wait();

  const mintGoldDustCompanyTxHash =
    mintGoldDustCompanyProxyInstance.deployTransaction.hash;
  const receipt = await ethers.provider.getTransactionReceipt(
    mintGoldDustCompanyTxHash
  );

  const mintGoldDustCompanyGasEstimate = receipt.gasUsed;

  console.log(
    "MintGoldDustCompany deployed to:",
    mintGoldDustCompanyProxyInstance.address
  );
  console.log("Deployment gas used:", mintGoldDustCompanyGasEstimate);

  const mintGoldDustCompanyGasPrice = await ethers.provider.getGasPrice();
  const mintGoldDustCompanyTotalFee = mintGoldDustCompanyGasEstimate.mul(
    mintGoldDustCompanyGasPrice
  );
  console.log(
    `Total fee for MintGoldDustCompany: ${ethers.utils.formatEther(
      mintGoldDustCompanyTotalFee
    )} ETH`
  );

  await mintGoldDustCompanyProxyInstance.deployed();

  const mintGoldDustCompanyImplementationAddress =
    await upgrades.erc1967.getImplementationAddress(
      mintGoldDustCompanyProxyInstance.address
    );
  console.log(
    "MintGoldDustCompany Implementation deployed to:",
    mintGoldDustCompanyImplementationAddress
  );

  const mintGoldDustCompanyProxyAdminAddress =
    await upgrades.erc1967.getAdminAddress(
      mintGoldDustCompanyProxyInstance.address
    );
  console.log(
    "MintGoldDustCompany Proxy Admin deployed to:",
    mintGoldDustCompanyProxyAdminAddress
  );
  /************************************** MintGoldDustCompany FINAL ************************************/

  /**************************************** MintGoldDustMemoir INIT ***************************************/

  // Get the MintGoldDustMemoir contract factory
  const MintGoldDustMemoirFactory = await ethers.getContractFactory(
    "MintGoldDustMemoir"
  );

  // Deploy the MintGoldDustMemoir as a proxy contract with its initializer
  const mintGoldDustMemoirProxyInstance = await upgrades.deployProxy(
    MintGoldDustMemoirFactory,
    [],
    { initializer: "initialize" }
  );

  // Ensure the deployment transaction is confirmed
  await mintGoldDustMemoirProxyInstance.deployTransaction.wait();

  // Fetch the transaction receipt to get the gas used for the deployment
  const mintGoldDustMemoirTxHash =
    mintGoldDustMemoirProxyInstance.deployTransaction.hash;
  const memoirReceipt = await ethers.provider.getTransactionReceipt(
    mintGoldDustMemoirTxHash
  );
  const mintGoldDustMemoirGasEstimate = memoirReceipt.gasUsed;

  // Output the deployed address and gas information
  console.log(
    "MintGoldDustMemoir deployed to:",
    mintGoldDustMemoirProxyInstance.address
  );
  console.log("Deployment gas used:", mintGoldDustMemoirGasEstimate);

  // Calculate the total deployment fee in ETH
  const mintGoldDustMemoirGasPrice = await ethers.provider.getGasPrice();
  const mintGoldDustMemoirTotalFee = mintGoldDustMemoirGasEstimate.mul(
    mintGoldDustMemoirGasPrice
  );
  console.log(
    `Total fee for MintGoldDustMemoir: ${ethers.utils.formatEther(
      mintGoldDustMemoirTotalFee
    )} ETH`
  );

  // Fetch and output the implementation and admin addresses of the proxy contract
  const mintGoldDustMemoirImplementationAddress =
    await upgrades.erc1967.getImplementationAddress(
      mintGoldDustMemoirProxyInstance.address
    );
  console.log(
    "MintGoldDustMemoir Implementation deployed to:",
    mintGoldDustMemoirImplementationAddress
  );

  const mintGoldDustMemoirProxyAdminAddress =
    await upgrades.erc1967.getAdminAddress(
      mintGoldDustMemoirProxyInstance.address
    );
  console.log(
    "MintGoldDustMemoir Proxy Admin deployed to:",
    mintGoldDustMemoirProxyAdminAddress
  );
  // /**************************************** MintGoldDustMemoir FINAL **************************************/

  // /**************************************** MGD721 INIT ***************************************/

  // Get the MintGoldDustERC721 contract factory
  const MintGoldDustERC721Factory = await ethers.getContractFactory(
    "MintGoldDustERC721"
  );

  // Deploy the MintGoldDustERC721 as a proxy contract with its initializer
  const mintGoldDustERC721ProxyInstance = await upgrades.deployProxy(
    MintGoldDustERC721Factory,
    [mintGoldDustCompanyProxyInstance.address],
    { initializer: "initializeChild" }
  );

  // Ensure the deployment transaction is confirmed
  await mintGoldDustERC721ProxyInstance.deployTransaction.wait();

  // Fetch the transaction receipt to get the gas used for the deployment
  const mintGoldDustERC721TxHash =
    mintGoldDustERC721ProxyInstance.deployTransaction.hash;
  const erc721Receipt = await ethers.provider.getTransactionReceipt(
    mintGoldDustERC721TxHash
  );
  const mintGoldDustERC721GasEstimate = erc721Receipt.gasUsed;

  // Output the deployed address and gas information
  console.log(
    "MintGoldDustERC721 deployed to:",
    mintGoldDustERC721ProxyInstance.address
  );
  console.log("Deployment gas used:", mintGoldDustERC721GasEstimate);

  // Calculate the total deployment fee in ETH
  const mintGoldDustERC721GasPrice = await ethers.provider.getGasPrice();
  const mintGoldDustERC721TotalFee = mintGoldDustERC721GasEstimate.mul(
    mintGoldDustERC721GasPrice
  );
  console.log(
    `Total fee for MintGoldDustERC721: ${ethers.utils.formatEther(
      mintGoldDustERC721TotalFee
    )} ETH`
  );

  // Fetch and output the implementation and admin addresses of the proxy contract
  const mintGoldDustERC721ImplementationAddress =
    await upgrades.erc1967.getImplementationAddress(
      mintGoldDustERC721ProxyInstance.address
    );
  console.log(
    "MintGoldDustERC721 Implementation deployed to:",
    mintGoldDustERC721ImplementationAddress
  );

  const mintGoldDustERC721ProxyAdminAddress =
    await upgrades.erc1967.getAdminAddress(
      mintGoldDustERC721ProxyInstance.address
    );
  console.log(
    "MintGoldDustERC721 Proxy Admin deployed to:",
    mintGoldDustERC721ProxyAdminAddress
  );
  /**************************************** MGD721 FINAL ***************************************/

  // /**************************************** MGD1155 INIT ***************************************/

  // Deploy MintGoldDustERC1155 contract
  // Get the MintGoldDustERC1155 contract factory
  const MintGoldDustERC1155Factory = await ethers.getContractFactory(
    "MintGoldDustERC1155"
  );

  // Deploy the MintGoldDustERC1155 as a proxy contract with its initializer
  const mintGoldDustERC1155ProxyInstance = await upgrades.deployProxy(
    MintGoldDustERC1155Factory,
    [mintGoldDustCompanyProxyInstance.address, "www.mgd.com"],
    { initializer: "initializeChild" }
  );

  // Ensure the deployment transaction is confirmed
  await mintGoldDustERC1155ProxyInstance.deployTransaction.wait();

  // Fetch the transaction receipt to get the gas used for the deployment
  const mintGoldDustERC1155TxHash =
    mintGoldDustERC1155ProxyInstance.deployTransaction.hash;
  const erc1155Receipt = await ethers.provider.getTransactionReceipt(
    mintGoldDustERC1155TxHash
  );
  const mintGoldDustERC1155GasEstimate = erc1155Receipt.gasUsed;

  // Output the deployed address and gas information
  console.log(
    "MintGoldDustERC1155 deployed to:",
    mintGoldDustERC1155ProxyInstance.address
  );
  console.log("Deployment gas used:", mintGoldDustERC1155GasEstimate);

  // Calculate the total deployment fee in ETH
  const mintGoldDustERC1155GasPrice = await ethers.provider.getGasPrice();
  const mintGoldDustERC1155TotalFee = mintGoldDustERC1155GasEstimate.mul(
    mintGoldDustERC1155GasPrice
  );
  console.log(
    `Total fee for MintGoldDustERC1155: ${ethers.utils.formatEther(
      mintGoldDustERC1155TotalFee
    )} ETH`
  );

  // Fetch and output the implementation and admin addresses of the proxy contract
  const mintGoldDustERC1155ImplementationAddress =
    await upgrades.erc1967.getImplementationAddress(
      mintGoldDustERC1155ProxyInstance.address
    );
  console.log(
    "MintGoldDustERC1155 Implementation deployed to:",
    mintGoldDustERC1155ImplementationAddress
  );

  const mintGoldDustERC1155ProxyAdminAddress =
    await upgrades.erc1967.getAdminAddress(
      mintGoldDustERC1155ProxyInstance.address
    );
  console.log(
    "MintGoldDustERC1155 Proxy Admin deployed to:",
    mintGoldDustERC1155ProxyAdminAddress
  );
  /**************************************** MGD1155 FINAL ***************************************/

  /************************************* MintGoldDustSetPrice INIT **************************************/
  // Get the MintGoldDustSetPrice contract factory
  const MintGoldDustSetPriceFactory = await ethers.getContractFactory(
    "MintGoldDustSetPrice"
  );

  // Deploy the MintGoldDustSetPrice as a proxy contract with its initializer
  const mintGoldDustSetPriceProxyInstance = await upgrades.deployProxy(
    MintGoldDustSetPriceFactory,
    [
      mintGoldDustCompanyProxyInstance.address,
      mintGoldDustERC721ProxyInstance.address,
      mintGoldDustERC1155ProxyInstance.address,
    ],
    { initializer: "initializeChild" }
  );

  // Ensure the deployment transaction is confirmed
  await mintGoldDustSetPriceProxyInstance.deployTransaction.wait();

  // Fetch the transaction receipt to get the gas used for the deployment
  const mintGoldDustSetPriceTxHash =
    mintGoldDustSetPriceProxyInstance.deployTransaction.hash;
  const setPriceReceipt = await ethers.provider.getTransactionReceipt(
    mintGoldDustSetPriceTxHash
  );
  const mintGoldDustSetPriceGasEstimate = setPriceReceipt.gasUsed;

  // Output the deployed address and gas information
  console.log(
    "MintGoldDustSetPrice deployed to:",
    mintGoldDustSetPriceProxyInstance.address
  );
  console.log("Deployment gas used:", mintGoldDustSetPriceGasEstimate);

  // Calculate the total deployment fee in ETH
  const mintGoldDustSetPriceGasPrice = await ethers.provider.getGasPrice();
  const mintGoldDustSetPriceTotalFee = mintGoldDustSetPriceGasEstimate.mul(
    mintGoldDustSetPriceGasPrice
  );
  console.log(
    `Total fee for MintGoldDustSetPrice: ${ethers.utils.formatEther(
      mintGoldDustSetPriceTotalFee
    )} ETH`
  );

  // Fetch and output the implementation and admin addresses of the proxy contract
  const mintGoldDustSetPriceImplementationAddress =
    await upgrades.erc1967.getImplementationAddress(
      mintGoldDustSetPriceProxyInstance.address
    );
  console.log(
    "MintGoldDustSetPrice Implementation deployed to:",
    mintGoldDustSetPriceImplementationAddress
  );

  const mintGoldDustSetPriceProxyAdminAddress =
    await upgrades.erc1967.getAdminAddress(
      mintGoldDustSetPriceProxyInstance.address
    );
  console.log(
    "MintGoldDustSetPrice Proxy Admin deployed to:",
    mintGoldDustSetPriceProxyAdminAddress
  );
  /************************************* MintGoldDustSetPrice FINAL *************************************/

  /************************************** MintGoldDustMarketplaceAuction INIT **************************************/
  // Get the MintGoldDustMarketplaceAuction contract factory
  const MintGoldDustMarketplaceAuctionFactory = await ethers.getContractFactory(
    "MintGoldDustMarketplaceAuction"
  );

  // Deploy the MintGoldDustMarketplaceAuction as a proxy contract with its initializer
  const mintGoldDustMarketplaceAuctionProxyInstance =
    await upgrades.deployProxy(
      MintGoldDustMarketplaceAuctionFactory,
      [
        mintGoldDustCompanyProxyInstance.address,
        mintGoldDustERC721ProxyInstance.address,
        mintGoldDustERC1155ProxyInstance.address,
      ],
      { initializer: "initializeChild" }
    );

  // Ensure the deployment transaction is confirmed
  await mintGoldDustMarketplaceAuctionProxyInstance.deployTransaction.wait();

  // Fetch the transaction receipt to get the gas used for the deployment
  const marketplaceAuctionTxHash =
    mintGoldDustMarketplaceAuctionProxyInstance.deployTransaction.hash;
  const marketplaceAuctionReceipt = await ethers.provider.getTransactionReceipt(
    marketplaceAuctionTxHash
  );
  const mintGoldDustMarketplaceAuctionGasEstimate =
    marketplaceAuctionReceipt.gasUsed;

  // Output the deployed address and gas information
  console.log(
    "MintGoldDustMarketplaceAuction deployed to:",
    mintGoldDustMarketplaceAuctionProxyInstance.address
  );
  console.log(
    "Deployment gas used:",
    mintGoldDustMarketplaceAuctionGasEstimate
  );

  // Calculate the total deployment fee in ETH
  const marketplaceAuctionGasPrice = await ethers.provider.getGasPrice();
  const marketplaceAuctionTotalFee =
    mintGoldDustMarketplaceAuctionGasEstimate.mul(marketplaceAuctionGasPrice);
  console.log(
    `Total fee for MintGoldDustMarketplaceAuction: ${ethers.utils.formatEther(
      marketplaceAuctionTotalFee
    )} ETH`
  );

  // Fetch and output the implementation and admin addresses of the proxy contract
  const mintGoldDustMarketplaceAuctionImplementationAddress =
    await upgrades.erc1967.getImplementationAddress(
      mintGoldDustMarketplaceAuctionProxyInstance.address
    );
  console.log(
    "MintGoldDustMarketplaceAuction Implementation deployed to:",
    mintGoldDustMarketplaceAuctionImplementationAddress
  );

  const mintGoldDustMarketplaceAuctionProxyAdminAddress =
    await upgrades.erc1967.getAdminAddress(
      mintGoldDustMarketplaceAuctionProxyInstance.address
    );
  console.log(
    "MintGoldDustMarketplaceAuction Proxy Admin deployed to:",
    mintGoldDustMarketplaceAuctionProxyAdminAddress
  );

  // Interact with other contracts to set references
  await mintGoldDustMarketplaceAuctionProxyInstance
    .connect(deployer)
    .setMintGoldDustMarketplace(mintGoldDustSetPriceProxyInstance.address);

  await mintGoldDustSetPriceProxyInstance
    .connect(deployer)
    .setMintGoldDustMarketplace(
      mintGoldDustMarketplaceAuctionProxyInstance.address
    );

  await mintGoldDustERC1155ProxyInstance
    .connect(deployer)
    .setMintGoldDustSetPriceAddress(mintGoldDustSetPriceProxyInstance.address);

  await mintGoldDustERC721ProxyInstance
    .connect(deployer)
    .setMintGoldDustSetPriceAddress(mintGoldDustSetPriceProxyInstance.address);

  await mintGoldDustERC1155ProxyInstance
    .connect(deployer)
    .setMintGoldDustMarketplaceAuctionAddress(
      mintGoldDustMarketplaceAuctionProxyInstance.address
    );

  await mintGoldDustERC721ProxyInstance
    .connect(deployer)
    .setMintGoldDustMarketplaceAuctionAddress(
      mintGoldDustMarketplaceAuctionProxyInstance.address
    );
  /************************************** MintGoldDustMarketplaceAuction FINAL *************************************/

  const contractAddresses = {
    MintGoldDustCompany: {
      proxy: mintGoldDustCompanyProxyInstance.address,
      implementation: mintGoldDustCompanyImplementationAddress,
      proxyAdmin: mintGoldDustCompanyProxyAdminAddress,
    },
    MintGoldDustMemoir: {
      proxy: mintGoldDustMemoirProxyInstance.address,
      implementation: mintGoldDustMemoirImplementationAddress,
      proxyAdmin: mintGoldDustMemoirProxyAdminAddress,
    },
    MintGoldDustERC721: {
      proxy: mintGoldDustERC721ProxyInstance.address,
      implementation: mintGoldDustERC721ImplementationAddress,
      proxyAdmin: mintGoldDustERC721ProxyAdminAddress,
    },
    MintGoldDustERC1155: {
      proxy: mintGoldDustERC1155ProxyInstance.address,
      implementation: mintGoldDustERC1155ImplementationAddress,
      proxyAdmin: mintGoldDustERC1155ProxyAdminAddress,
    },
    MintGoldDustSetPrice: {
      proxy: mintGoldDustSetPriceProxyInstance.address,
      implementation: mintGoldDustSetPriceImplementationAddress,
      proxyAdmin: mintGoldDustSetPriceProxyAdminAddress,
    },
    MGDAuction: {
      proxy: mintGoldDustMarketplaceAuctionProxyInstance.address,
      implementation: mintGoldDustMarketplaceAuctionImplementationAddress,
      proxyAdmin: mintGoldDustMarketplaceAuctionProxyAdminAddress,
    },
  };

  fs.writeFileSync(
    "contractAddresses.json",
    JSON.stringify(contractAddresses, null, 2)
  );

  console.log("Contract addresses saved to contractAddresses.json");

  // Here I need to sum the total fee of the deployment of all the contracts and console log
  const totalFee = mintGoldDustCompanyTotalFee
    .add(mintGoldDustMemoirTotalFee)
    .add(mintGoldDustERC721TotalFee)
    .add(mintGoldDustERC1155TotalFee)
    .add(mintGoldDustSetPriceTotalFee)
    .add(marketplaceAuctionTotalFee);

  console.log(
    "Total fee for all contracts:",
    ethers.utils.formatEther(totalFee)
  );
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

export {};
