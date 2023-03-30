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
    let price = 4;
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

    it("Should \n - addr2 place a bid \n - verify if the addr2 balance have decreased the bid price plus the gas fee for the transaction \n - verify if the auction highest bid value is equal the value sent \n - verify if the auciton highest bidder have changed to addr2 \n - addr3 place another bid \n - verify if the addr3 balance have decreased the bid price plus the gas fee for the transaction \n - verify if the auction highest bid value have changed \n - verify if the auciton highest bidder have changed to addr3 \n - verify if the addr2 was refunded and its balance have increased.", async function () {
      let auctionCreated;
      let highestBid;

      // Verify if the highestBid is zero at the beginning
      auctionCreated = await gdAuctionSmallTime.auctions(0);
      highestBid = auctionCreated.highestBid;
      expect(highestBid).to.be.equal(0);

      // Get the gas limit to be used for the placeBid function
      let gasPrice = await gdAuctionSmallTime.signer.getGasPrice();
      let gasLimit = await gdAuctionSmallTime.estimateGas.placeBid(0, {
        value: toWei(price),
      });

      // Get the balance for the addr2 before place a bid in the auction
      const addr2BalanceBefore = await addr2.getBalance();

      // Get the transaction created by placeBid execution
      const tx = await gdAuctionSmallTime
        .connect(addr2)
        .placeBid(0, { value: toWei(price), gasLimit, gasPrice });

      // Get the gas used for the transaction above
      let gasUsed = tx.gasLimit.mul(gasPrice);

      // Get the balance for the addr2 after place a bid
      const addr2BalanceAfter = await addr2.getBalance();

      // Verify if the balance of the addr2 after place a bid is equals
      // the balance of addr2 before the bid minus the bid price
      // and the gas used
      const addr2BalanceShouldBeAfterBid = ethers.BigNumber.from(
        addr2BalanceBefore
      )
        .sub(toWei(price))
        .sub(gasUsed);

      expect(addr2BalanceAfter).to.be.equal(addr2BalanceShouldBeAfterBid);

      auctionCreated = await gdAuctionSmallTime.auctions(0);

      expect(auctionCreated.highestBid).to.be.equal(
        ethers.BigNumber.from(highestBid).add(toWei(price))
      );
      highestBid = auctionCreated.highestBid;
      expect(auctionCreated.highestBidder).to.be.equal(addr2.address);

      /********************** TEST SECOND PART *******************************/
      // Here we'll verify if after a second bid highes than the last one
      //  - The addr2 will be refunded with the price bidded
      //  - The addr3 balance will change correctly after the bid
      //  - The auction highesBid value was changed by the new bid

      const bid2Price = price + 5;

      // Get the gas limit to be used for the placeBid function
      gasPrice = await gdAuctionSmallTime.signer.getGasPrice();
      gasLimit = await gdAuctionSmallTime.estimateGas.placeBid(0, {
        value: toWei(bid2Price),
      });

      // Get the balance for the addr2 before place a bid in the auction
      const addr3BalanceBefore = await addr3.getBalance();

      // Get the transaction created by placeBid execution
      const tx2 = await gdAuctionSmallTime
        .connect(addr3)
        .placeBid(0, { value: toWei(bid2Price), gasLimit, gasPrice });

      // Get the gas used for the transaction above
      gasUsed = tx2.gasLimit.mul(gasPrice);

      // Get the balance for the addr2 after place a bid
      const addr3BalanceAfter = await addr3.getBalance();

      // Verify if the balance of the addr2 after place a bid is equals
      // the balance of addr2 before the bid minus the bid price
      // and the gas used
      const addr3BalanceShouldBeAfterBid = ethers.BigNumber.from(
        addr3BalanceBefore
      )
        .sub(toWei(bid2Price))
        .sub(gasUsed);

      expect(addr3BalanceAfter).to.be.equal(addr3BalanceShouldBeAfterBid);

      // Verify if the addr2 - the last highest bidder - was refunded
      const addr2BalanceAfterRefund = await addr2.getBalance();
      expect(addr2BalanceAfterRefund).to.be.equal(
        ethers.BigNumber.from(addr2BalanceAfter).add(highestBid)
      );

      // Verify if the auction highest bid value have changed
      auctionCreated = await gdAuctionSmallTime.auctions(0);
      expect(auctionCreated.highestBid).to.be.equal(
        ethers.BigNumber.from(highestBid).add(toWei(5))
      );
      highestBid = auctionCreated.highestBid;
    });
  });
});
