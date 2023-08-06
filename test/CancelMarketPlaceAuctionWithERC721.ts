require("dotenv").config();
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";
import { Contract, ContractFactory } from "ethers";
import { ethers } from "hardhat";

const toWei = (num: any) => ethers.utils.parseEther(num.toString());
const fromWei = (num: any) => ethers.utils.formatEther(num);

describe("\nMintGoldDustMaretplaceAuction.sol + MintGoldDustERC721.sol Smart Contracts \n************___************\n \nHere we'll have the tests related of an auction cancellation flow. \n", function () {
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

    await mintGoldDustMarketplaceAuction
      .connect(deployer)
      .setMintGoldDustMarketplace(mintGoldDustSetPrice.address);

    await mintGoldDustSetPrice
      .connect(deployer)
      .setMintGoldDustMarketplace(mintGoldDustMarketplaceAuction.address);
  });

  describe("\n****************_**************** Tests related with cancelling auction flow for MintGoldDustERC721 ****************_****************\n", function () {
    let price = 1;
    let quantityToMint = 1;
    let quantityToList = 1;

    beforeEach(async () => {
      // MGD owner whitelist the artist
      await mintGoldDustCompany
        .connect(deployer)
        .whitelist(addr1.address, true);
      // addr1 mints a MintGoldDustER721

      const encoder = new TextEncoder();
      const bytesMemoir = encoder.encode(MEMOIR);

      await mintGoldDustERC721
        .connect(addr1)
        .mintNft(URI, toWei(5), quantityToMint, bytesMemoir);
      // Artist approve gdMarketPlace marketplace to exchange its MintGoldDustER721
      await mintGoldDustERC721
        .connect(addr1)
        .setApprovalForAll(mintGoldDustMarketplaceAuction.address, true);

      await mintGoldDustMarketplaceAuction
        .connect(addr1)
        .list(1, quantityToList, mintGoldDustERC721.address, toWei(price));
    });

    it("Should revert with an ItemIsNotListedBySeller error when an address that is not the seller tries to cancel an auction.", async function () {
      await expect(
        mintGoldDustMarketplaceAuction
          .connect(addr2)
          .cancelAuction(1, mintGoldDustERC721.address)
      )
        .to.be.revertedWithCustomError(
          mintGoldDustMarketplaceAuction,
          "ItemIsNotListedBySeller"
        )
        .withArgs(
          1,
          mintGoldDustMarketplaceAuction.address,
          mintGoldDustERC721.address,
          addr2.address,
          addr2.address
        );
    });

    it("Should revert with an ItemIsNotListedBySeller if the seller tries to cancel an auction that was already ended or cancelled.", async function () {
      await mintGoldDustMarketplaceAuction
        .connect(addr1)
        .cancelAuction(1, mintGoldDustERC721.address);

      await expect(
        mintGoldDustMarketplaceAuction
          .connect(addr1)
          .cancelAuction(1, mintGoldDustERC721.address)
      )
        .to.be.revertedWithCustomError(
          mintGoldDustMarketplaceAuction,
          "ItemIsNotListedBySeller"
        )
        .withArgs(
          1,
          mintGoldDustMarketplaceAuction.address,
          mintGoldDustERC721.address,
          addr1.address,
          addr1.address
        );
    });

    it("Should revert with an AuctionAlreadyStarted() error when the seller tries to cancel an auction that have already started.", async function () {
      await mintGoldDustMarketplaceAuction.connect(addr2).placeBid(
        {
          tokenId: 1,
          contractAddress: mintGoldDustERC721.address,
          seller: addr1.address,
        },
        {
          value: toWei(price),
        }
      );

      await expect(
        mintGoldDustMarketplaceAuction
          .connect(addr1)
          .cancelAuction(1, mintGoldDustERC721.address)
      ).to.be.revertedWithCustomError(
        mintGoldDustMarketplaceAuction,
        "AuctionAlreadyStarted"
      );
    });

    it("Should simulate a cancel auction flow without errors.", async function () {
      /**
       * @notice that Here I check if the balance of erc721 for the addr1 is 0 and if the balance of the contract is 1
       */
      const addr1BalanceBefore = await mintGoldDustERC721.balanceOf(
        addr1.address
      );
      expect(addr1BalanceBefore).to.be.equal(0);

      const auctionContractBalanceBefore = await mintGoldDustERC721.balanceOf(
        mintGoldDustMarketplaceAuction.address
      );
      expect(auctionContractBalanceBefore).to.be.equal(1);

      // Cancel auction
      const tx = await mintGoldDustMarketplaceAuction
        .connect(addr1)
        .cancelAuction(1, mintGoldDustERC721.address);

      const receipt = await tx.wait();

      // Gas values
      console.log("Gas used to cancel auction: ", receipt.gasUsed.toString());
      console.log("Gas price: ", (await tx.gasPrice).toString());
      console.log("Total gas fee: ", receipt.gasUsed.mul(await tx.gasPrice));

      // Check the event AuctionCancelled
      expect(receipt.events[1].event).to.be.equal("AuctionCancelled");
      expect(receipt.events[1].eventSignature).to.be.equal(
        "AuctionCancelled(uint256,address,address,uint256,uint256)"
      );
      expect(receipt.events[1].args.tokenId).to.be.equal(1);
      expect(receipt.events[1].args.contractAddress).to.be.equal(
        mintGoldDustERC721.address
      );
      expect(receipt.events[1].args.seller).to.be.equal(addr1.address);
      expect(receipt.events[1].args.cancelTime).to.be.equal(
        (await receipt.events[0].getBlock()).timestamp
      );
      expect(receipt.events[1].args.auctionId).to.be.equal(1);

      // Check if the item was deleted from the mapping
      const marketItem =
        await mintGoldDustMarketplaceAuction.idMarketItemsByContractByOwner(
          mintGoldDustERC721.address,
          1,
          addr1.address
        );
      expect(marketItem.tokenId).to.be.equal(0);

      /**
       * @notice that now I need to check if the balance of erc721 for the addr1 is the same as before and if the balance of the contract is 0
       */
      const addr1BalanceAfter = await mintGoldDustERC721.balanceOf(
        addr1.address
      );
      expect(addr1BalanceAfter).to.be.equal(quantityToMint);

      const auctionContractBalanceAfter = await mintGoldDustERC721.balanceOf(
        mintGoldDustMarketplaceAuction.address
      );
      expect(auctionContractBalanceAfter).to.be.equal(0);
    });
  });
});
