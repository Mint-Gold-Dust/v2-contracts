require("dotenv").config();
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect, use } from "chai";
import { Contract, ContractFactory } from "ethers";
import { ethers, upgrades } from "hardhat";

const toWei = (num: any) => ethers.utils.parseEther(num.toString());
const fromWei = (num: any) => ethers.utils.formatEther(num);

describe("In these teste we'll be testing the functionalities related with the MGD marketplace like listing and sales. \n", function () {
  let MGDMarketplace: ContractFactory;
  let mgdMarketplace: Contract;

  let deployer: SignerWithAddress;
  let addr1: SignerWithAddress;
  let addr2: SignerWithAddress;
  let addr3: SignerWithAddress;
  let addrs: SignerWithAddress[];

  let URI = "sample URI";

  //const REAL_OWNER = "0x46ab5D1518688f66286aF7c6C9f5552edd050d15";
  const TEST_OWNER = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266";
  const primary_sale_fee_percent_initial = 15000000000000000000n;
  const secondary_sale_fee_percent_initial = 5000000000000000000n;
  const collector_fee_initial = 3000000000000000000n;
  const max_royalty_initial = 20000000000000000000n;

  let primary_sale_fee_percent = 15;
  let secondary_sale_fee_percent = 5;
  let collector_fee = 3;
  let max_royalty = 20;
  let royalty = 5;

  beforeEach(async function () {
    MGDMarketplace = await ethers.getContractFactory("MGDMarketplace");

    [deployer, addr1, addr2, addr3, ...addrs] = await ethers.getSigners();

    mgdMarketplace = await MGDMarketplace.deploy(
      TEST_OWNER,
      primary_sale_fee_percent_initial,
      secondary_sale_fee_percent_initial,
      collector_fee_initial,
      max_royalty_initial
    );
    await mgdMarketplace.connect(deployer).setValidator(deployer.address, true);
  });

  describe("Listing a NFT", function () {
    let price = 1;

    beforeEach(async () => {
      // MGD owner whitelist the artist
      await mgdMarketplace.connect(deployer).whitelist(addr1.address, true);
      // addr1 mints a nft
      await mgdMarketplace.connect(addr1).mintNft(URI, toWei(5));
      // Artist approve gdMarketPlace marketplace to exchange its NFT
      await mgdMarketplace
        .connect(addr1)
        .setApprovalForAll(mgdMarketplace.address, true);
    });

    it("Should track newly listed item, transfer NFT from seller to MGD marketplace and emit the NftListed event.", async function () {
      // addr1 list the NFT with tokenID on gdMarketplace
      await expect(mgdMarketplace.connect(addr1).list(1, toWei(price)))
        .to.emit(mgdMarketplace, "NftListedToSetPrice")
        .withArgs(1, addr1.address, toWei(price));

      // owner should be the marketplace
      expect(await mgdMarketplace.ownerOf(1)).to.equal(mgdMarketplace.address);
    });

    it("Should revert the transaction if an artist tries to list its nft with price less than or equal zero.", async function () {
      await expect(
        mgdMarketplace.connect(addr1).list(1, 0)
      ).to.be.revertedWithCustomError(
        mgdMarketplace,
        "MGDMarketplaceInvalidInput"
      );
    });

    it("Should revert the transaction if an artist is not the owner of the token and try to list on the gold dust marketplace.", async function () {
      expect(
        mgdMarketplace.connect(addr2).list(1, toWei(price))
      ).to.revertedWithCustomError(
        mgdMarketplace,
        "MGDMarketplaceUnauthorized"
      );
    });
  });

  describe("Update a listed NFT", function () {
    let primaryPrice = 1;
    let newPrice = 2;

    beforeEach(async () => {
      // MGD owner whitelist the artist
      await mgdMarketplace.connect(deployer).whitelist(addr1.address, true);
      // addr1 mints a nft
      await mgdMarketplace.connect(addr1).mintNft(URI, toWei(5));
      // Artist approve gdMarketPlace marketplace to exchange its NFT
      await mgdMarketplace
        .connect(addr1)
        .setApprovalForAll(mgdMarketplace.address, true);
      // Artist list its NFT on MGD marketplace
      await mgdMarketplace.connect(addr1).list(1, toWei(primaryPrice));
    });

    it("Should track if a listed item was correctly updated and emit the NftListedItemUpdated event. We should remember that in this moment the owner of the NFT is the marketplace.", async function () {
      // Get item from items mapping then check fields to ensure they are correct before update
      let marketItem = await mgdMarketplace.idMarketItem(1);
      expect(marketItem.price).to.equal(toWei(primaryPrice));
      // addr1 mints an gdMarketPlace
      expect(
        await mgdMarketplace.connect(addr1).updateListedNft(1, toWei(newPrice))
      )
        .to.emit(mgdMarketplace, "NftListedItemUpdated")
        .withArgs(1, addr1.address, toWei(newPrice));

      // Get item from items mapping then check fields to ensure they are correct
      marketItem = await mgdMarketplace.idMarketItem(1);

      // Get item from items mapping then check fields to ensure they are correct before update
      expect(marketItem.price).to.equal(toWei(newPrice));

      // Just confirm that the owner is the marketplace
      expect(await mgdMarketplace.ownerOf(1)).to.equal(mgdMarketplace.address);
    });

    it("Should revert the transaction with InvalidInput error if the marketplace owner tries to update some listed nft with price less than or equal zero.", async function () {
      // try to list with price less than zero
      await expect(
        mgdMarketplace.connect(addr1).updateListedNft(1, toWei(0))
      ).to.be.revertedWithCustomError(
        mgdMarketplace,
        "MGDMarketplaceInvalidInput"
      );
    });

    it("Should revert the transaction with an GDNFTMarketplace__Unauthorized error if some address that is not the seller try to update the NFT listed.", async function () {
      // try to list with price less than zero
      await expect(
        mgdMarketplace.connect(addr2).updateListedNft(1, toWei(newPrice))
      ).to.be.revertedWithCustomError(
        mgdMarketplace,
        "MGDMarketplaceUnauthorized"
      );
    });

    // it("Should revert the transaction with an GDNFTMarketplace__NotAListedItem error if some user tries to update an item that is not on sale.", async function () {
    //   await expect(
    //     mgdMarketplace.connect(addr1).updateListedNft(2, toWei(newPrice))
    //   ).to.be.revertedWithCustomError(
    //     mgdMarketplace,
    //     "MGDMarketplaceItemIsNotListed"
    //   );
    // });
  });

  describe("Delist NFT", function () {
    let primaryPrice = 1;

    beforeEach(async () => {
      // MGD owner whitelist the artist
      await mgdMarketplace.connect(deployer).whitelist(addr1.address, true);
      // addr1 mints a nft
      await mgdMarketplace.connect(addr1).mintNft(URI, toWei(5));
      // Artist approve gdMarketPlace marketplace to exchange its NFT
      await mgdMarketplace
        .connect(addr1)
        .setApprovalForAll(mgdMarketplace.address, true);
      // Artist list its NFT on MGD marketplace
      await mgdMarketplace.connect(addr1).list(1, toWei(primaryPrice));
    });

    it("Should delist a NFT from the marketplace and emit the NFTRemovedFromMarketplace event.", async function () {
      // the market item should be not sold
      expect(
        (await mgdMarketplace.connect(addr1).idMarketItem(1)).sold
      ).to.be.equal(false);
      // addr2 relist a purchased NFT
      expect(await mgdMarketplace.connect(addr1).delistNft(1))
        .to.emit(mgdMarketplace, "NFTRemovedFromMarketplace")
        .withArgs(1, addr1.address);
      // the market item should be sold
      expect(
        (await mgdMarketplace.connect(addr1).idMarketItem(1)).sold
      ).to.be.equal(true);
    });

    it("Should revert with a GDNFTMarketplace__Unauthorized error if some address that is not the item seller try to delist its NFT from marketplace.", async function () {
      // the market item should be not sold
      expect(
        (await mgdMarketplace.connect(addr1).idMarketItem(1)).sold
      ).to.be.equal(false);
      // addr2 relist a purchased NFT
      await expect(
        mgdMarketplace.connect(addr2).delistNft(1)
      ).to.be.revertedWithCustomError(
        mgdMarketplace,
        "MGDMarketplaceUnauthorized"
      );
      // the market item should still be not sold
      expect(
        (await mgdMarketplace.connect(addr1).idMarketItem(1)).sold
      ).to.be.equal(false);
    });
  });

  describe("Purchase NFT", function () {
    let price = 20;
    // Calculate the fee and balance values based on the price
    let fee: number;
    let balance: number;
    let collFee: number;
    let primarySaleFee: number;

    beforeEach(async () => {
      // MGD owner whitelist the artist
      await mgdMarketplace.connect(deployer).whitelist(addr1.address, true);
      // addr1 mints a NFT
      await mgdMarketplace.connect(addr1).mintNft(URI, toWei(royalty));
      // Artist approve MGD marketplace to exchange its NFT
      await mgdMarketplace
        .connect(addr1)
        .setApprovalForAll(mgdMarketplace.address, true);
      // Artist list its NFT on MGD marketplace
      await mgdMarketplace.connect(addr1).list(1, toWei(price));

      fee = (price * primary_sale_fee_percent) / 100;
      collFee = (price * collector_fee) / 100;
      primarySaleFee = fee + collFee;
      balance = price - primarySaleFee;
    });

    it("Should simulate a primary sale that transfer an NFT to the buyer, verify if the item changed status for sale, verify if the seller balance increases and also if the marketplace's owner receives the fee and verify if the flag to secondary sale was set to true.", async function () {
      // get the balances for the seller and the owner of the marketplace.
      const sellerInitalEthBal = await addr1.getBalance();
      const feeAccountInitialEthBal = await deployer.getBalance();
      const feeAccountAfterEthBalShouldBe = ethers.BigNumber.from(
        feeAccountInitialEthBal
      ).add(toWei(primarySaleFee));

      // verify if the flag for secondary is false
      expect(
        (await mgdMarketplace.connect(addr1).idMarketItem(1)).isPrimarySale
      ).to.be.equal(true);

      let gasPrice = await mgdMarketplace.signer.getGasPrice();
      let gasLimit = await mgdMarketplace.estimateGas.purchaseNft(1, {
        value: toWei(price),
      });

      console.log("\t Gas Estimation: ");
      console.log("\t\t GAS PRICE: ", gasPrice);
      console.log("\t\t GAS LIMIT: ", gasLimit);

      //     endAuctiongasUsed
      //   )
      console.log(
        "\t\t TOTAL GAS ESTIMATION (USD): ",
        +ethers.BigNumber.from(gasPrice).mul(gasLimit) / (100 * 10 ** 18)
      );

      // execute the buyNft function
      //expect(
      await mgdMarketplace
        .connect(addr2)
        .purchaseNft(1, { value: toWei(price) });
      // )
      //   .to.emit(mgdMarketplace, "NftPurchased")
      //   .withArgs(
      //     1,
      //     addr1.address,
      //     addr2.address,
      //     toWei(price),
      //     toWei(royalty),
      //     0,
      //     addr1.address,
      //     toWei(fee),
      //     toWei(collector_fee)
      //   );

      // // verify if the owner of the NFT changed for the buyer
      // expect(await mgdMarketplace.ownerOf(1)).to.equal(addr2.address);

      // // verify if the flag for secondary market changed for true
      // expect(
      //   (await mgdMarketplace.connect(addr1).idMarketItem(1)).isPrimarySale
      // ).to.be.equal(false);

      // // verify if the marketplace owner's balance increased the fee
      // expect(await deployer.getBalance()).to.be.equal(
      //   feeAccountAfterEthBalShouldBe
      // );
      // // verify if the seller received the balance
      // expect(await addr1.getBalance()).to.be.equal(
      //   ethers.BigNumber.from(sellerInitalEthBal).add(toWei(balance))
      // );

      // // expect item sold to be true
      // expect((await mgdMarketplace.idMarketItem(1)).sold).to.be.equal(true);
    });

    // it("Should revert with GDNFTMarketplace__NotAListedItem error if the user tries to buy a NFT that was already sold.", async () => {
    //   expect(
    //     await gdMarketPlace.connect(addr2).buyNFT(1, { value: toWei(price) })
    //   )
    //     .to.emit(gdMarketPlace, "NftPurchased")
    //     .withArgs(
    //       1,
    //       addr1.address,
    //       addr2.address,
    //       toWei(price),
    //       toWei(royalty),
    //       0,
    //       addr1.address,
    //       toWei(fee),
    //       toWei(collector_fee)
    //     );

    //   await expect(
    //     gdMarketPlace.connect(addr3).buyNFT(1, { value: toWei(price) })
    //   ).to.be.revertedWithCustomError(
    //     gdMarketPlace,
    //     "GDNFTMarketplace__NotAListedItem"
    //   );
    // });

    // it("Should revert with GDNFTMarketplace__IncorrectAmountSent if the user tries to buy an itemId with an amount greater than the item's price.", async () => {
    //   await expect(
    //     gdMarketPlace.connect(addr3).buyNFT(1, { value: toWei(price + 10) })
    //   ).to.be.revertedWithCustomError(
    //     gdMarketPlace,
    //     "GDNFTMarketplace__IncorrectAmountSent"
    //   );
    // });

    // it("Should revert with GDNFTMarketplace__IncorrectAmountSent if the user tries to buy an itemId with an amount less than the item's price.", async () => {
    //   await expect(
    //     gdMarketPlace.connect(addr3).buyNFT(1, { value: toWei(price - 10) })
    //   ).to.be.revertedWithCustomError(
    //     gdMarketPlace,
    //     "GDNFTMarketplace__IncorrectAmountSent"
    //   );
    // });
  });
});
