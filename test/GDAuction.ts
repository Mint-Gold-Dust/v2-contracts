require("dotenv").config();
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect, use } from "chai";
import { Contract, ContractFactory } from "ethers";
import { ethers, upgrades } from "hardhat";

const toWei = (num: any) => ethers.utils.parseEther(num.toString());
const fromWei = (num: any) => ethers.utils.formatEther(num);

describe("GDAuction Smart Contract", function () {
  let GDMarketplace: ContractFactory;
  let gdMarketPlace: Contract;

  let GDAuction: ContractFactory;
  let gdAuction: Contract;

  let deployer: SignerWithAddress;
  let addr1: SignerWithAddress;
  let addr2: SignerWithAddress;
  let addr3: SignerWithAddress;
  let addrs: SignerWithAddress[];

  let URI = "sample URI";

  let primary_sale_fee_percent = 15;
  let secondary_sale_fee_percent = 5;
  let collector_fee = 3;
  let max_royalty = 30;
  let royalty = 5;

  //const REAL_OWNER = "0x46ab5D1518688f66286aF7c6C9f5552edd050d15";
  const TEST_OWNER = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266";
  const primary_sale_fee_percent_initial = 15000000000000000000n;
  const secondary_sale_fee_percent_initial = 5000000000000000000n;
  const collector_fee_initial = 3000000000000000000n;
  const max_royalty_initial = 30000000000000000000n;

  beforeEach(async function () {
    // Get the ContractFactories and Signers here.
    GDMarketplace = await ethers.getContractFactory("GDNFTMarketplace");
    GDAuction = await ethers.getContractFactory("GDAuction");
    [deployer, addr1, addr2, addr3, ...addrs] = await ethers.getSigners();

    gdAuction = await GDAuction.deploy();

    // To deploy our contracts
    //gdMarketPlace = await GDMarketplace.deploy(TEST_OWNER);
    gdMarketPlace = await upgrades.deployProxy(
      GDMarketplace,
      [
        TEST_OWNER,
        primary_sale_fee_percent_initial,
        secondary_sale_fee_percent_initial,
        collector_fee_initial,
        max_royalty_initial,
      ],
      {
        initializer: "initialize",
      }
    );

    await gdMarketPlace.connect(deployer).setValidator(deployer.address, true);
  });

  describe("Listing a NFT", function () {
    let price = 1;

    beforeEach(async () => {
      // MGD owner whitelist the artist
      await gdMarketPlace.connect(deployer).whitelist(addr1.address, true);
      // addr1 mints a nft
      await gdMarketPlace.connect(addr1).mintNft(URI, toWei(5));
      // Artist approve gdMarketPlace marketplace to exchange its NFT
      await gdMarketPlace
        .connect(addr1)
        .setApprovalForAll(gdMarketPlace.address, true);

      await gdMarketPlace.connect(addr1).listNft(1, toWei(price));
    });

    it("Should track newly listed item, transfer NFT from seller to MGD marketplace and emit the NftListed event.", async function () {
      // addr1 list the NFT with tokenID on gdMarketplace
      await gdAuction
        .connect(addr1)
        .createAuction(gdMarketPlace.address, 1, toWei(price), toWei(price), 1);

      console.log("AUCTION: ", (await gdAuction.auctions(0)).tokenId);
      // // owner should be the marketplace
      expect((await gdAuction.auctions(0)).tokenId).to.equal(1);

      // // Get item from items mapping then check fields to ensure they are correct
      // const userNFTs = await gdMarketPlace.fetchUserListedNFTs(addr1.address);
      // expect(userNFTs[0].tokenId).to.equal(1);
      // expect(userNFTs[0].price).to.equal(toWei(price));
      // expect(userNFTs[0].sold).to.equal(false);
    });
  });
});
