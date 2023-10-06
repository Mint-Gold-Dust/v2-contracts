const { deployProxy, erc1967 } = require('@openzeppelin/truffle-upgrades');
const fs = require('fs');
const BigNumber = require('bignumber.js');

const MintGoldDustCompany = artifacts.require('MintGoldDustCompany');
const MintGoldDustMemoir = artifacts.require('MintGoldDustMemoir');
const MintGoldDustERC721 = artifacts.require('MintGoldDustERC721');
const MintGoldDustERC1155 = artifacts.require('MintGoldDustERC1155');
const MintGoldDustSetPrice = artifacts.require('MintGoldDustSetPrice');
const MintGoldDustMarketplaceAuction = artifacts.require('MintGoldDustMarketplaceAuction');



module.exports = async function (deployer, network, accounts) {
  const deployerAccount = accounts[0]; // The first account (usually the deployer)
  
  console.log("Deploying contracts with the account:", deployerAccount);

  /************************************** MintGoldDustCompany INIT *************************************/
  const mintGoldDustCompanyInstance = await deployProxy(
    MintGoldDustCompany,
    [
      deployerAccount
    ],
    { deployer, initializer: 'initialize' }
  );

  console.log("MintGoldDustCompany deployed to:", mintGoldDustCompanyInstance.address);

  const mintGoldDustCompanyImplementationAddress = await erc1967.getImplementationAddress(mintGoldDustCompanyInstance.address);
  console.log("MintGoldDustCompany Implementation deployed to:", mintGoldDustCompanyImplementationAddress);

  const mintGoldDustCompanyProxyAdminAddress = await erc1967.getAdminAddress(mintGoldDustCompanyInstance.address);
  console.log("MintGoldDustCompany Proxy Admin deployed to:", mintGoldDustCompanyProxyAdminAddress);
  /************************************** MintGoldDustCompany FINAL ************************************/

  /**************************************** MintGoldDustMemoir INIT ***************************************/
  const mintGoldDustMemoirInstance = await deployProxy(
    MintGoldDustMemoir,
    [],
    { deployer, initializer: 'initialize' }
  );

  console.log("MintGoldDustMemoir deployed to:", mintGoldDustMemoirInstance.address);

  const mintGoldDustMemoirImplementationAddress = await erc1967.getImplementationAddress(mintGoldDustMemoirInstance.address);
  console.log("MintGoldDustMemoir Implementation deployed to:", mintGoldDustMemoirImplementationAddress);

  const mintGoldDustMemoirProxyAdminAddress = await erc1967.getAdminAddress(mintGoldDustMemoirInstance.address);
  console.log("MintGoldDustMemoir Proxy Admin deployed to:", mintGoldDustMemoirProxyAdminAddress);
  /**************************************** MintGoldDustMemoir FINAL **************************************/
    /**************************************** MintGoldDustERC721 INIT ***************************************/
    const mintGoldDustERC721Instance = await deployProxy(
      MintGoldDustERC721,
      [mintGoldDustCompanyInstance.address],
      { deployer, initializer: 'initializeChild' }
    );
  
    console.log("MintGoldDustERC721 deployed to:", mintGoldDustERC721Instance.address);
  
    const mintGoldDustERC721ImplementationAddress = await erc1967.getImplementationAddress(mintGoldDustERC721Instance.address);
    console.log("MintGoldDustERC721 Implementation deployed to:", mintGoldDustERC721ImplementationAddress);
  
    const mintGoldDustERC721ProxyAdminAddress = await erc1967.getAdminAddress(mintGoldDustERC721Instance.address);
    console.log("MintGoldDustERC721 Proxy Admin deployed to:", mintGoldDustERC721ProxyAdminAddress);
    /**************************************** MintGoldDustERC721 FINAL ***************************************/
  
    /**************************************** MintGoldDustERC1155 INIT ***************************************/
    const mintGoldDustERC1155Instance = await deployProxy(
      MintGoldDustERC1155,
      [mintGoldDustCompanyInstance.address, "www.mgd.com"],
      { deployer, initializer: 'initializeChild' }
    );
  
    console.log("MintGoldDustERC1155 deployed to:", mintGoldDustERC1155Instance.address);
  
    const mintGoldDustERC1155ImplementationAddress = await erc1967.getImplementationAddress(mintGoldDustERC1155Instance.address);
    console.log("MintGoldDustERC1155 Implementation deployed to:", mintGoldDustERC1155ImplementationAddress);
  
    const mintGoldDustERC1155ProxyAdminAddress = await erc1967.getAdminAddress(mintGoldDustERC1155Instance.address);
    console.log("MintGoldDustERC1155 Proxy Admin deployed to:", mintGoldDustERC1155ProxyAdminAddress);
    /**************************************** MintGoldDustERC1155 FINAL ***************************************/

      /************************************* MintGoldDustSetPrice INIT **************************************/
  const mintGoldDustSetPriceInstance = await deployProxy(
    MintGoldDustSetPrice,
    [
      mintGoldDustCompanyInstance.address,
      mintGoldDustERC721Instance.address,
      mintGoldDustERC1155Instance.address
    ],
    { deployer, initializer: 'initializeChild' }
  );

  console.log("MintGoldDustSetPrice Proxy deployed to:", mintGoldDustSetPriceInstance.address);

  const mintGoldDustSetPriceImplementationAddress = await erc1967.getImplementationAddress(mintGoldDustSetPriceInstance.address);
  console.log("MintGoldDustSetPrice Implementation deployed to:", mintGoldDustSetPriceImplementationAddress);

  const mintGoldDustSetPriceProxyAdminAddress = await erc1967.getAdminAddress(mintGoldDustSetPriceInstance.address);
  console.log("MintGoldDustSetPrice Proxy Admin deployed to:", mintGoldDustSetPriceProxyAdminAddress);
  /************************************* MintGoldDustSetPrice FINAL **************************************/

  /************************************** MintGoldDustMarketplaceAuction INIT **************************************/
  const mintGoldDustMarketplaceAuctionInstance = await deployProxy(
    MintGoldDustMarketplaceAuction,
    [
      mintGoldDustCompanyInstance.address,
      mintGoldDustERC721Instance.address,
      mintGoldDustERC1155Instance.address
    ],
    { deployer, initializer: 'initializeChild' }
  );

  console.log("MintGoldDustMarketplaceAuction Proxy deployed to:", mintGoldDustMarketplaceAuctionInstance.address);

  const mintGoldDustMarketplaceAuctionImplementationAddress = await erc1967.getImplementationAddress(mintGoldDustMarketplaceAuctionInstance.address);
  console.log("MintGoldDustMarketplaceAuction Implementation deployed to:", mintGoldDustMarketplaceAuctionImplementationAddress);

  const mintGoldDustMarketplaceAuctionProxyAdminAddress = await erc1967.getAdminAddress(mintGoldDustMarketplaceAuctionInstance.address);
  console.log("MintGoldDustMarketplaceAuction Proxy Admin deployed to:", mintGoldDustMarketplaceAuctionProxyAdminAddress);
  /************************************** MintGoldDustMarketplaceAuction FINAL **************************************/

  // Setting dependencies between contracts
  await mintGoldDustMarketplaceAuctionInstance.setMintGoldDustMarketplace(mintGoldDustSetPriceInstance.address);
  await mintGoldDustSetPriceInstance.setMintGoldDustMarketplace(mintGoldDustMarketplaceAuctionInstance.address);
  await mintGoldDustERC1155Instance.setMintGoldDustSetPriceAddress(mintGoldDustSetPriceInstance.address);
  await mintGoldDustERC721Instance.setMintGoldDustSetPriceAddress(mintGoldDustSetPriceInstance.address);
  await mintGoldDustERC1155Instance.setMintGoldDustMarketplaceAuctionAddress(mintGoldDustMarketplaceAuctionInstance.address);
  await mintGoldDustERC721Instance.setMintGoldDustMarketplaceAuctionAddress(mintGoldDustMarketplaceAuctionInstance.address);
  await mintGoldDustCompanyInstance.transferOwnership("0x2ffF8cE20E450959C4b5BD8b037AD9692FCd508F");
  /************************************** MintGoldDustMarketplaceAuction FINAL *************************************/

  // Saving contract addresses to a JSON file for easy access
  const contractAddresses = {
    MintGoldDustCompany: {
      proxy: mintGoldDustCompanyInstance.address,
      implementation: mintGoldDustCompanyImplementationAddress,
      proxyAdmin: mintGoldDustCompanyProxyAdminAddress,
    },
    MintGoldDustMemoir: {
      proxy: mintGoldDustMemoirInstance.address,
      implementation: mintGoldDustMemoirImplementationAddress,
      proxyAdmin: mintGoldDustMemoirProxyAdminAddress,
    },
    MintGoldDustERC721: {
      proxy: mintGoldDustERC721Instance.address,
      implementation: mintGoldDustERC721ImplementationAddress,
      proxyAdmin: mintGoldDustERC721ProxyAdminAddress,
    },
    MintGoldDustERC1155: {
      proxy: mintGoldDustERC1155Instance.address,
      implementation: mintGoldDustERC1155ImplementationAddress,
      proxyAdmin: mintGoldDustERC1155ProxyAdminAddress,
    },
    MintGoldDustSetPrice: {
      proxy: mintGoldDustSetPriceInstance.address,
      implementation: mintGoldDustSetPriceImplementationAddress,
      proxyAdmin: mintGoldDustSetPriceProxyAdminAddress,
    },
    MGDAuction: {
      proxy: mintGoldDustMarketplaceAuctionInstance.address,
      implementation: mintGoldDustMarketplaceAuctionImplementationAddress,
      proxyAdmin: mintGoldDustMarketplaceAuctionProxyAdminAddress,
    }
  };

  fs.writeFileSync(
    'contractAddresses.json',
    JSON.stringify(contractAddresses, null, 2)
  );

  console.log('Contract addresses saved to contractAddresses.json');


};
