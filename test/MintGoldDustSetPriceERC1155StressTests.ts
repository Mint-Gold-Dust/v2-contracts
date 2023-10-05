require("dotenv").config();
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect, use } from "chai";
import { Contract, ContractFactory } from "ethers";
import { ethers } from "hardhat";
import chai from "chai";
import chaiAsPromised from "chai-as-promised";

chai.use(chaiAsPromised);

const toWei = (num: any) => ethers.utils.parseEther(num.toString());
const fromWei = (num: any) => ethers.utils.formatEther(num);

describe("MintGoldDustSetPrice.sol Smart Contract \n___________________________________________________\n \nThis smart contract is responsible by all functionalities related with the fixed price market. \n Here goes the tests related with the MintGoldDustSetPrice market and the MintGoldDustERC1155 tokens. \n\n", function () {
  let MintGoldDustERC721: ContractFactory;
  let mintGoldDustERC721: Contract;

  let MintGoldDustERC1155: ContractFactory;
  let mintGoldDustERC1155: Contract;

  let MintGoldDustCompany: ContractFactory;
  let mgdCompany: Contract;

  let MintGoldDustSetPrice: ContractFactory;
  let mintGoldDustSetPrice: Contract;

  let MintGoldDustMemoir: ContractFactory;
  let mintGoldDustMemoir: Contract;

  let MintGoldDustMarketplaceAuction: ContractFactory;
  let mintGoldDustMarketplaceAuction: Contract;

  let deployer: SignerWithAddress;
  let addr1: SignerWithAddress;
  let addr2: SignerWithAddress;
  let addr3: SignerWithAddress;
  let addrs: SignerWithAddress[];

  let URI = "sample URI";
  let baseURI = "https://example.com/{id}.json";

  const MEMOIR = "This is a great moment of my life!";

  //const REAL_OWNER = "0x46ab5D1518688f66286aF7c6C9f5552edd050d15";
  const TEST_OWNER = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266";
  const primary_sale_fee_percent_initial = 15000000000000000000n;
  const secondary_sale_fee_percent_initial = 5000000000000000000n;
  const collector_fee_initial = 3000000000000000000n;
  const max_royalty_initial = 20000000000000000000n;
  const auction_duration = 5;
  const auction_extension_duration = 1;

  let primary_sale_fee_percent = 15;
  let secondary_sale_fee_percent = 5;
  let collector_fee = 3;
  let max_royalty = 20;
  let royalty = 5;

  beforeEach(async function () {
    MintGoldDustCompany = await ethers.getContractFactory(
      "MintGoldDustCompany"
    );
    MintGoldDustERC721 = await ethers.getContractFactory("MintGoldDustERC721");
    MintGoldDustSetPrice = await ethers.getContractFactory(
      "MintGoldDustSetPrice"
    );
    MintGoldDustMarketplaceAuction = await ethers.getContractFactory(
      "MintGoldDustMarketplaceAuction"
    );

    MintGoldDustERC1155 = await ethers.getContractFactory(
      "MintGoldDustERC1155"
    );
    MintGoldDustMemoir = await ethers.getContractFactory("MintGoldDustMemoir");

    mintGoldDustMemoir = await MintGoldDustMemoir.deploy();
    await mintGoldDustMemoir.deployed();

    [deployer, addr1, addr2, addr3, ...addrs] = await ethers.getSigners();

    mgdCompany = await upgrades.deployProxy(
      MintGoldDustCompany,
      [
        TEST_OWNER,
      ],
      { initializer: "initialize" }
    );
    await mgdCompany.deployed();

    mintGoldDustERC721 = await upgrades.deployProxy(
      MintGoldDustERC721,
      [mgdCompany.address],
      {
        initializer: "initializeChild",
      }
    );

    mintGoldDustERC1155 = await upgrades.deployProxy(
      MintGoldDustERC1155,
      [mgdCompany.address, baseURI],
      {
        initializer: "initializeChild",
      }
    );
    await mintGoldDustERC1155.deployed();

    mintGoldDustSetPrice = await upgrades.deployProxy(
      MintGoldDustSetPrice,
      [
        mgdCompany.address,
        mintGoldDustERC721.address,
        mintGoldDustERC1155.address,
      ],
      { initializer: "initializeChild" }
    );
    await mintGoldDustSetPrice.deployed();

    mintGoldDustMarketplaceAuction = await upgrades.deployProxy(
      MintGoldDustMarketplaceAuction,
      [
        mgdCompany.address,
        mintGoldDustERC721.address,
        mintGoldDustERC1155.address,
      ],
      { initializer: "initializeChild" }
    );
    await mintGoldDustMarketplaceAuction.deployed();

    await mgdCompany.connect(deployer).setValidator(deployer.address, true);

    await mintGoldDustERC1155
      .connect(deployer)
      .setMintGoldDustSetPriceAddress(mintGoldDustSetPrice.address);

    await mintGoldDustERC721
      .connect(deployer)
      .setMintGoldDustSetPriceAddress(mintGoldDustSetPrice.address);

    await mintGoldDustERC1155
      .connect(deployer)
      .setMintGoldDustMarketplaceAuctionAddress(
        mintGoldDustMarketplaceAuction.address
      );

    await mintGoldDustERC721
      .connect(deployer)
      .setMintGoldDustMarketplaceAuctionAddress(
        mintGoldDustMarketplaceAuction.address
      );

    await mintGoldDustMarketplaceAuction
      .connect(deployer)
      .setMintGoldDustMarketplace(mintGoldDustSetPrice.address);

    await mintGoldDustSetPrice
      .connect(deployer)
      .setMintGoldDustMarketplace(mintGoldDustMarketplaceAuction.address);
  });

  describe("\n--------------- Purchase NFT on primary market ---------------\n", function () {
    // Calculate the fee and balance values based on the price
    let fee: number;
    let balance: number;
    let collFee: number;
    let primarySaleFee: number;
    let amountToMint = 10;
    let amountToList = 5;
    let amountToBuy = 3;
    let priceToList = 20;
    let priceToBuy = priceToList * amountToBuy;

    beforeEach(async () => {
      // MGD owner whitelist the artist
      await mgdCompany.connect(deployer).whitelist(addr1.address, true);

      const encoder = new TextEncoder();
      const bytesMEMOIR = encoder.encode(MEMOIR);

      // addr1 mints a nft
      await mintGoldDustERC1155
        .connect(addr1)
        .mintNft(URI, toWei(5), amountToMint, bytesMEMOIR);
      // Artist approve gdMarketPlace marketplace to exchange its NFT
      await mintGoldDustERC1155
        .connect(addr1)
        .setApprovalForAll(mintGoldDustSetPrice.address, true);

      await mintGoldDustERC1155
        .connect(addr2)
        .setApprovalForAll(mintGoldDustSetPrice.address, true);

      await mintGoldDustERC1155
        .connect(addr3)
        .setApprovalForAll(mintGoldDustSetPrice.address, true);

      await mintGoldDustSetPrice
        .connect(addr1)
        .list(1, amountToList, mintGoldDustERC1155.address, toWei(priceToList));

      fee = (priceToBuy * primary_sale_fee_percent) / 100;
      collFee = (priceToBuy * collector_fee) / 100;
      primarySaleFee = fee;
      balance = priceToBuy - primarySaleFee;
    });

    it("Should handle multiple simultaneous purchases correctly", async () => {
      let sellerInitalEthBal = await addr1.getBalance();
      let feeAccountInitialEthBal = await deployer.getBalance();
      let feeAccountAfterEthBalShouldBe = ethers.BigNumber.from(
        feeAccountInitialEthBal
      ).add(toWei(primarySaleFee + collFee));

      let totalAmount = priceToList * 3;
      totalAmount = totalAmount + (totalAmount * 3) / 100; // 3 ETH for each token

      // First Buyer tries to buy 3 NFTs
      const firstBuyerTx = mintGoldDustSetPrice.connect(addr2).purchaseNft(
        {
          tokenId: 1,
          amount: 3,
          contractAddress: mintGoldDustERC1155.address,
          seller: addr1.address,
        },
        {
          value: toWei(totalAmount),
        }
      );

      // Second Buyer tries to buy 3 NFTs (which should fail because only 2 would be remaining)
      const secondBuyerTx = mintGoldDustSetPrice.connect(addr3).purchaseNft(
        {
          tokenId: 1,
          amount: 3,
          contractAddress: mintGoldDustERC1155.address,
          seller: addr1.address,
        },
        {
          value: toWei(totalAmount),
        }
      );

      // Execute the transactions
      await firstBuyerTx;

      await expect(secondBuyerTx).to.be.revertedWithCustomError(
        mintGoldDustSetPrice,
        "LessItemsListedThanTheRequiredAmount"
      );

      // Validate the final balances, NFT ownerships, etc.
      expect(await mintGoldDustERC1155.balanceOf(addr2.address, 1)).to.equal(3);
      expect(await mintGoldDustERC1155.balanceOf(addr3.address, 1)).to.equal(0);

      // Validate remaining listed amount
      expect(
        (
          await mintGoldDustSetPrice
            .connect(addr2)
            .isSecondarySale(mintGoldDustERC1155.address, 1)
        ).amount
      ).to.be.equal(7);

      // verify if the marketplace owner's balance increased the fee
      expect(await deployer.getBalance()).to.be.equal(
        feeAccountAfterEthBalShouldBe
      );

      // verify if the seller received the balance
      expect(await addr1.getBalance()).to.be.equal(
        ethers.BigNumber.from(sellerInitalEthBal).add(toWei(balance))
      );

      // Now the second owner will list only two NFTs
      let addr2BalanceOf = await mintGoldDustERC1155.balanceOf(
        addr2.address,
        1
      );

      let amountToListForSecondary = addr2BalanceOf - 1;
      let amountToBuyForSecondary = amountToListForSecondary - 1;
      let priceToListForSecondary = 3;
      let priceToBuyForSecondary =
        priceToListForSecondary * amountToBuyForSecondary;

      await mintGoldDustSetPrice
        .connect(addr2)
        .list(
          1,
          amountToListForSecondary,
          mintGoldDustERC1155.address,
          toWei(priceToListForSecondary)
        );

      addr2BalanceOf = addr2BalanceOf - amountToListForSecondary;

      let secondarySaleFee =
        (priceToBuyForSecondary * secondary_sale_fee_percent) / 100;
      let royaltyFee = (priceToBuyForSecondary * royalty) / 100;
      let balance2 = priceToBuyForSecondary - (secondarySaleFee + royaltyFee);

      let gasPrice = await mintGoldDustSetPrice.signer.getGasPrice();
      let gasLimit = await mintGoldDustSetPrice.estimateGas.purchaseNft(
        {
          tokenId: 1,
          amount: amountToBuyForSecondary,
          contractAddress: mintGoldDustERC1155.address,
          seller: addr2.address,
        },
        {
          value: toWei(priceToBuyForSecondary),
        }
      );

      // Try to list again and get the error. Is not possible to list more than the same tokenId
      await expect(
        mintGoldDustSetPrice
          .connect(addr2)
          .list(
            1,
            addr2BalanceOf,
            mintGoldDustERC1155.address,
            toWei(priceToList)
          )
      ).to.be.revertedWithCustomError(
        mintGoldDustSetPrice,
        "ItemIsAlreadyListed"
      );

      // get the addr2 buyer initial balance
      let addr2BalanceBefore = await addr2.getBalance();
      feeAccountInitialEthBal = await deployer.getBalance();
      let addr3BalanceBefore = await addr3.getBalance();

      // Second Buyer tries to buy 3 NFTs (which should fail because only 2 would be remaining)
      await mintGoldDustSetPrice.connect(addr3).purchaseNft(
        {
          tokenId: 1,
          amount: amountToBuyForSecondary,
          contractAddress: mintGoldDustERC1155.address,
          seller: addr2.address,
        },
        {
          value: toWei(priceToBuyForSecondary),
        }
      );

      // verify if the seller received the balance
      expect(await addr2.getBalance()).to.be.equal(
        ethers.BigNumber.from(addr2BalanceBefore).add(toWei(balance2))
      );

      let addr3ShouldBeAfter = ethers.BigNumber.from(addr3BalanceBefore)
        .sub(toWei(priceToBuyForSecondary))
        .sub(ethers.BigNumber.from(gasPrice).mul(gasLimit));
      expect(
        parseFloat(parseFloat(fromWei(await addr3.getBalance())).toFixed(3))
      ).to.be.equal(
        parseFloat(parseFloat(fromWei(addr3ShouldBeAfter)).toFixed(3))
      );

      feeAccountAfterEthBalShouldBe = ethers.BigNumber.from(
        feeAccountInitialEthBal
      ).add(toWei(secondarySaleFee));

      // verify if the marketplace owner's balance increased the fee
      expect(await deployer.getBalance()).to.be.equal(
        feeAccountAfterEthBalShouldBe
      );

      // Validate the final balances, NFT ownerships, etc.
      expect(await mintGoldDustERC1155.balanceOf(addr1.address, 1)).to.equal(
        amountToList
      ); // 5 NFTs
      expect(await mintGoldDustERC1155.balanceOf(addr2.address, 1)).to.equal(
        addr2BalanceOf
      ); // 1 NFT
      expect(await mintGoldDustERC1155.balanceOf(addr3.address, 1)).to.equal(
        amountToBuyForSecondary
      ); // 1 NFTs

      expect(
        await mintGoldDustERC1155.balanceOf(mintGoldDustSetPrice.address, 1)
      ).to.equal(amountToList - amountToBuy + amountToBuyForSecondary); // 3 NFTs should be remaining

      // Validate remaining listed amount
      expect(
        (
          await mintGoldDustSetPrice
            .connect(addr2)
            .isSecondarySale(mintGoldDustERC1155.address, 1)
        ).amount
      ).to.be.equal(7);

      // Try to list again and get the error. Is not possible to list more than the same tokenId
      await expect(
        mintGoldDustSetPrice
          .connect(addr1)
          .list(
            1,
            amountToList,
            mintGoldDustERC1155.address,
            toWei(priceToList)
          )
      ).to.be.revertedWithCustomError(
        mintGoldDustSetPrice,
        "ItemIsAlreadyListed"
      );

      await mintGoldDustSetPrice.connect(addr1).delistNft({
        tokenId: 1,
        amount: 2,
        contractAddress: mintGoldDustERC1155.address,
      });

      await expect(
        mintGoldDustSetPrice.connect(addr1).delistNft({
          tokenId: 1,
          amount: 1,
          contractAddress: mintGoldDustERC1155.address,
        })
      ).to.be.revertedWithCustomError(
        mintGoldDustSetPrice,
        "ItemIsNotListedBySeller"
      );

      // Validate the final balances, NFT ownerships, etc.
      expect(await mintGoldDustERC1155.balanceOf(addr1.address, 1)).to.equal(
        amountToList - amountToBuy + amountToList
      ); // 7 NFTs
      expect(await mintGoldDustERC1155.balanceOf(addr2.address, 1)).to.equal(
        addr2BalanceOf
      ); // 1 NFT
      expect(await mintGoldDustERC1155.balanceOf(addr3.address, 1)).to.equal(
        amountToBuyForSecondary
      ); // 1 NFTs

      expect(
        await mintGoldDustERC1155.balanceOf(mintGoldDustSetPrice.address, 1)
      ).to.equal(amountToBuyForSecondary); // 1 NFTs should be remaining

      // Must revert it the addr1 tries to buy the tokenId listed but of a different seller that is not that have listed it
      await expect(
        mintGoldDustSetPrice.connect(addr1).purchaseNft(
          {
            tokenId: 1,
            amount: amountToBuyForSecondary,
            contractAddress: mintGoldDustERC1155.address,
            seller: addr3.address,
          },
          {
            value: toWei(priceToBuyForSecondary),
          }
        )
      ).to.be.revertedWithCustomError(
        mintGoldDustSetPrice,
        "ItemIsNotListedBySeller"
      );

      // get the addr2 buyer initial balance
      sellerInitalEthBal = await addr1.getBalance();
      addr2BalanceBefore = await addr2.getBalance();
      feeAccountInitialEthBal = await deployer.getBalance();
      addr3BalanceBefore = await addr3.getBalance();

      await mintGoldDustSetPrice.connect(addr1).purchaseNft(
        {
          tokenId: 1,
          amount: amountToBuyForSecondary,
          contractAddress: mintGoldDustERC1155.address,
          seller: addr2.address,
        },
        {
          value: toWei(priceToBuyForSecondary),
        }
      );

      // verify if the seller received the balance
      expect(await addr2.getBalance()).to.be.equal(
        ethers.BigNumber.from(addr2BalanceBefore).add(toWei(balance2))
      );

      let addr1ShouldBeAfter = ethers.BigNumber.from(sellerInitalEthBal)
        .sub(toWei(priceToBuyForSecondary))
        .sub(ethers.BigNumber.from(gasPrice).mul(gasLimit))
        .add(toWei(royaltyFee));
      expect(
        parseFloat(parseFloat(fromWei(await addr1.getBalance())).toFixed(3))
      ).to.be.equal(
        parseFloat(parseFloat(fromWei(addr1ShouldBeAfter)).toFixed(3))
      );

      feeAccountAfterEthBalShouldBe = ethers.BigNumber.from(
        feeAccountInitialEthBal
      ).add(toWei(secondarySaleFee));

      // verify if the marketplace owner's balance increased the fee
      expect(await deployer.getBalance()).to.be.equal(
        feeAccountAfterEthBalShouldBe
      );

      let addr1BalanceOfAfterAll =
        amountToList - amountToBuy + amountToList + amountToBuyForSecondary;

      // Validate the final balances, NFT ownerships, etc.
      expect(await mintGoldDustERC1155.balanceOf(addr1.address, 1)).to.equal(
        addr1BalanceOfAfterAll
      ); // 8 NFTs
      expect(await mintGoldDustERC1155.balanceOf(addr2.address, 1)).to.equal(
        addr2BalanceOf
      ); // 1 NFT
      expect(await mintGoldDustERC1155.balanceOf(addr3.address, 1)).to.equal(
        amountToBuyForSecondary
      ); // 1 NFTs

      expect(
        await mintGoldDustERC1155.balanceOf(mintGoldDustSetPrice.address, 1)
      ).to.equal(0); // 0 NFTs should be remaining

      await expect(
        mintGoldDustSetPrice
          .connect(addr1)
          .list(
            1,
            addr1BalanceOfAfterAll,
            mintGoldDustERC1155.address,
            toWei(priceToList)
          )
      ).to.be.revertedWith("Invalid amount for primary sale");

      // Artist approve gdMarketPlace marketplace to exchange its MintGoldDustER721
      await mintGoldDustERC1155
        .connect(addr1)
        .setApprovalForAll(mintGoldDustMarketplaceAuction.address, true);

      const priceToListForAuction = 10;
      totalAmount = (priceToListForAuction * 3) / 100;
      totalAmount = totalAmount + priceToListForAuction;

      await mintGoldDustMarketplaceAuction
        .connect(addr1)
        .list(1, 3, mintGoldDustERC1155.address, toWei(priceToListForAuction));

      expect(
        await mintGoldDustERC1155.balanceOf(
          mintGoldDustMarketplaceAuction.address,
          1
        )
      ).to.equal(3); // 3 NFTs

      console.log("addr1BalanceOfAfterAll", addr1BalanceOfAfterAll - 4);

      await mintGoldDustSetPrice.connect(addr1).list(
        1,
        addr1BalanceOfAfterAll - 4, // 4 NFTs
        mintGoldDustERC1155.address,
        toWei(priceToList)
      );

      console.log(
        "addr1BalanceOfAfterAll",
        await mintGoldDustERC1155.balanceOf(addr1.address, 1)
      );

      //Validate the final balances, NFT ownerships, etc.
      expect(await mintGoldDustERC1155.balanceOf(addr1.address, 1)).to.equal(1); // 1 NFTs
      expect(await mintGoldDustERC1155.balanceOf(addr2.address, 1)).to.equal(1); // 1 NFT

      expect(
        await mintGoldDustERC1155.balanceOf(mintGoldDustSetPrice.address, 1)
      ).to.equal(4); // 4 NFTs

      expect(
        await mintGoldDustERC1155.balanceOf(
          mintGoldDustMarketplaceAuction.address,
          1
        )
      ).to.equal(3); // 3 NFTs

      sellerInitalEthBal = await addr1.getBalance();
      addr2BalanceBefore = await addr2.getBalance();
      feeAccountInitialEthBal = await deployer.getBalance();
      addr3BalanceBefore = await addr3.getBalance();

      fee = (priceToListForAuction * primary_sale_fee_percent) / 100;
      collFee = (priceToListForAuction * collector_fee) / 100;
      primarySaleFee = fee;
      balance = priceToListForAuction - primarySaleFee;

      const _timeout = 5 * 1000; // seconds

      await mintGoldDustMarketplaceAuction.connect(addr2).placeBid(
        {
          tokenId: 1,
          contractAddress: mintGoldDustERC1155.address,
          seller: addr1.address,
        },
        {
          value: toWei(totalAmount),
        }
      );

      await new Promise((resolve) => setTimeout(resolve, _timeout));

      await mintGoldDustMarketplaceAuction.connect(addr2).endAuction({
        tokenId: 1,
        contractAddress: mintGoldDustERC1155.address,
        seller: addr1.address,
      });

      addr2BalanceOf = addr2BalanceOf + 3;
      addr1BalanceOfAfterAll = addr1BalanceOfAfterAll - 3;

      // Validate the final balances, NFT ownerships, etc.
      expect(await mintGoldDustERC1155.balanceOf(addr1.address, 1)).to.equal(1); // 5 NFTs
      expect(await mintGoldDustERC1155.balanceOf(addr2.address, 1)).to.equal(4); // 3 NFT

      expect(
        await mintGoldDustERC1155.balanceOf(mintGoldDustSetPrice.address, 1)
      ).to.equal(4); // 4 NFTs

      expect(
        await mintGoldDustERC1155.balanceOf(
          mintGoldDustMarketplaceAuction.address,
          1
        )
      ).to.equal(0); // 0 NFTs

      expect(await mintGoldDustERC1155.balanceOf(addr3.address, 1)).to.equal(1); // 3 NFT

      expect(
        parseInt(await mintGoldDustERC1155.balanceOf(addr1.address, 1)) +
          parseInt(await mintGoldDustERC1155.balanceOf(addr2.address, 1)) +
          parseInt(await mintGoldDustERC1155.balanceOf(addr3.address, 1)) +
          parseInt(
            await mintGoldDustERC1155.balanceOf(mintGoldDustSetPrice.address, 1)
          ) +
          parseInt(
            await mintGoldDustERC1155.balanceOf(
              mintGoldDustMarketplaceAuction.address,
              1
            )
          )
      ).to.equal(10); // 3 NFT

      let priceToBuy = priceToList * 4;

      fee = (priceToBuy * primary_sale_fee_percent) / 100;
      collFee = (priceToBuy * collector_fee) / 100;
      primarySaleFee = fee;
      balance = priceToBuy - primarySaleFee;

      sellerInitalEthBal = await addr1.getBalance();
      feeAccountInitialEthBal = await deployer.getBalance();
      addr3BalanceBefore = await addr3.getBalance();

      sellerInitalEthBal = await addr1.getBalance();
      feeAccountInitialEthBal = await deployer.getBalance();
      feeAccountAfterEthBalShouldBe = ethers.BigNumber.from(
        feeAccountInitialEthBal
      ).add(toWei(primarySaleFee + collFee));

      expect(
        (
          await mintGoldDustSetPrice
            .connect(addr2)
            .isSecondarySale(mintGoldDustERC1155.address, 1)
        ).sold
      ).to.be.false;

      expect(
        (
          await mintGoldDustSetPrice
            .connect(addr2)
            .isSecondarySale(mintGoldDustERC1155.address, 1)
        ).amount
      ).to.be.equal(4);

      totalAmount = priceToList * 4;
      totalAmount = totalAmount + (totalAmount * 3) / 100; // 3 ETH for each token

      await mintGoldDustSetPrice.connect(addr3).purchaseNft(
        {
          tokenId: 1,
          amount: 4,
          contractAddress: mintGoldDustERC1155.address,
          seller: addr1.address,
        },
        {
          value: toWei(totalAmount),
        }
      );

      expect(
        (
          await mintGoldDustSetPrice
            .connect(addr2)
            .isSecondarySale(mintGoldDustERC1155.address, 1)
        ).sold
      ).to.be.true;

      expect(
        (
          await mintGoldDustSetPrice
            .connect(addr2)
            .isSecondarySale(mintGoldDustERC1155.address, 1)
        ).amount
      ).to.be.equal(0);

      // verify if the marketplace owner's balance increased the fee
      expect(await deployer.getBalance()).to.be.equal(
        feeAccountAfterEthBalShouldBe
      );

      // verify if the seller received the balance
      expect(await addr1.getBalance()).to.be.equal(
        ethers.BigNumber.from(sellerInitalEthBal).add(toWei(balance))
      );

      addr3ShouldBeAfter = ethers.BigNumber.from(addr3BalanceBefore)
        .sub(toWei(totalAmount))
        .sub(ethers.BigNumber.from(gasPrice).mul(gasLimit));
      expect(
        parseFloat(parseFloat(fromWei(await addr3.getBalance())).toFixed(4))
      ).to.be.equal(
        parseFloat(parseFloat(fromWei(addr3ShouldBeAfter)).toFixed(4))
      );

      // Validate the final balances, NFT ownerships, etc.
      expect(await mintGoldDustERC1155.balanceOf(addr1.address, 1)).to.equal(1); // 5 NFTs
      expect(await mintGoldDustERC1155.balanceOf(addr2.address, 1)).to.equal(4); // 3 NFT
      expect(await mintGoldDustERC1155.balanceOf(addr3.address, 1)).to.equal(5); // 3 NFT

      expect(
        await mintGoldDustERC1155.balanceOf(mintGoldDustSetPrice.address, 1)
      ).to.equal(0); // 0 NFTs

      expect(
        await mintGoldDustERC1155.balanceOf(
          mintGoldDustMarketplaceAuction.address,
          1
        )
      ).to.equal(0); // 0 NFTs

      expect(
        parseInt(await mintGoldDustERC1155.balanceOf(addr1.address, 1)) +
          parseInt(await mintGoldDustERC1155.balanceOf(addr2.address, 1)) +
          parseInt(await mintGoldDustERC1155.balanceOf(addr3.address, 1)) +
          parseInt(
            await mintGoldDustERC1155.balanceOf(mintGoldDustSetPrice.address, 1)
          ) +
          parseInt(
            await mintGoldDustERC1155.balanceOf(
              mintGoldDustMarketplaceAuction.address,
              1
            )
          )
      ).to.equal(10);

      await mintGoldDustSetPrice
        .connect(addr1)
        .list(1, 1, mintGoldDustERC1155.address, toWei(priceToList));

      secondarySaleFee = (priceToList * secondary_sale_fee_percent) / 100;
      royaltyFee = (priceToList * royalty) / 100;
      balance2 = priceToList - (secondarySaleFee + royaltyFee);

      // get the addr2 buyer initial balance
      let addr1BalanceBefore = await addr1.getBalance();
      feeAccountInitialEthBal = await deployer.getBalance();
      addr3BalanceBefore = await addr3.getBalance();

      await mintGoldDustSetPrice.connect(addr3).purchaseNft(
        {
          tokenId: 1,
          amount: 1,
          contractAddress: mintGoldDustERC1155.address,
          seller: addr1.address,
        },
        {
          value: toWei(priceToList),
        }
      );

      // verify if the seller received the balance
      expect(await addr1.getBalance()).to.be.equal(
        ethers.BigNumber.from(addr1BalanceBefore)
          .add(toWei(balance2))
          .add(toWei(royaltyFee))
      );

      addr3ShouldBeAfter = ethers.BigNumber.from(addr3BalanceBefore)
        .sub(toWei(priceToList))
        .sub(ethers.BigNumber.from(gasPrice).mul(gasLimit));
      expect(
        parseFloat(parseFloat(fromWei(await addr3.getBalance())).toFixed(3))
      ).to.be.equal(
        parseFloat(parseFloat(fromWei(addr3ShouldBeAfter)).toFixed(3))
      );

      feeAccountAfterEthBalShouldBe = ethers.BigNumber.from(
        feeAccountInitialEthBal
      ).add(toWei(secondarySaleFee));

      // verify if the marketplace owner's balance increased the fee
      expect(await deployer.getBalance()).to.be.equal(
        feeAccountAfterEthBalShouldBe
      );

      // Validate the final balances, NFT ownerships, etc.
      expect(await mintGoldDustERC1155.balanceOf(addr1.address, 1)).to.equal(0); // 0 NFTs
      expect(await mintGoldDustERC1155.balanceOf(addr2.address, 1)).to.equal(4); // 4 NFT
      expect(await mintGoldDustERC1155.balanceOf(addr3.address, 1)).to.equal(6); // 6 NFT

      expect(
        await mintGoldDustERC1155.balanceOf(mintGoldDustSetPrice.address, 1)
      ).to.equal(0); // 0 NFTs

      expect(
        await mintGoldDustERC1155.balanceOf(
          mintGoldDustMarketplaceAuction.address,
          1
        )
      ).to.equal(0); // 0 NFTs

      expect(
        parseInt(await mintGoldDustERC1155.balanceOf(addr1.address, 0)) +
          parseInt(await mintGoldDustERC1155.balanceOf(addr2.address, 1)) +
          parseInt(await mintGoldDustERC1155.balanceOf(addr3.address, 1)) +
          parseInt(
            await mintGoldDustERC1155.balanceOf(mintGoldDustSetPrice.address, 1)
          ) +
          parseInt(
            await mintGoldDustERC1155.balanceOf(
              mintGoldDustMarketplaceAuction.address,
              1
            )
          )
      ).to.equal(10);

      mintGoldDustERC1155
        .connect(addr3)
        .setApprovalForAll(mintGoldDustMarketplaceAuction.address, true);
      mintGoldDustERC1155
        .connect(addr3)
        .setApprovalForAll(mintGoldDustSetPrice.address, true);

      await mintGoldDustMarketplaceAuction
        .connect(addr3)
        .list(1, 3, mintGoldDustERC1155.address, priceToListForAuction);

      await mintGoldDustSetPrice
        .connect(addr3)
        .list(1, 3, mintGoldDustERC1155.address, toWei(priceToList));

      await mintGoldDustMarketplaceAuction.connect(addr1).placeBid(
        {
          tokenId: 1,
          contractAddress: mintGoldDustERC1155.address,
          seller: addr3.address,
        },
        {
          value: toWei(priceToListForAuction),
        }
      );

      await new Promise((resolve) => setTimeout(resolve, _timeout));

      await mintGoldDustMarketplaceAuction.connect(addr1).endAuction({
        tokenId: 1,
        contractAddress: mintGoldDustERC1155.address,
        seller: addr3.address,
      });

      await mintGoldDustSetPrice.connect(addr1).purchaseNft(
        {
          tokenId: 1,
          amount: 3,
          contractAddress: mintGoldDustERC1155.address,
          seller: addr3.address,
        },
        {
          value: toWei(priceToList * 3),
        }
      );

      await mintGoldDustMarketplaceAuction
        .connect(addr1)
        .list(1, 5, mintGoldDustERC1155.address, priceToListForAuction);

      await mintGoldDustSetPrice
        .connect(addr1)
        .list(1, 1, mintGoldDustERC1155.address, toWei(priceToList));

      secondarySaleFee =
        (priceToListForAuction * secondary_sale_fee_percent) / 100;
      royaltyFee = (priceToListForAuction * royalty) / 100;
      balance2 = priceToListForAuction - (secondarySaleFee + royaltyFee);

      // get the addr2 buyer initial balance
      addr1BalanceBefore = await addr1.getBalance();
      feeAccountInitialEthBal = await deployer.getBalance();
      addr3BalanceBefore = await addr3.getBalance();

      gasPrice = await mintGoldDustSetPrice.signer.getGasPrice();
      gasLimit = await mintGoldDustMarketplaceAuction.estimateGas.placeBid(
        {
          tokenId: 1,
          contractAddress: mintGoldDustERC1155.address,
          seller: addr1.address,
        },
        {
          value: toWei(priceToListForAuction),
        }
      );

      await mintGoldDustMarketplaceAuction.connect(addr3).placeBid(
        {
          tokenId: 1,
          contractAddress: mintGoldDustERC1155.address,
          seller: addr1.address,
        },
        {
          value: toWei(priceToListForAuction),
        }
      );

      await new Promise((resolve) => setTimeout(resolve, _timeout));

      await mintGoldDustMarketplaceAuction.connect(addr3).endAuction({
        tokenId: 1,
        contractAddress: mintGoldDustERC1155.address,
        seller: addr1.address,
      });

      // verify if the seller received the balance
      expect(await addr1.getBalance()).to.be.equal(
        ethers.BigNumber.from(addr1BalanceBefore)
          .add(toWei(balance2))
          .add(toWei(royaltyFee))
      );

      addr3ShouldBeAfter = ethers.BigNumber.from(addr3BalanceBefore)
        .sub(toWei(priceToListForAuction))
        .sub(ethers.BigNumber.from(gasPrice).mul(gasLimit));
      expect(
        parseFloat(parseFloat(fromWei(await addr3.getBalance())).toFixed(2))
      ).to.be.equal(
        parseFloat(parseFloat(fromWei(addr3ShouldBeAfter)).toFixed(2))
      );

      feeAccountAfterEthBalShouldBe = ethers.BigNumber.from(
        feeAccountInitialEthBal
      ).add(toWei(secondarySaleFee));
    });
  });
});
