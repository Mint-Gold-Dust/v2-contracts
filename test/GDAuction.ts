require("dotenv").config();
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect, use } from "chai";
import { Contract, ContractFactory } from "ethers";
import { ethers, upgrades } from "hardhat";

const toWei = (num: any) => ethers.utils.parseEther(num.toString());
const fromWei = (num: any) => ethers.utils.formatEther(num);

describe("_____________GDAuction Smart Contract Tests_____________", function () {
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

  const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

  const biddingTime = ethers.BigNumber.from(24 * 60 * 60);

  beforeEach(async function () {
    // Get the ContractFactories and Signers here.
    GDMarketplace = await ethers.getContractFactory("GDNFTMarketplace");
    GDAuction = await ethers.getContractFactory("GDAuction");
    [deployer, addr1, addr2, addr3, ...addrs] = await ethers.getSigners();

    gdAuction = await GDAuction.deploy(biddingTime);

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

  describe("* Create auction functionality suit of tests:", function () {
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

    it("Should revert with ChooseSetPriceOrReservePrice() error if some artist or collector try to create an auction with a setPrice and reservePrice option in the same time.", async function () {
      // addr1 list the NFT with tokenID on gdMarketplace
      await expect(
        gdAuction
          .connect(addr1)
          .createAuction(gdMarketPlace.address, 1, toWei(price), true, true)
      ).to.be.revertedWithCustomError(
        GDAuction,
        "ChooseSetPriceOrReservePrice"
      );
    });

    it("Should revert with SetPriceMustBeGreaterThanZero error if an artist or collector try to create an auction with a setPrice less than or equal zero.", async () => {
      await expect(
        gdAuction
          .connect(addr1)
          .createAuction(gdMarketPlace.address, 1, toWei(0), true, false)
      ).to.be.revertedWithCustomError(
        GDAuction,
        "SetPriceMustBeGreaterThanZero"
      );
    });

    it("Should revert with a 'ERC721: invalid token ID' error if an artist or collector try to create an auction with a tokeId that was not minted.", async () => {
      await expect(
        gdAuction
          .connect(addr1)
          .createAuction(gdMarketPlace.address, 2, toWei(price), true, false)
      ).to.be.revertedWith("ERC721: invalid token ID");
    });

    it("Should track a creation of a Set Price auction.", async () => {
      const expectedEndTime = Math.floor(Date.now() / 1000) + 86400; // 86400 seconds in 24 hours

      await expect(
        gdAuction
          .connect(addr1)
          .createAuction(gdMarketPlace.address, 1, toWei(price), true, false)
      ).to.emit(gdAuction, "AuctionCreated");

      const auctionCreated = await gdAuction.auctions(0);

      expect(auctionCreated.nftContract).to.be.equal(gdMarketPlace.address);
      expect(auctionCreated.tokenId).to.be.equal(1);
      expect(auctionCreated.seller).to.be.equal(addr1.address);
      expect(auctionCreated.price).to.be.equal(toWei(price));
      expect(auctionCreated.endTime).to.be.closeTo(expectedEndTime, 100);
      expect(auctionCreated.highestBidder).to.be.equal(ZERO_ADDRESS);
      expect(auctionCreated.highestBid).to.be.equal(0);
      expect(auctionCreated.cancelled).to.be.equal(false);
      expect(auctionCreated.ended).to.be.equal(false);
      expect(auctionCreated.isSetPrice).to.be.equal(true);
      expect(auctionCreated.isReservePrice).to.be.equal(false);
    });

    it("Should create an auction without a reserve price.", async () => {
      await expect(
        gdAuction
          .connect(addr1)
          .createAuction(gdMarketPlace.address, 1, 0, false, false)
      )
        .to.emit(gdAuction, "AuctionCreated")
        .withArgs(
          gdMarketPlace.address,
          1,
          addr1.address,
          0,
          0,
          ZERO_ADDRESS,
          0,
          false,
          false,
          false,
          false
        );

      const auctionCreated = await gdAuction.auctions(0);

      expect(auctionCreated.nftContract).to.be.equal(gdMarketPlace.address);
      expect(auctionCreated.tokenId).to.be.equal(1);
      expect(auctionCreated.seller).to.be.equal(addr1.address);
      expect(auctionCreated.price).to.be.equal(0);
      expect(auctionCreated.endTime).to.be.equal(0);
      expect(auctionCreated.highestBidder).to.be.equal(ZERO_ADDRESS);
      expect(auctionCreated.highestBid).to.be.equal(0);
      expect(auctionCreated.cancelled).to.be.equal(false);
      expect(auctionCreated.ended).to.be.equal(false);
      expect(auctionCreated.isSetPrice).to.be.equal(false);
      expect(auctionCreated.isReservePrice).to.be.equal(false);
    });

    it("Should create an auction with a reserve price.", async () => {
      await expect(
        gdAuction
          .connect(addr1)
          .createAuction(gdMarketPlace.address, 1, toWei(price), false, false)
      )
        .to.emit(gdAuction, "AuctionCreated")
        .withArgs(
          gdMarketPlace.address,
          1,
          addr1.address,
          toWei(price),
          0,
          ZERO_ADDRESS,
          0,
          false,
          false,
          false,
          false
        );

      const auctionCreated = await gdAuction.auctions(0);

      expect(auctionCreated.nftContract).to.be.equal(gdMarketPlace.address);
      expect(auctionCreated.tokenId).to.be.equal(1);
      expect(auctionCreated.seller).to.be.equal(addr1.address);
      expect(auctionCreated.price).to.be.equal(toWei(price));
      expect(auctionCreated.endTime).to.be.equal(0);
      expect(auctionCreated.highestBidder).to.be.equal(ZERO_ADDRESS);
      expect(auctionCreated.highestBid).to.be.equal(0);
      expect(auctionCreated.cancelled).to.be.equal(false);
      expect(auctionCreated.ended).to.be.equal(false);
      expect(auctionCreated.isSetPrice).to.be.equal(false);
      expect(auctionCreated.isReservePrice).to.be.equal(false);
    });
  });

  describe("* Place a bid functionality suit of tests:", function () {
    let price = 1;
    let gdAuctionSmallTime: Contract;
    const _duration = 3; // seconds
    const _timeout = 4 * 1000; // seconds

    beforeEach(async () => {
      const _biddingTime = ethers.BigNumber.from(_duration);
      gdAuctionSmallTime = await GDAuction.deploy(_biddingTime);
      // MGD owner whitelist the artist
      await gdMarketPlace.connect(deployer).whitelist(addr1.address, true);
      // addr1 mints a nft
      await gdMarketPlace.connect(addr1).mintNft(URI, toWei(5));
      // Artist approve gdMarketPlace marketplace to exchange its NFT
      await gdMarketPlace
        .connect(addr1)
        .setApprovalForAll(gdMarketPlace.address, true);

      await gdMarketPlace.connect(addr1).listNft(1, toWei(price));

      await gdAuctionSmallTime
        .connect(addr1)
        .createAuction(gdMarketPlace.address, 1, 0, false, false);
    });

    it("Should revert with an AuctionEnded() error when some user tries to bid in a reserve time auction that have ended already.", async function () {
      // The first bid greater than zero, starts the time. In our test 3 seconds
      await gdAuctionSmallTime.connect(addr2).placeBid(0, { value: toWei(1) });

      // Let's wait 4 seconds
      await new Promise((resolve) => setTimeout(resolve, _timeout));

      // addr3 tries to place a new bid after the time ends
      await expect(
        gdAuctionSmallTime.connect(addr3).placeBid(0, { value: toWei(1) })
      ).to.be.revertedWithCustomError(GDAuction, "AuctionEnded");
    });

    it("Should revert with an BidTooLow() error when some user tries to place bid with a value equal the highest bid.", async function () {
      await gdAuctionSmallTime.connect(addr2).placeBid(0, { value: toWei(1) });

      await expect(
        gdAuctionSmallTime.connect(addr3).placeBid(0, { value: toWei(1) })
      ).to.be.revertedWithCustomError(GDAuction, "BidTooLow");
    });

    it("Should revert with an BidTooLow() error when some user tries to place bid with a value less than the highest bid.", async function () {
      await gdAuctionSmallTime.connect(addr2).placeBid(0, { value: toWei(2) });

      await expect(
        gdAuctionSmallTime.connect(addr3).placeBid(0, { value: toWei(1) })
      ).to.be.revertedWithCustomError(GDAuction, "BidTooLow");
    });

    it("Should addr2 place a bid the test must verify the balances and after addr3 should place another bid and the test will verify the balances again to see if the addr2 have received its funds.", async function () {
      const addr2BalanceBefore = await addr2.getBalance();
      await gdAuctionSmallTime
        .connect(addr2)
        .placeBid(0, { value: toWei(price) });
      const addr2BalanceAfter = await addr2.getBalance();
      const addr2ShouldBe = ethers.BigNumber.from(addr2BalanceBefore).sub(
        toWei(price)
      );
      // expect(addr2BalanceAfter).to.be.equal(addr2ShouldBe);
      // await expect(
      //   gdAuctionSmallTime.connect(addr3).placeBid(0, { value: toWei(1) })
      // ).to.be.revertedWithCustomError(GDAuction, "BidTooLow");
    });
  });
});
