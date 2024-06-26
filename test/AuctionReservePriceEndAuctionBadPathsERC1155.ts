require("dotenv").config();
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect, use } from "chai";
import { Contract, ContractFactory } from "ethers";
import { ethers } from "hardhat";

const toWei = (num: any) => ethers.utils.parseEther(num.toString());
const fromWei = (num: any) => ethers.utils.formatEther(num);

describe("\nMintGoldDustMaretplaceAuction.sol + MintGoldDustERC721.sol Smart Contracts \n************___************\n \nHere we'll have the tests related with a complete flow for an auction for the MintGoldDustERC721 token. \n", function () {
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
  let addr3: SignerWithAddress;
  let addr4: SignerWithAddress;
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
  const auction_extension_duration = 3;

  let primary_sale_fee_percent = 15;
  let secondary_sale_fee_percent = 5;
  let collector_fee = 3;
  let max_royalty = 20;
  let royalty = 5;

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

    [deployer, addr1, addr2, addr3, addr4, ...addrs] =
      await ethers.getSigners();

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

  describe("\n\t------------------ WAIT UNTIL THE END OF TIME AND WINNER CALL END AUCTION TO GET THE TOKEN ------------------\n", () => {
    let price = 4;
    let secondBidValue = price + 2;
    const _timeout = 3 * 1000;
    let expectedEndTime;
    let quantityToMint = 10;
    let quantityToList = 5;

    beforeEach(async () => {
      // MGD owner whitelist the artist
      await mintGoldDustCompany
        .connect(deployer)
        .whitelist(addr1.address, true);

      const encoder = new TextEncoder();
      const bytesMemoir = encoder.encode(MEMOIR);

      // addr1 mints a nft
      await mintGoldDustERC1155
        .connect(addr1)
        .mintNft(URI, toWei(5), quantityToMint, bytesMemoir);
      // Artist approve gdMarketPlace marketplace to exchange its NFT
      await mintGoldDustERC1155
        .connect(addr1)
        .setApprovalForAll(mintGoldDustMarketplaceAuction.address, true);

      const txList = await mintGoldDustMarketplaceAuction
        .connect(addr1)
        .list(1, quantityToList, mintGoldDustERC1155.address, toWei(price));

      // *********************** FIRST BID ****************************
      await mintGoldDustMarketplaceAuction.connect(addr2).placeBid(
        {
          tokenId: 1,
          nft: mintGoldDustERC1155.address,
          seller: addr1.address,
        },
        {
          value: toWei(price + (price * 3) / 100),
        }
      );

      secondBidValue = secondBidValue + (secondBidValue * 3) / 100;

      const tx = await mintGoldDustMarketplaceAuction.connect(addr3).placeBid(
        {
          tokenId: 1,
          nft: mintGoldDustERC1155.address,
          seller: addr1.address,
        },
        {
          value: toWei(secondBidValue),
        }
      );

      const receipt = await tx.wait();

      console.log(
        "LastBidderRefunded amount: ",
        receipt.events[0].args[1].toString()
      );

      console.log("AuctionNewBid bid: ", receipt.events[1].args[4].toString());

      // ******************** SECOND BID ***********************
      let percent = (secondBidValue * 2) / 100;
      let newBid = secondBidValue + percent + percent;
      //newBid = newBid + (newBid * 3) / 100;

      const tx2 = await mintGoldDustMarketplaceAuction.connect(addr2).placeBid(
        {
          tokenId: 1,
          nft: mintGoldDustERC1155.address,
          seller: addr1.address,
        },
        {
          value: toWei(newBid),
        }
      );

      const receipt2 = await tx2.wait();

      console.log(
        "LastBidderRefunded amount: ",
        receipt2.events[0].args[1].toString()
      );

      console.log("AuctionNewBid bid: ", receipt2.events[1].args[4].toString());
    });

    it("Should revert with an Unauthorized error if an address that was not the bid winner tries to call the end auction function.", async function () {
      console.log(`\n\t\tWaiting until the final of the auction...`);
      await new Promise((resolve) => setTimeout(resolve, _timeout * 2));

      await expect(
        mintGoldDustMarketplaceAuction.connect(addr4).endAuction({
          tokenId: 1,
          nft: mintGoldDustERC1155.address,
          seller: addr1.address,
        })
      ).to.be.revertedWith("Unauthorized");
    });

    it("Should revert with an Unauthorized error if an address that was not the bid winner tries to call the end auction function before it ends.", async function () {
      await expect(
        mintGoldDustMarketplaceAuction.connect(addr4).endAuction({
          tokenId: 1,
          nft: mintGoldDustERC1155.address,
          seller: addr1.address,
        })
      ).to.be.revertedWith("Unauthorized");
    });

    it("Should revert with an AuctionCannotBeEndedYet error if the highest bidder tries to call the end auction function before it ends.", async function () {
      await expect(
        mintGoldDustMarketplaceAuction.connect(addr2).endAuction({
          tokenId: 1,
          nft: mintGoldDustERC1155.address,
          seller: addr1.address,
        })
      ).to.be.revertedWithCustomError(
        mintGoldDustMarketplaceAuction,
        "AuctionCannotBeEndedYet"
      );
    });

    it("Should revert with an ItemIsNotListedBySeller error if the bid winner tries to call the end auction function twice.", async function () {
      console.log(`\n\t\tWaiting until the final of the auction...`);
      await new Promise((resolve) => setTimeout(resolve, _timeout * 2));

      await mintGoldDustMarketplaceAuction.connect(addr2).endAuction({
        tokenId: 1,
        nft: mintGoldDustERC1155.address,
        seller: addr1.address,
      });

      await expect(
        mintGoldDustMarketplaceAuction.connect(addr2).endAuction({
          tokenId: 1,
          nft: mintGoldDustERC1155.address,
          seller: addr1.address,
        })
      )
        .to.be.revertedWithCustomError(
          mintGoldDustMarketplaceAuction,
          "ItemIsNotListedBySeller"
        )
        .withArgs(
          1,
          mintGoldDustMarketplaceAuction.address,
          mintGoldDustERC1155.address,
          addr1.address,
          addr2.address
        );
    });
  });

  describe("Simulate when the auction have not received any bid", () => {
    let price = 4;
    const secondBidValue = price + 2;
    const _timeout = 3 * 1000;
    let expectedEndTime;
    let quantityToMint = 10;
    let quantityToList = 5;

    beforeEach(async () => {
      // MGD owner whitelist the artist
      await mintGoldDustCompany
        .connect(deployer)
        .whitelist(addr1.address, true);

      const encoder = new TextEncoder();
      const bytesMemoir = encoder.encode(MEMOIR);

      // addr1 mints a nft
      await mintGoldDustERC1155
        .connect(addr1)
        .mintNft(URI, toWei(5), quantityToMint, bytesMemoir);
      // Artist approve gdMarketPlace marketplace to exchange its NFT
      await mintGoldDustERC1155
        .connect(addr1)
        .setApprovalForAll(mintGoldDustMarketplaceAuction.address, true);

      await mintGoldDustMarketplaceAuction
        .connect(addr1)
        .list(1, quantityToList, mintGoldDustERC1155.address, toWei(price));
    });

    it("Should revert with an AuctionTimeNotStartedYet error if an address tries to call the end auction function before it have not received any bid.", async function () {
      await expect(
        mintGoldDustMarketplaceAuction.connect(addr1).endAuction({
          tokenId: 1,
          nft: mintGoldDustERC1155.address,
          seller: addr1.address,
        })
      ).to.be.revertedWithCustomError(
        mintGoldDustMarketplaceAuction,
        "AuctionTimeNotStartedYet"
      );
    });
  });
});
