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

describe("MintGoldDustSetPrice.sol Smart Contract \n___________________________________________________\n \nThis smart contract is responsible by all functionalities related with the fixed price market. \n Here goes the tests related with the MintGoldDustSetPrice market and the MintGoldDustERC721 tokens. \n\n", function () {
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
  let addr4: SignerWithAddress;
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

    MintGoldDustMarketplaceAuction = await ethers.getContractFactory(
      "MintGoldDustMarketplaceAuction"
    );

    MintGoldDustERC721 = await ethers.getContractFactory("MintGoldDustERC721");

    MintGoldDustSetPrice = await ethers.getContractFactory(
      "MintGoldDustSetPrice"
    );

    MintGoldDustERC1155 = await ethers.getContractFactory(
      "MintGoldDustERC1155"
    );

    MintGoldDustMemoir = await ethers.getContractFactory("MintGoldDustMemoir");

    mintGoldDustMemoir = await MintGoldDustMemoir.deploy();
    await mintGoldDustMemoir.deployed();

    [deployer, addr1, addr2, addr3, addr4, ...addrs] =
      await ethers.getSigners();

    mgdCompany = await upgrades.deployProxy(
      MintGoldDustCompany,
      [
        TEST_OWNER,
        primary_sale_fee_percent_initial,
        secondary_sale_fee_percent_initial,
        collector_fee_initial,
        max_royalty_initial,
        auction_duration,
        auction_extension_duration,
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

    await mgdCompany.connect(deployer).setValidator(addr3.address, true);

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
    let amountToList = 10;
    let amountToBuy = 10;
    let priceToList = 2;
    let priceToBuy = priceToList * amountToBuy;

    beforeEach(async () => {
      // MGD owner whitelist the artist
      await mgdCompany.connect(addr3).whitelist(addr1.address, true);

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

      await mintGoldDustSetPrice
        .connect(addr1)
        .list(1, amountToList, mintGoldDustERC1155.address, toWei(priceToList));

      fee = (priceToList * primary_sale_fee_percent) / 100;
      collFee = (priceToList * collector_fee) / 100;
      primarySaleFee = fee;
      balance = priceToList - primarySaleFee;
    });

    it("Should:\n \t - Simulate a primary sale that transfer an NFT to the buyer;\n \t - Verify if the item changed status for sale;\n \t - Verify if the seller balance increases;\n \t - Verify if the marketplace's owner receives the fee;\n \t - Verify if the isSecondarySale attribute was set to true;\n \t - Verify if the buyer balance was deacresed exactly the gas fee + the token price;", async function () {
      // get the balances for the seller and the owner of the marketplace.
      // verify if the flag for secondary is false
      expect(
        (
          await mintGoldDustSetPrice
            .connect(addr1)
            .isSecondarySale(mintGoldDustERC1155.address, 1)
        ).sold
      ).to.be.equal(false);
      // execute the buyNft function
      await mintGoldDustSetPrice.connect(addr2).purchaseNft(
        {
          tokenId: 1,
          amount: amountToBuy,
          contractAddress: mintGoldDustERC1155.address,
          seller: addr1.address,
        },
        {
          value: toWei(priceToBuy + (priceToBuy * 3) / 100),
        }
      );

      await mintGoldDustERC1155
        .connect(addr2)
        .setApprovalForAll(addr4.address, true);
      // verify if the owner of the NFT changed for the buyer
      expect(await mintGoldDustERC1155.balanceOf(addr2.address, 1)).to.equal(
        amountToBuy
      );
      // verify if the amount is the difference of the list and buy
      expect(
        (
          await mintGoldDustSetPrice
            .connect(addr2)
            .isSecondarySale(mintGoldDustERC1155.address, 1)
        ).amount
      ).to.be.equal(amountToMint - amountToBuy);
      // expect item sold to be true
      expect(
        (
          await mintGoldDustSetPrice.idMarketItemsByContractByOwner(
            mintGoldDustERC1155.address,
            1,
            addr2.address
          )
        ).tokenAmount
      ).to.be.equal(0);
      // expect item sold to be true
      expect(await mintGoldDustSetPrice.itemsSold()).to.be.equal(1);
      // Attempt to burn the token as the new owner should fail
      await expect(
        mintGoldDustERC1155.connect(addr2).burnToken(1, 10)
      ).to.be.revertedWith("Only creator or allowed");
      // Attempt to burn the token as the original owner should also fail
      await expect(
        mintGoldDustERC1155.connect(addr4).burnToken(1, 10)
      ).to.be.revertedWith("Only creator or allowed");
      // Attempt to burn the token as the marketplace owner should also fail
      await expect(
        mintGoldDustERC1155.connect(deployer).burnToken(1, 10)
      ).to.be.revertedWith("Insufficient balance to burn");
      // (If Mint Gold Dust Company Validator role exists)
      // Attempt to burn the token as a Validator should also fail
      await expect(
        mintGoldDustERC1155.connect(addr3).burnToken(1, 10)
      ).to.be.revertedWith("Insufficient balance to burn");
    });
  });
});
