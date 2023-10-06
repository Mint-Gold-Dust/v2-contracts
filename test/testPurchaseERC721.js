const { deployProxy, upgradeProxy } = require("@openzeppelin/truffle-upgrades");

const MintGoldDustERC721 = artifacts.require("MintGoldDustERC721.sol");
const MintGoldDustSetPrice = artifacts.require("MintGoldDustSetPrice.sol");
const MintGoldDustCompany = artifacts.require("MintGoldDustCompany.sol");
const Web3Utils = require("web3-utils");

contract(
  "Purchase NFT on primary market",
  function ([deployer, addr1, addr2, ...others]) {
    let mintGoldDustERC721, mintGoldDustSetPrice, mintGoldDustCompany;
    // ... your other variables

    let fee;
    let balance;
    let collFee;
    let primarySaleFee;
    let amountToMint = 1;
    let amountToList = 1;
    let amountToBuy = 1;
    let priceToList = 20;
    let priceToBuy = priceToList * amountToBuy;

    // beforeEach(async () => {
    //   //   console.log("DEPLOYER: ", deployer);
    //   //   const accounts = await web3.eth.getAccounts();
    //   //   console.log(accounts);
    //   //   mintGoldDustERC721 = await MintGoldDustERC721.new({ from: accounts[0] });
    //   //   mintGoldDustSetPrice = await MintGoldDustSetPrice.new({
    //   //     from: accounts[0],
    //   //   });
    //   //   mintGoldDustCompany = await MintGoldDustCompany.new({
    //   //     from: accounts[0],
    //   //   });

    //   //   deployer.deploy("MintGoldDustSetPrice");
    //   //   deployer.deploy("MintGoldDustERC721");
    //   //   deployer.deploy("MintGoldDustCompany");

    //   //   mintGoldDustSetPrice = await MintGoldDustSetPrice.deployed();
    //   //   mintGoldDustERC721 = await MintGoldDustERC721.deployed();
    //   mintGoldDustCompany = await MintGoldDustCompany.deployed();

    //   const owner = await mintGoldDustCompany.owner();
    //   console.log(owner);

    //   // MGD owner whitelist the artist
    //   //   console.log("CONTRACT: ", mintGoldDustCompany);
    //   //   await mintGoldDustCompany.whitelist(addr1, true, { from: deployer });

    //   //   const encoder = new TextEncoder();
    //   //   const bytesMEMOIR = encoder.encode(MEMOIR);

    //   //   // addr1 mints a nft
    //   //   await mintGoldDustERC721.mintNft(
    //   //     URI,
    //   //     Web3Utils.toWei("5", "ether"),
    //   //     amountToMint,
    //   //     bytesMEMOIR,
    //   //     { from: addr1 }
    //   //   );

    //   //   // Artist approve gdMarketPlace marketplace to exchange its NFT
    //   //   await mintGoldDustERC721.setApprovalForAll(
    //   //     mintGoldDustSetPrice.address,
    //   //     true,
    //   //     { from: addr1 }
    //   //   );

    //   //   await mintGoldDustSetPrice.list(
    //   //     1,
    //   //     amountToList,
    //   //     mintGoldDustERC721.address,
    //   //     Web3Utils.toWei(priceToList.toString(), "ether"),
    //   //     { from: addr1 }
    //   //   );

    //   //   fee = (priceToList * primary_sale_fee_percent) / 100;
    //   //   collFee = (priceToList * collector_fee) / 100;
    //   //   primarySaleFee = fee;
    //   //   balance = priceToList - primarySaleFee;

    //   //   const existing = await MintGoldDustSetPrice.deployed();
    //   //   await upgradeProxy(existing.address, MintGoldDustSetPrice, { deployer });

    //   // ... the rest of your setup
    // });

    it("Should ...", async function () {
      // Note: web3.js uses promises, not async/await, by default for contract calls
      //   const mintGoldDustCompany = await deployProxy(MintGoldDustCompany, [
      //     deployer,
      //   ]);
      //   const owner = await mintGoldDustCompany.owner();
      //   console.log(owner);

      let deployer = await web3.eth.getBalance(deployer);

      console.log("Test: ", deployer);

      let sellerInitialEthBal = await web3.eth.getBalance(addr1);

      console.log("Test: ", sellerInitialEthBal);

      // ... the rest of your test

      // For example, converting ethers BigNumbers and utility functions
      // You would replace things like:
      // let someValue = ethers.BigNumber.from(someVar).add(someOtherVar);
      // With:
      //   let someValue = Web3Utils.toBN(someVar).add(Web3Utils.toBN(someOtherVar));
    });
  }
);
