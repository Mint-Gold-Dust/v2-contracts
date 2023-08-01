require("dotenv").config();
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";
import { Contract, ContractFactory } from "ethers";
import { ethers } from "hardhat";

const toWei = (num: any) => ethers.utils.parseEther(num.toString());
const fromWei = (num: any) => ethers.utils.formatEther(num);

describe("\nMintGoldDustMaretplaceAuction.sol + MintGoldDustERC1155.sol Smart Contracts \n************___************\n \nHere we'll have the test cases for listings of ERC1155 for auction. \n", function () {
  let MintGoldDustERC721: ContractFactory;
  let mintGoldDustERC721: Contract;

  let MintGoldDustERC1155: ContractFactory;
  let mintGoldDustERC1155: Contract;

  let MintGoldDustCompany: ContractFactory;
  let mintGoldDustCompany: Contract;

  let MintGoldDustMarketplaceAuction: ContractFactory;
  let mintGoldDustMarketplaceAuction: Contract;

  let MintGoldDustSetPrice: ContractFactory;
  let mintGoldDustSetPrice: Contract;

  let MintGoldDustMemoir: ContractFactory;
  let mintGoldDustMemoir: Contract;

  let deployer: SignerWithAddress;
  let addr1: SignerWithAddress;
  let addr2: SignerWithAddress;
  let addrs: SignerWithAddress[];

  let URI = "sample URI";
  let baseURI = "https://example.com/{id}.json";

  //const REAL_OWNER = "0x46ab5D1518688f66286aF7c6C9f5552edd050d15";
  const TEST_OWNER = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266";
  const primary_sale_fee_percent_initial = 15000000000000000000n;
  const secondary_sale_fee_percent_initial = 5000000000000000000n;
  const collector_fee_initial = 3000000000000000000n;
  const max_royalty_initial = 20000000000000000000n;
  const auction_duration = 5;
  const auction_extension_duration = 1;

  const MEMOIR = "This is a great moment of my life!";

  beforeEach(async function () {
    MintGoldDustCompany = await ethers.getContractFactory(
      "MintGoldDustCompany"
    );
    MintGoldDustERC721 = await ethers.getContractFactory("MintGoldDustERC721");
    MintGoldDustERC1155 = await ethers.getContractFactory(
      "MintGoldDustERC1155"
    );

    MintGoldDustMarketplaceAuction = await ethers.getContractFactory(
      "MintGoldDustMarketplaceAuction"
    );
    MintGoldDustSetPrice = await ethers.getContractFactory(
      "MintGoldDustSetPrice"
    );
    MintGoldDustMemoir = await ethers.getContractFactory("MintGoldDustMemoir");

    mintGoldDustMemoir = await MintGoldDustMemoir.deploy();
    await mintGoldDustMemoir.deployed();

    [deployer, addr1, addr2, ...addrs] = await ethers.getSigners();

    mintGoldDustCompany = await upgrades.deployProxy(
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
    await mintGoldDustCompany.deployed();

    mintGoldDustERC721 = await upgrades.deployProxy(
      MintGoldDustERC721,
      [mintGoldDustCompany.address],
      {
        initializer: "initializeChild",
      }
    );
    await mintGoldDustERC721.deployed();

    mintGoldDustERC1155 = await upgrades.deployProxy(
      MintGoldDustERC1155,
      [mintGoldDustCompany.address, baseURI],
      {
        initializer: "initializeChild",
      }
    );
    await mintGoldDustERC1155.deployed();

    mintGoldDustSetPrice = await upgrades.deployProxy(
      MintGoldDustSetPrice,
      [
        mintGoldDustCompany.address,
        mintGoldDustERC721.address,
        mintGoldDustERC1155.address,
      ],
      { initializer: "initializeChild" }
    );
    await mintGoldDustSetPrice.deployed();

    mintGoldDustMarketplaceAuction = await upgrades.deployProxy(
      MintGoldDustMarketplaceAuction,
      [
        mintGoldDustCompany.address,
        mintGoldDustERC721.address,
        mintGoldDustERC1155.address,
      ],
      { initializer: "initializeChild" }
    );
    await mintGoldDustMarketplaceAuction.deployed();

    await mintGoldDustCompany
      .connect(deployer)
      .setValidator(deployer.address, true);
  });

  describe("\n****************_**************** Tests related with listing MintGoldDustERC1155 for auction ****************_****************\n", function () {
    let price = 1;
    let quantityToMint = 10;
    let quantityToList = 5;

    beforeEach(async () => {
      // MGD owner whitelist the artist
      await mintGoldDustCompany
        .connect(deployer)
        .whitelist(addr1.address, true);

      await mintGoldDustCompany
        .connect(deployer)
        .whitelist(addr2.address, true);
      // addr1 mints a MintGoldDustER721

      const encoder = new TextEncoder();
      const bytesMemoir = encoder.encode(MEMOIR);

      await mintGoldDustERC1155
        .connect(addr1)
        .mintNft(URI, toWei(5), quantityToMint, bytesMemoir);
      // Artist approve gdMarketPlace marketplace to exchange its MintGoldDustER721
      await mintGoldDustERC1155
        .connect(addr1)
        .setApprovalForAll(mintGoldDustMarketplaceAuction.address, true);
    });

    it("Should simulate a successfull flow.", async function () {
      const tx = await mintGoldDustMarketplaceAuction
        .connect(addr1)
        .list(1, quantityToList, mintGoldDustERC1155.address, toWei(price));

      const receipt = await tx.wait();

      expect(receipt.status).to.equal(1);
      expect(receipt.events[1].event).to.equal("ItemListedToAuction");
      expect(receipt.events[1].eventSignature).to.equal(
        "ItemListedToAuction(uint256,address,address,uint256,uint256,uint256)"
      );
      expect(receipt.events[1].args[0]).to.equal(1);
      expect(receipt.events[1].args[1]).to.equal(mintGoldDustERC1155.address);
      expect(receipt.events[1].args[2]).to.equal(addr1.address);
      expect(receipt.events[1].args[3]).to.equal(toWei(price));
      expect(receipt.events[1].args[4]).to.equal(
        (await receipt.events[0].getBlock()).timestamp
      );
      expect(receipt.events[1].args[5]).to.equal(1);
    });

    it("Should revert with an ItemIsAlreadyListed error if an address tries to list a MintGoldDustERC1155 itemId that is already listed for auction.", async function () {
      await mintGoldDustMarketplaceAuction
        .connect(addr1)
        .list(1, quantityToList, mintGoldDustERC1155.address, toWei(price));
      await expect(
        mintGoldDustMarketplaceAuction
          .connect(addr1)
          .list(1, quantityToList, mintGoldDustERC1155.address, toWei(price))
      )
        .to.be.revertedWithCustomError(
          mintGoldDustMarketplaceAuction,
          "ItemIsAlreadyListed"
        )
        .withArgs(mintGoldDustERC1155.address);
    });

    it("Should revert with an AddressUnauthorized('Not owner or not has enough token quantity!') error if an address tries to list a quantity of a MintGoldDustERC1155 itemId greater than it has.", async function () {
      await expect(
        mintGoldDustMarketplaceAuction
          .connect(addr1)
          .list(
            1,
            quantityToList * 3,
            mintGoldDustERC1155.address,
            toWei(price)
          )
      )
        .to.be.revertedWithCustomError(
          mintGoldDustMarketplaceAuction,
          "AddressUnauthorized"
        )
        .withArgs("Not owner or not has enough token quantity!");
    });

    it("Should revert with an InvalidAmount error if an address tries to list ZERO of a MintGoldDustERC1155 itemId.", async function () {
      await expect(
        mintGoldDustMarketplaceAuction
          .connect(addr1)
          .list(1, 0, mintGoldDustERC1155.address, toWei(price))
      ).to.be.revertedWithCustomError(
        mintGoldDustMarketplaceAuction,
        "InvalidAmount"
      );
    });

    it("Should revert with a MustBeERC721OrERC1155 error if an address tries to list a tokenId for a contract that is not a MintGoldDustERC1155 or 721.", async function () {
      await expect(
        mintGoldDustMarketplaceAuction
          .connect(addr1)
          .list(1, 1, ethers.constants.AddressZero, toWei(price))
      ).to.be.revertedWithCustomError(
        mintGoldDustMarketplaceAuction,
        "MustBeERC721OrERC1155"
      );
    });

    it("Should revert with a AddressUnauthorized('Not owner or not has enough token quantity!') error if an address tries to list a tokenId that not exists or that it is not the owner.", async function () {
      await expect(
        mintGoldDustMarketplaceAuction
          .connect(addr1)
          .list(2, quantityToList, mintGoldDustERC1155.address, toWei(price))
      )
        .to.be.revertedWithCustomError(
          mintGoldDustMarketplaceAuction,
          "AddressUnauthorized"
        )
        .withArgs("Not owner or not has enough token quantity!");
    });

    it("Should revert with an AddressUnauthorized('Not owner or not has enough token quantity!') error if an address tries to list a tokenId that it is not the owner.", async function () {
      const encoder = new TextEncoder();
      const bytesMemoir = encoder.encode(MEMOIR);
      await mintGoldDustERC1155
        .connect(addr2)
        .mintNft(URI, toWei(5), quantityToMint, bytesMemoir);
      // Artist approve gdMarketPlace marketplace to exchange its MintGoldDustER721
      await mintGoldDustERC1155
        .connect(addr2)
        .setApprovalForAll(mintGoldDustMarketplaceAuction.address, true);
      await expect(
        mintGoldDustMarketplaceAuction
          .connect(addr1)
          .list(2, quantityToList, mintGoldDustERC1155.address, toWei(price))
      )
        .to.be.revertedWithCustomError(
          mintGoldDustMarketplaceAuction,
          "AddressUnauthorized"
        )
        .withArgs("Not owner or not has enough token quantity!");
    });
  });
});
