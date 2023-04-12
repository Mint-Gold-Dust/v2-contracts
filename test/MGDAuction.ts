require("dotenv").config();
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect, use } from "chai";
import { Contract, ContractFactory } from "ethers";
import { ethers, upgrades } from "hardhat";

const toWei = (num: any) => ethers.utils.parseEther(num.toString());
const fromWei = (num: any) => ethers.utils.formatEther(num);

describe("\nMGDAuction.sol Smart Contract \n___________________________\n \nThis smart contract is responsible by all functionalities related with the marketplace auction. \n", function () {
  let MGDnft: ContractFactory;
  let mgdNft: Contract;

  let MGDCompany: ContractFactory;
  let mgdCompany: Contract;

  let MGDAuction: ContractFactory;
  let mgdAuction: Contract;

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
  const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

  let primary_sale_fee_percent = 15;
  let secondary_sale_fee_percent = 5;
  let collector_fee = 3;
  let max_royalty = 20;
  let royalty = 5;

  beforeEach(async function () {
    MGDCompany = await ethers.getContractFactory("MGDCompany");
    MGDnft = await ethers.getContractFactory("MGDnft");
    MGDAuction = await ethers.getContractFactory("MGDAuction");

    [deployer, addr1, addr2, addr3, ...addrs] = await ethers.getSigners();

    mgdCompany = await MGDCompany.deploy(
      TEST_OWNER,
      primary_sale_fee_percent_initial,
      secondary_sale_fee_percent_initial,
      collector_fee_initial,
      max_royalty_initial
    );

    mgdNft = await MGDnft.deploy(mgdCompany.address);

    mgdAuction = await MGDAuction.deploy(mgdCompany.address, mgdNft.address);

    await mgdCompany.connect(deployer).setValidator(deployer.address, true);
  });

  describe("Listing a NFT for Auction", function () {
    let price = 1;

    beforeEach(async () => {
      // MGD owner whitelist the artist
      await mgdCompany.connect(deployer).whitelist(addr1.address, true);
      // addr1 mints a nft
      await mgdNft.connect(addr1).mintNft(URI, toWei(5));
      // Artist approve gdMarketPlace marketplace to exchange its NFT
      await mgdNft.connect(addr1).setApprovalForAll(mgdAuction.address, true);
    });

    it("Should track newly listed item, transfer NFT from seller to MGD marketplace and emit the NftListed event.", async function () {
      console.log(
        "\t ARTIST BALANCE BEFORE LIST: ",
        parseFloat(parseFloat(fromWei(await addr1.getBalance())).toFixed(5))
      );
      let artistBalanceBefore = await addr1.getBalance();
      // addr1 list the NFT with tokenID on gdMarketplace
      await expect(mgdAuction.connect(addr1).list(1, toWei(price)))
        .to.emit(mgdAuction, "NftListedToAuction")
        .withArgs(1, addr1.address, toWei(price), 0);

      console.log(
        "\t ARTIST BALANCE AFTER LIST: ",
        parseFloat(parseFloat(fromWei(await addr1.getBalance())).toFixed(5))
      );

      console.log(
        "\t \tSo the gas estimation was more less:",
        parseFloat(
          fromWei(
            ethers.BigNumber.from(artistBalanceBefore).sub(
              await addr1.getBalance()
            )
          )
        ) * 2500
      );

      // owner should be the marketplace
      expect(await mgdNft.ownerOf(1)).to.equal(mgdAuction.address);
    });

    it("Should revert the transaction if an artist is not the owner of the token and try to list on the gold dust marketplace.", async function () {
      expect(
        mgdAuction.connect(addr2).list(1, toWei(price))
      ).to.revertedWithCustomError(mgdAuction, "MGDMarketplaceUnauthorized");
    });

    it("Should track a creation of an auction without a reserve price that expect the following conditions: \n \t - Expect emit the AuctionCreated event; \n \t - Expect auction structure attributes match with all passed to create auction function; \n \t - Auction end time should not be started yet to 24 hours and should be zero. \n \t - The auction price (initial price) should be zero. This way after any bid greater than zero the time of 24 hours should starts.", async () => {
      await expect(mgdAuction.connect(addr1).list(1, toWei(0)))
        .to.emit(mgdAuction, "NftListedToAuction")
        .withArgs(1, addr1.address, toWei(0), 0);

      let idMarketItem = await mgdAuction.connect(addr1).idMarketItem(1);

      expect(idMarketItem.tokenId).to.be.equal(1);
      expect(idMarketItem.seller).to.be.equal(addr1.address);
      expect(idMarketItem.price).to.be.equal(0);
      expect(idMarketItem.sold).to.be.equal(false);
      expect(idMarketItem.isAuction).to.be.equal(true);
      expect(idMarketItem.auctionProps.endTime).to.be.equal(0);
      expect(idMarketItem.auctionProps.highestBidder).to.be.equal(ZERO_ADDRESS);
      expect(idMarketItem.auctionProps.highestBid).to.be.equal(0);
      expect(idMarketItem.auctionProps.cancelled).to.be.equal(false);
      expect(idMarketItem.auctionProps.ended).to.be.equal(false);
    });

    it("Should track a creation of an auction with a reserve price that expect the following conditions: \n \t - Expect emit the AuctionCreated event; \n \t - Expect auction structure attributes match with all passed to create auction function; \n \t - Auction end time should not be started yet to 24 hours and should be zero. \n \t - The auction price (initial price) should be zero. This way after any bid greater than zero the time of 24 hours should starts.", async () => {
      await expect(mgdAuction.connect(addr1).list(1, toWei(price)))
        .to.emit(mgdAuction, "NftListedToAuction")
        .withArgs(1, addr1.address, toWei(price), 0);

      let idMarketItem = await mgdAuction.connect(addr1).idMarketItem(1);

      expect(idMarketItem.tokenId).to.be.equal(1);
      expect(idMarketItem.seller).to.be.equal(addr1.address);
      expect(idMarketItem.price).to.be.equal(toWei(price));
      expect(idMarketItem.sold).to.be.equal(false);
      expect(idMarketItem.isAuction).to.be.equal(true);
      expect(idMarketItem.auctionProps.endTime).to.be.equal(0);
      expect(idMarketItem.auctionProps.highestBidder).to.be.equal(ZERO_ADDRESS);
      expect(idMarketItem.auctionProps.highestBid).to.be.equal(toWei(0));
      expect(idMarketItem.auctionProps.cancelled).to.be.equal(false);
      expect(idMarketItem.auctionProps.ended).to.be.equal(false);
    });
  });

  describe("\n \n ______________________________ PLACE A BID GENERAL UNHAPPY PATHS ______________________________", function () {
    let price = 4;
    const _duration = 3; // seconds
    const _finalTime = 1; // seconds
    const _timeout = 4 * 1000; // seconds

    beforeEach(async () => {
      await mgdCompany.updateAuctionTimeDuration(_duration);
      await mgdCompany.updateAuctionFinalMinutes(_finalTime);
      // MGD owner whitelist the artist
      await mgdCompany.connect(deployer).whitelist(addr1.address, true);
      // addr1 mints a nft
      await mgdNft.connect(addr1).mintNft(URI, toWei(5));
      // Artist approve gdMarketPlace marketplace to exchange its NFT
      await mgdNft.connect(addr1).setApprovalForAll(mgdAuction.address, true);
    });

    it("Should revert with an AuctionEnded() error when some user tries to bid in a timed auction that have ended already.", async function () {
      await mgdAuction.connect(addr1).list(1, toWei(price));

      // The first bid greater than zero, starts the time. In our test 3 seconds
      await mgdAuction.connect(addr2).placeBid(1, { value: toWei(price) });

      // Let's wait 4 seconds
      await new Promise((resolve) => setTimeout(resolve, _timeout));

      // addr3 tries to place a new bid after the time ends
      await expect(
        mgdAuction.connect(addr3).placeBid(1, { value: toWei(price + 1) })
      ).to.be.revertedWithCustomError(MGDAuction, "AuctionEnded");
    });

    it("Should revert with an AuctionCreatorCannotBid() error if the auction creator (NFT Owner) tries to place a bid.", async function () {
      await mgdAuction.connect(addr1).list(1, toWei(price));

      await expect(
        mgdAuction.connect(addr1).placeBid(1, { value: toWei(price) })
      ).to.be.revertedWithCustomError(MGDAuction, "AuctionCreatorCannotBid");
    });

    it("Should revert with an LastBidderCannotBidAgain() error if the last bidder tries to place a bid again.", async function () {
      await mgdAuction.connect(addr1).list(1, toWei(price));

      await expect(
        mgdAuction.connect(addr2).placeBid(1, { value: toWei(price) })
      ).to.emit(mgdAuction, "AuctionNewBid");

      await expect(
        mgdAuction.connect(addr2).placeBid(1, { value: toWei(price + 1) })
      ).to.be.revertedWithCustomError(MGDAuction, "LastBidderCannotBidAgain");
    });

    it("Should revert with an BidTooLow() error when some user tries to place bid with a value equal the highest bid.", async function () {
      await mgdAuction.connect(addr1).list(1, toWei(price));

      await mgdAuction.connect(addr2).placeBid(1, { value: toWei(price) });

      await expect(
        mgdAuction.connect(addr3).placeBid(1, { value: toWei(price) })
      ).to.be.revertedWithCustomError(MGDAuction, "BidTooLow");
    });

    it("Should revert with an BidTooLow() error when some user tries to place bid with a value less than the highest bid.", async function () {
      await mgdAuction.connect(addr1).list(1, toWei(price));

      await mgdAuction.connect(addr2).placeBid(1, { value: toWei(price) });

      await expect(
        mgdAuction.connect(addr3).placeBid(1, { value: toWei(price - 1) })
      ).to.be.revertedWithCustomError(MGDAuction, "BidTooLow");
    });

    it("Should revert with an BidTooLow() error when some user tries to place the first bid with a value less than the reserve price in an auction with a reserve price.", async function () {
      await mgdAuction.connect(addr1).list(1, toWei(price));

      await expect(
        mgdAuction.connect(addr2).placeBid(1, { value: toWei(price - 1) })
      ).to.be.revertedWithCustomError(MGDAuction, "BidTooLow");
    });

    it("Should revert with an BidTooLow() error when some user tries to place the first bid with a value equal zero in an auction without a reserve price.", async function () {
      await mgdAuction.connect(addr1).list(1, 0);

      await expect(
        mgdAuction.connect(addr2).placeBid(1, { value: toWei(0) })
      ).to.be.revertedWithCustomError(MGDAuction, "BidTooLow");
    });
  });

  describe("\n \n _________________________________ PLACE A BID HAPPY PATHS _________________________________", function () {
    let price = 4;
    const _duration = 10; // seconds
    const _finalTime = 8; // seconds
    const _timeout = 3 * 1000; // seconds
    let expectedEndTime;

    beforeEach(async () => {
      await mgdCompany.updateAuctionTimeDuration(_duration);
      await mgdCompany.updateAuctionFinalMinutes(_finalTime);
      // MGD owner whitelist the artist
      await mgdCompany.connect(deployer).whitelist(addr1.address, true);
      // addr1 mints a nft
      await mgdNft.connect(addr1).mintNft(URI, toWei(5));
      // Artist approve gdMarketPlace marketplace to exchange its NFT
      await mgdNft.connect(addr1).setApprovalForAll(mgdAuction.address, true);
    });

    describe("\n\t--------- AUCTION WITH A RESERVE PRICE ---------\n", () => {
      beforeEach(async () => {
        await mgdAuction.connect(addr1).list(1, toWei(price));
      });
      it("Should place a first bid and: \n\t - Verify if the highest bid was updated. \n\t - Verify if the endAuction time was updated. \n\t - Verify if the bidder balance was decreased the gas fee plus the auction price. \n\t - Verify if the auction contract balance was added by the bid value.", async function () {
        console.log(
          "\t\tHIGHEST BID BEFORE FIRST BID: ",
          (await mgdAuction.connect(addr1).idMarketItem(1)).auctionProps
            .highestBid
        );
        expect(
          (await mgdAuction.connect(addr1).idMarketItem(1)).auctionProps
            .highestBid
        ).to.be.equal(0);
        console.log(
          "\t\tAUCTION END TIME BEFORE BID: ",
          (await mgdAuction.connect(addr1).idMarketItem(1)).auctionProps.endTime
        );
        let gasPrice = await mgdAuction.signer.getGasPrice();
        let gasLimit = await mgdAuction.estimateGas.placeBid(1, {
          value: toWei(price),
        });

        console.log("\t\tGAS PRICE TO PLACE A BID: ", gasPrice);
        console.log("\t\tGAS LIMIT TO PLACE A BID: ", gasLimit);

        console.log(
          "\t\t\tTOTAL GAS ESTIMATION (USD): ",
          (+ethers.BigNumber.from(gasPrice).mul(gasLimit) / (100 * 10 ** 18)) *
            2500
        );
        expect(
          (await mgdAuction.connect(addr1).idMarketItem(1)).auctionProps.endTime
        ).to.be.equal(0);

        const provider = ethers.provider;
        const mgdAuctionBalanceBefore = await provider.getBalance(
          mgdAuction.address
        );

        const bidderBalanceBefore = await addr2.getBalance();

        // The first bid greater than zero, starts the time. In our test 3 seconds
        expectedEndTime = Math.floor(Date.now() / 1000) + _duration;

        await expect(
          mgdAuction.connect(addr2).placeBid(1, { value: toWei(price) })
        ).to.emit(mgdAuction, "AuctionNewBid");

        const bidderBalanceAfter = await addr2.getBalance();
        const mgdAuctionBalanceAfter = await provider.getBalance(
          mgdAuction.address
        );

        console.log(
          "\n\t\tAUCTION CONTRACT BALANCE BEFORE BID: ",
          parseFloat(fromWei(mgdAuctionBalanceBefore))
        );
        console.log(
          "\t\tAUCTION CONTRACT BALANCE AFTER BID: ",
          parseFloat(fromWei(mgdAuctionBalanceAfter))
        );

        console.log(
          "\n\t\tBIDDER BALANCE BEFORE BID: ",
          parseFloat(fromWei(bidderBalanceBefore))
        );
        console.log(
          "\t\tBIDDER BALANCE AFTER BID: ",
          parseFloat(fromWei(bidderBalanceAfter))
        );

        console.log(
          "\t\tBIDDER BALANCE AFTER + GAS + PRICE SHOULD BE EQUALS BALANCE BEFORE: ",
          parseFloat(
            fromWei(
              ethers.BigNumber.from(bidderBalanceAfter)
                .add(toWei(price))
                .add(ethers.BigNumber.from(gasPrice).mul(gasLimit))
            )
          )
        );

        expect(bidderBalanceBefore).to.be.equal(
          ethers.BigNumber.from(bidderBalanceAfter)
            .add(toWei(price))
            .add(ethers.BigNumber.from(gasPrice).mul(gasLimit))
        );

        // Verify if the end time was set to 24 hours after the first bid greater than zero.
        expect(
          (await mgdAuction.connect(addr1).idMarketItem(1)).auctionProps.endTime
        ).to.be.closeTo(expectedEndTime, 1000);

        console.log(
          "\n\t\tAUCTION END TIME AFTER BID: ",
          (
            await mgdAuction.connect(addr1).idMarketItem(1)
          ).auctionProps.endTime.toString()
        );

        console.log(
          "\t\tHIGHEST AFTER FIRST BID: ",
          parseFloat(
            fromWei(
              (await mgdAuction.connect(addr1).idMarketItem(1)).auctionProps
                .highestBid
            )
          )
        );
        expect(
          (await mgdAuction.connect(addr1).idMarketItem(1)).auctionProps
            .highestBid
        ).to.be.equal(toWei(price));
      });
    });

    describe("\n\t--------- AUCTION WITHOUT A RESERVE PRICE ---------\n", () => {
      beforeEach(async () => {
        await mgdAuction.connect(addr1).list(1, toWei(0));
      });
      it("Should place a first bid and: \n\t - Verify if the highest bid was updated. \n\t - Verify if the endAuction time was updated. \n\t - Verify if the bidder balance was decreased the gas fee plus the auction price. \n\t - Verify if the auction contract balance was added by the bid value.", async function () {
        console.log(
          "\t\tHIGHEST BID BEFORE FIRST BID: ",
          (await mgdAuction.connect(addr1).idMarketItem(1)).auctionProps
            .highestBid
        );
        expect(
          (await mgdAuction.connect(addr1).idMarketItem(1)).auctionProps
            .highestBid
        ).to.be.equal(0);
        console.log(
          "\t\tAUCTION END TIME BEFORE BID: ",
          (await mgdAuction.connect(addr1).idMarketItem(1)).auctionProps.endTime
        );
        let gasPrice = await mgdAuction.signer.getGasPrice();
        let gasLimit = await mgdAuction.estimateGas.placeBid(1, {
          value: toWei(price),
        });

        console.log("\t\tGAS PRICE TO PLACE A BID: ", gasPrice);
        console.log("\t\tGAS LIMIT TO PLACE A BID: ", gasLimit);

        console.log(
          "\t\t\tTOTAL GAS ESTIMATION (USD): ",
          (+ethers.BigNumber.from(gasPrice).mul(gasLimit) / (100 * 10 ** 18)) *
            2500
        );
        expect(
          (await mgdAuction.connect(addr1).idMarketItem(1)).auctionProps.endTime
        ).to.be.equal(0);

        const provider = ethers.provider;
        const mgdAuctionBalanceBefore = await provider.getBalance(
          mgdAuction.address
        );

        const bidderBalanceBefore = await addr2.getBalance();

        // The first bid greater than zero, starts the time. In our test 3 seconds
        expectedEndTime = Math.floor(Date.now() / 1000) + _duration;

        await expect(
          mgdAuction.connect(addr2).placeBid(1, { value: toWei(price) })
        ).to.emit(mgdAuction, "AuctionNewBid");

        const bidderBalanceAfter = await addr2.getBalance();
        const mgdAuctionBalanceAfter = await provider.getBalance(
          mgdAuction.address
        );

        console.log(
          "\n\t\tAUCTION CONTRACT BALANCE BEFORE BID: ",
          parseFloat(fromWei(mgdAuctionBalanceBefore))
        );
        console.log(
          "\t\tAUCTION CONTRACT BALANCE AFTER BID: ",
          parseFloat(fromWei(mgdAuctionBalanceAfter))
        );

        console.log(
          "\n\t\tBIDDER BALANCE BEFORE BID: ",
          parseFloat(fromWei(bidderBalanceBefore))
        );
        console.log(
          "\t\tBIDDER BALANCE AFTER BID: ",
          parseFloat(fromWei(bidderBalanceAfter))
        );

        console.log(
          "\t\tBIDDER BALANCE AFTER + GAS + PRICE SHOULD BE EQUALS BALANCE BEFORE: ",
          parseFloat(
            fromWei(
              ethers.BigNumber.from(bidderBalanceAfter)
                .add(toWei(price))
                .add(ethers.BigNumber.from(gasPrice).mul(gasLimit))
            )
          )
        );

        expect(bidderBalanceBefore).to.be.equal(
          ethers.BigNumber.from(bidderBalanceAfter)
            .add(toWei(price))
            .add(ethers.BigNumber.from(gasPrice).mul(gasLimit))
        );

        // Verify if the end time was set to 24 hours after the first bid greater than zero.
        expect(
          (await mgdAuction.connect(addr1).idMarketItem(1)).auctionProps.endTime
        ).to.be.closeTo(expectedEndTime, 1000);

        console.log(
          "\n\t\tAUCTION END TIME AFTER BID: ",
          (
            await mgdAuction.connect(addr1).idMarketItem(1)
          ).auctionProps.endTime.toString()
        );

        console.log(
          "\t\tHIGHEST AFTER FIRST BID: ",
          parseFloat(
            fromWei(
              (await mgdAuction.connect(addr1).idMarketItem(1)).auctionProps
                .highestBid
            )
          )
        );
        expect(
          (await mgdAuction.connect(addr1).idMarketItem(1)).auctionProps
            .highestBid
        ).to.be.equal(toWei(price));
      });
    });

    describe("\n\t--------- SECOND BID BUT BEFORE THE LAST 5 MINUTES ---------\n", () => {
      const secondBidValue = price + 2;
      beforeEach(async () => {
        await mgdAuction.connect(addr1).list(1, toWei(0));
      });
      it("Should place a first bid and: \n\t - Verify if the highest bid was updated. \n\t - Verify if the endAuction time was updated. \n\t - Verify if the bidder balance was decreased the gas fee plus the auction price. \n\t - Verify if the auction contract balance was added by the bid value.", async function () {
        console.log(
          "\t\tHIGHEST BID BEFORE FIRST BID: ",
          (await mgdAuction.connect(addr1).idMarketItem(1)).auctionProps
            .highestBid
        );
        expect(
          (await mgdAuction.connect(addr1).idMarketItem(1)).auctionProps
            .highestBid
        ).to.be.equal(0);
        console.log(
          "\t\tAUCTION END TIME BEFORE BID: ",
          (await mgdAuction.connect(addr1).idMarketItem(1)).auctionProps.endTime
        );
        let gasPrice = await mgdAuction.signer.getGasPrice();
        let gasLimit = await mgdAuction.estimateGas.placeBid(1, {
          value: toWei(price),
        });

        expect(
          (await mgdAuction.connect(addr1).idMarketItem(1)).auctionProps.endTime
        ).to.be.equal(0);

        const provider = ethers.provider;
        let mgdAuctionBalanceBefore = await provider.getBalance(
          mgdAuction.address
        );

        let bidder1BalanceBefore = await addr2.getBalance();

        // The first bid greater than zero, starts the time. In our test 3 seconds
        expectedEndTime = Math.floor(Date.now() / 1000) + _duration;

        // ******************** FIRST BID ****************************
        await expect(
          mgdAuction.connect(addr2).placeBid(1, { value: toWei(price) })
        ).to.emit(mgdAuction, "AuctionNewBid");

        let bidder1BalanceAfter = await addr2.getBalance();
        let mgdAuctionBalanceAfter = await provider.getBalance(
          mgdAuction.address
        );

        let bidder2BalanceBefore = await addr3.getBalance();

        let gasPrice2 = await mgdAuction.signer.getGasPrice();
        let gasLimit2 = await mgdAuction.estimateGas.placeBid(1, {
          value: toWei(secondBidValue),
        });

        console.log(
          "\n\t\tHIGHEST BID AFTER FIRST BID: ",
          parseFloat(
            fromWei(
              (await mgdAuction.connect(addr1).idMarketItem(1)).auctionProps
                .highestBid
            )
          )
        );

        console.log(
          "\t\tAUCTION END TIME AFTER FIRST BID: ",
          (
            await mgdAuction.connect(addr1).idMarketItem(1)
          ).auctionProps.endTime.toString()
        );

        let endTimeAfterFirstBid = (
          await mgdAuction.connect(addr1).idMarketItem(1)
        ).auctionProps.endTime.toString();

        // **** VERIFY IF THE END TIME WAS SET TO 24 HOURS AFTER THE FIRST BID GREATER THAN ZERO ****
        expect(
          (await mgdAuction.connect(addr1).idMarketItem(1)).auctionProps.endTime
        ).to.be.closeTo(expectedEndTime, 1000);

        // ***** EXPECT HIHEST BID TO BE THE FIRST BID VALUE AFTER FIRST BID *****
        expect(
          (await mgdAuction.connect(addr1).idMarketItem(1)).auctionProps
            .highestBid
        ).to.be.equal(toWei(price));

        // ******************** SECOND BID ***********************
        await expect(
          mgdAuction
            .connect(addr3)
            .placeBid(1, { value: toWei(secondBidValue) })
        ).to.emit(mgdAuction, "AuctionNewBid");

        let endTimeAfterScondtBid = (
          await mgdAuction.connect(addr1).idMarketItem(1)
        ).auctionProps.endTime.toString();
        let bidder2BalanceAfter = await addr3.getBalance();

        let mgdAuctionBalanceAfterSecondBid = await provider.getBalance(
          mgdAuction.address
        );

        // ***** EXPECT END TIME TO BE THE SAME AFTER SECOND BID ******
        expect(endTimeAfterFirstBid).to.be.equal(endTimeAfterScondtBid);

        console.log(
          "\n\t\tAUCTION CONTRACT BALANCE BEFORE FIRST BID: ",
          parseFloat(fromWei(mgdAuctionBalanceBefore))
        );
        console.log(
          "\t\tAUCTION CONTRACT BALANCE AFTER FIRST BID: ",
          parseFloat(fromWei(mgdAuctionBalanceAfter))
        );
        console.log(
          "\t\tAUCTION CONTRACT BALANCE AFTER SECOND BID: ",
          parseFloat(fromWei(mgdAuctionBalanceAfterSecondBid))
        );

        console.log(
          "\n\t\tBIDDER 1 BALANCE BEFORE FIRST BID: ",
          parseFloat(fromWei(bidder1BalanceBefore))
        );
        console.log(
          "\t\tBIDDER 1 BALANCE AFTER FIRST BID: ",
          parseFloat(fromWei(bidder1BalanceAfter))
        );

        console.log(
          "\t\tBIDDER 1 BALANCE AFTER + GAS + PRICE SHOULD BE EQUALS BALANCE BEFORE: ",
          parseFloat(
            fromWei(
              ethers.BigNumber.from(bidder1BalanceAfter)
                .add(toWei(price))
                .add(ethers.BigNumber.from(gasPrice).mul(gasLimit))
            )
          )
        );

        const bidder1BalanceAfterSecondBid = await addr2.getBalance();

        console.log(
          "\t\tBIDDER 1 BALANCE AFTER SECOND BID SHOULD BE REFUNDED: ",
          parseFloat(fromWei(bidder1BalanceAfterSecondBid))
        );

        // **** EXPECT THE BIDDER 1 BALANCE TO BE DECREASED CORRECTLY AFTER FIST BID ****
        expect(bidder1BalanceBefore).to.be.equal(
          ethers.BigNumber.from(bidder1BalanceAfter)
            .add(toWei(price))
            .add(ethers.BigNumber.from(gasPrice).mul(gasLimit))
        );

        // **** EXPECT THE BIDDER 1 TO BE REFUNDED AFTER SECOND BID ****
        expect(bidder1BalanceAfterSecondBid).to.be.equal(
          ethers.BigNumber.from(bidder1BalanceAfter).add(toWei(price))
        );

        expect(bidder2BalanceBefore).to.be.equal(
          ethers.BigNumber.from(bidder2BalanceAfter)
            .add(toWei(secondBidValue))
            .add(ethers.BigNumber.from(gasPrice2).mul(gasLimit2))
        );

        console.log(
          "\n\t\tBIDDER 2 BALANCE BEFORE FIRST BID: ",
          parseFloat(fromWei(bidder2BalanceBefore))
        );
        console.log(
          "\t\tBIDDER 2 BALANCE AFTER FIRST BID: ",
          parseFloat(fromWei(bidder2BalanceAfter))
        );

        console.log(
          "\t\tBIDDER 2 BALANCE AFTER + GAS + PRICE SHOULD BE EQUALS BALANCE BEFORE: ",
          parseFloat(
            fromWei(
              ethers.BigNumber.from(bidder2BalanceAfter)
                .add(toWei(secondBidValue))
                .add(ethers.BigNumber.from(gasPrice2).mul(gasLimit2))
            )
          )
        );

        // **** VERIFY IF THE END TIME STILL 24 HOURS AFTER THE SECOND BID BEFORE THE LAST 5 MINUTES ****
        expect(
          (await mgdAuction.connect(addr1).idMarketItem(1)).auctionProps.endTime
        ).to.be.closeTo(expectedEndTime, 1000);

        console.log(
          "\t\tHIGHEST AFTER SECOND BID: ",
          parseFloat(
            fromWei(
              (await mgdAuction.connect(addr1).idMarketItem(1)).auctionProps
                .highestBid
            )
          )
        );
        console.log(
          "\n\t\tAUCTION END TIME AFTER SECOND BID SHOULD KEEP THE SAME: ",
          (
            await mgdAuction.connect(addr1).idMarketItem(1)
          ).auctionProps.endTime.toString()
        );

        // ***** EXPECT HIHEST BID TO BE THE LAST BID AFTER SECOND BID *****
        expect(
          (await mgdAuction.connect(addr1).idMarketItem(1)).auctionProps
            .highestBid
        ).to.be.equal(toWei(secondBidValue));
      });
    });

    describe("\n\t--------- SECOND BID NOW IN THE LAST 5 MINUTES ---------\n", () => {
      const secondBidValue = price + 2;
      beforeEach(async () => {
        await mgdAuction.connect(addr1).list(1, toWei(0));
      });
      it("Should place a second bid in the last 5 minutes and: \n\t - Verify if the end time was increased by more 5 minutes.", async function () {
        console.log(
          "\t\tAUCTION END TIME BEFORE FIRST BID: ",
          parseFloat(
            fromWei(
              (await mgdAuction.connect(addr1).idMarketItem(1)).auctionProps
                .endTime
            )
          )
        );
        expect(
          (await mgdAuction.connect(addr1).idMarketItem(1)).auctionProps.endTime
        ).to.be.equal(0);

        // The first bid greater than zero, starts the time. In our test 3 seconds
        expectedEndTime = Math.floor(Date.now() / 1000) + _duration;

        // *********************** FIRST BID ****************************
        await expect(
          mgdAuction.connect(addr2).placeBid(1, { value: toWei(price) })
        ).to.emit(mgdAuction, "AuctionNewBid");

        console.log(
          "\t\tAUCTION END TIME AFTER FIRST BID: ",
          (
            await mgdAuction.connect(addr1).idMarketItem(1)
          ).auctionProps.endTime.toString()
        );

        let endTimeAfterFirstBid = (
          await mgdAuction.connect(addr1).idMarketItem(1)
        ).auctionProps.endTime.toString();

        // **** VERIFY IF THE END TIME WAS SET TO 24 HOURS AFTER THE FIRST BID GREATER THAN ZERO ****
        expect(
          (await mgdAuction.connect(addr1).idMarketItem(1)).auctionProps.endTime
        ).to.be.closeTo(expectedEndTime, 1000);

        console.log(`\n\t\tWaiting until the last 5 minutes of the auction...`);
        await new Promise((resolve) => setTimeout(resolve, _timeout));

        // ******************** SECOND BID ***********************
        await expect(
          mgdAuction
            .connect(addr3)
            .placeBid(1, { value: toWei(secondBidValue) })
        ).to.emit(mgdAuction, "AuctionNewBid");

        let endTimeAfterScondtBid = (
          await mgdAuction.connect(addr1).idMarketItem(1)
        ).auctionProps.endTime.toString();

        // ***** EXPECT END TIME TO BE INCREASED MORE 5 MINUTES AFTER SECOND BID ******

        expect(parseInt(endTimeAfterScondtBid)).to.be.equal(
          parseInt(endTimeAfterFirstBid) + _finalTime
        );

        console.log(
          `\n\t\tAUCTION END TIME AFTER SECOND BID SHOULD BE INCREASED (In our test, we're using ${_finalTime} seconds for the last time like example, ${_duration} second for auction duration and ${_timeout} seconds of timeout between the two bids): `,
          (
            await mgdAuction.connect(addr1).idMarketItem(1)
          ).auctionProps.endTime.toString()
        );
      });
    });
  });
});
