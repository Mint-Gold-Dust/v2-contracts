require("dotenv").config();
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect, use } from "chai";
import { Contract, ContractFactory } from "ethers";
import { ethers } from "hardhat";

const toWei = (num: any) => ethers.utils.parseEther(num.toString());
const fromWei = (num: any) => ethers.utils.formatEther(num);

describe("\nMGDAuction.sol Smart Contract \n___________________________\n \nThis smart contract is responsible by all functionalities related with the marketplace auction. \n", function () {
  let MintGoldDustERC721: ContractFactory;
  let mintGoldDustERC721: Contract;

  let MGDCompany: ContractFactory;
  let mgdCompany: Contract;

  let MGDAuction: ContractFactory;
  let mgdAuction: Contract;

  let MintGoldDustSetPrice: ContractFactory;
  let mgdSetPrice: Contract;

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
    MintGoldDustERC721 = await ethers.getContractFactory("MintGoldDustERC721");
    MGDAuction = await ethers.getContractFactory("MGDAuction");
    MintGoldDustSetPrice = await ethers.getContractFactory(
      "MintGoldDustSetPrice"
    );

    [deployer, addr1, addr2, addr3, ...addrs] = await ethers.getSigners();

    mgdCompany = await upgrades.deployProxy(
      MGDCompany,
      [
        TEST_OWNER,
        primary_sale_fee_percent_initial,
        secondary_sale_fee_percent_initial,
        collector_fee_initial,
        max_royalty_initial,
      ],
      { initializer: "initialize" }
    );
    await mgdCompany.deployed();

    mintGoldDustERC721 = await upgrades.deployProxy(
      MintGoldDustERC721,
      [mgdCompany.address],
      {
        initializer: "initialize",
      }
    );
    await mintGoldDustERC721.deployed();

    mgdAuction = await upgrades.deployProxy(
      MGDAuction,
      [mgdCompany.address, mintGoldDustERC721.address],
      { initializer: "initialize" }
    );
    await mgdAuction.deployed();

    mgdSetPrice = await upgrades.deployProxy(
      MintGoldDustSetPrice,
      [mgdCompany.address, mintGoldDustERC721.address],
      { initializer: "initialize" }
    );
    await mgdSetPrice.deployed();

    await mgdCompany.connect(deployer).setValidator(deployer.address, true);
  });

  describe("\n_________________________________ Tests related with listing a NFT for Auction _________________________________\n", function () {
    let price = 1;

    beforeEach(async () => {
      // MGD owner whitelist the artist
      await mgdCompany.connect(deployer).whitelist(addr1.address, true);
      // addr1 mints a nft
      await mintGoldDustERC721.connect(addr1).mintNft(URI, toWei(5));
      // Artist approve gdMarketPlace marketplace to exchange its NFT
      await mintGoldDustERC721
        .connect(addr1)
        .setApprovalForAll(mgdAuction.address, true);
    });

    it("Should track newly listed item, transfer NFT from seller to MGD marketplace and emit the NftListed event.", async function () {
      console.log(
        "\t ARTIST BALANCE BEFORE LIST: ",
        parseFloat(parseFloat(fromWei(await addr1.getBalance())).toFixed(5))
      );
      let artistBalanceBefore = await addr1.getBalance();

      const tx = await mgdAuction.connect(addr1).list(1, toWei(price));
      const receipt = await tx.wait();

      // Check that the transaction emitted an event
      expect(receipt.events?.length).to.equal(2);

      // Get the block timestamp
      const block = await ethers.provider.getBlock(receipt.blockNumber);
      const timestamp = block.timestamp;
      expect(timestamp).to.be.above(0);

      expect(receipt.events[1].event).to.equal("NftListedToAuction");
      expect(receipt.events[1].args.length).to.equal(4);
      expect(receipt.events[1].args[0]).to.be.equal(1);
      expect(receipt.events[1].args[1]).to.be.equal(addr1.address);
      expect(receipt.events[1].args[2]).to.be.equal(toWei(price));
      expect(receipt.events[1].args[3]).to.be.equal(timestamp);

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
      expect(await mintGoldDustERC721.ownerOf(1)).to.equal(mgdAuction.address);
    });

    it("Should revert the transaction if an artist is not the owner of the token and try to list on the gold dust marketplace.", async function () {
      expect(
        mgdAuction.connect(addr2).list(1, toWei(price))
      ).to.revertedWithCustomError(mgdAuction, "MGDMarketplaceUnauthorized");
    });

    it("Should track a creation of an auction without a reserve price that expect the following conditions: \n \t - Expect emit the AuctionCreated event; \n \t - Expect auction structure attributes match with all passed to create auction function; \n \t - Auction end time should not be started yet to 24 hours and should be zero. \n \t - The auction price (initial price) should be zero. This way after any bid greater than zero the time of 24 hours should starts.", async () => {
      const tx = await mgdAuction.connect(addr1).list(1, toWei(0));
      const receipt = await tx.wait();

      // Check that the transaction emitted an event
      expect(receipt.events?.length).to.equal(2);

      // Get the block timestamp
      const block = await ethers.provider.getBlock(receipt.blockNumber);
      const timestamp = block.timestamp;
      expect(timestamp).to.be.above(0);

      expect(receipt.events[1].event).to.equal("NftListedToAuction");
      expect(receipt.events[1].args.length).to.equal(4);
      expect(receipt.events[1].args[0]).to.be.equal(1);
      expect(receipt.events[1].args[1]).to.be.equal(addr1.address);
      expect(receipt.events[1].args[2]).to.be.equal(toWei(0));
      expect(receipt.events[1].args[3]).to.be.equal(timestamp);

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
      const tx = await mgdAuction.connect(addr1).list(1, toWei(price));
      const receipt = await tx.wait();

      // Check that the transaction emitted an event
      expect(receipt.events?.length).to.equal(2);

      // Get the block timestamp
      const block = await ethers.provider.getBlock(receipt.blockNumber);
      const timestamp = block.timestamp;
      expect(timestamp).to.be.above(0);

      expect(receipt.events[1].event).to.equal("NftListedToAuction");
      expect(receipt.events[1].args.length).to.equal(4);
      expect(receipt.events[1].args[0]).to.be.equal(1);
      expect(receipt.events[1].args[1]).to.be.equal(addr1.address);
      expect(receipt.events[1].args[2]).to.be.equal(toWei(price));
      expect(receipt.events[1].args[3]).to.be.equal(timestamp);

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
      await mintGoldDustERC721.connect(addr1).mintNft(URI, toWei(5));
      // Artist approve gdMarketPlace marketplace to exchange its NFT
      await mintGoldDustERC721
        .connect(addr1)
        .setApprovalForAll(mgdAuction.address, true);
    });

    it("Should revert with an AuctionMustBeEnded() error when some user tries to bid in a timed auction that have ended already.", async function () {
      await mgdAuction.connect(addr1).list(1, toWei(price));

      // The first bid greater than zero, starts the time. In our test 3 seconds
      await mgdAuction.connect(addr2).placeBid(1, { value: toWei(price) });

      // Let's wait 4 seconds
      await new Promise((resolve) => setTimeout(resolve, _timeout));

      // addr3 tries to place a new bid after the time ends
      await expect(
        mgdAuction.connect(addr3).placeBid(1, { value: toWei(price + 1) })
      )
        .to.be.revertedWithCustomError(MGDAuction, "AuctionMustBeEnded")
        .withArgs(1);
    });

    it("Should revert with an AuctionCreatorCannotBid() error if the auction creator (NFT Owner) tries to place a bid.", async function () {
      await mgdAuction.connect(addr1).list(1, toWei(price));

      await expect(
        mgdAuction.connect(addr1).placeBid(1, { value: toWei(price) })
      ).to.be.revertedWithCustomError(MGDAuction, "AuctionCreatorCannotBid");
    });

    it("Should revert with an LastBidderCannotPlaceNextBid() error if the last bidder tries to place a bid again.", async function () {
      await mgdAuction.connect(addr1).list(1, toWei(price));

      await expect(
        mgdAuction.connect(addr2).placeBid(1, { value: toWei(price) })
      ).to.emit(mgdAuction, "AuctionNewBid");

      await expect(
        mgdAuction.connect(addr2).placeBid(1, { value: toWei(price + 1) })
      ).to.be.revertedWithCustomError(
        MGDAuction,
        "LastBidderCannotPlaceNextBid"
      );
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

  describe("\n \n _________________________________ PLACE A BID HAPPY PATHS _________________________________\n", function () {
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
      await mintGoldDustERC721.connect(addr1).mintNft(URI, toWei(5));
      // Artist approve gdMarketPlace marketplace to exchange its NFT
      await mintGoldDustERC721
        .connect(addr1)
        .setApprovalForAll(mgdAuction.address, true);
    });

    describe("\n\t------------------ AUCTION WITH A RESERVE PRICE ------------------\n", () => {
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

        expect(parseFloat(fromWei(bidderBalanceBefore)).toFixed(4)).to.be.equal(
          parseFloat(
            fromWei(
              ethers.BigNumber.from(bidderBalanceAfter)
                .add(toWei(price))
                .add(ethers.BigNumber.from(gasPrice).mul(gasLimit))
            )
          ).toFixed(4)
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

    describe("\n\t------------------ AUCTION WITHOUT A RESERVE PRICE ------------------\n", () => {
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

        expect(parseFloat(fromWei(bidderBalanceBefore)).toFixed(4)).to.be.equal(
          parseFloat(
            fromWei(
              ethers.BigNumber.from(bidderBalanceAfter)
                .add(toWei(price))
                .add(ethers.BigNumber.from(gasPrice).mul(gasLimit))
            )
          ).toFixed(4)
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

    describe("\n\t------------------ SECOND BID BUT BEFORE THE LAST 5 MINUTES ------------------\n", () => {
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
        expect(
          parseFloat(fromWei(bidder1BalanceBefore)).toFixed(4)
        ).to.be.equal(
          parseFloat(
            fromWei(
              ethers.BigNumber.from(bidder1BalanceAfter)
                .add(toWei(price))
                .add(ethers.BigNumber.from(gasPrice).mul(gasLimit))
            )
          ).toFixed(4)
        );

        // **** EXPECT THE BIDDER 1 TO BE REFUNDED AFTER SECOND BID ****
        expect(bidder1BalanceAfterSecondBid).to.be.equal(
          ethers.BigNumber.from(bidder1BalanceAfter).add(toWei(price))
        );

        expect(
          parseFloat(fromWei(bidder2BalanceBefore)).toFixed(4)
        ).to.be.equal(
          parseFloat(
            fromWei(
              ethers.BigNumber.from(bidder2BalanceAfter)
                .add(toWei(secondBidValue))
                .add(ethers.BigNumber.from(gasPrice2).mul(gasLimit2))
            )
          ).toFixed(4)
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

    describe("\n\t------------------ SECOND BID NOW IN THE LAST 5 MINUTES ------------------\n", () => {
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

  describe("\n \n _________________________________ END AUCTION UNHAPPY PATHS _________________________________\n", function () {
    let price = 4;
    const _duration = 10; // seconds
    const _finalTime = 8; // seconds
    const _timeout = 3 * 1000; // seconds

    beforeEach(async () => {
      await mgdCompany.updateAuctionTimeDuration(_duration);
      await mgdCompany.updateAuctionFinalMinutes(_finalTime);
      // MGD owner whitelist the artist
      await mgdCompany.connect(deployer).whitelist(addr1.address, true);
      // addr1 mints a nft
      await mintGoldDustERC721.connect(addr1).mintNft(URI, toWei(5));
      // Artist approve gdMarketPlace marketplace to exchange its NFT
      await mintGoldDustERC721
        .connect(addr1)
        .setApprovalForAll(mgdAuction.address, true);
    });

    it("Should revert with MGDMarketplaceItemIsNotListed error if the end auction function is called and the tokenId was not listed on MGDAuction.", async () => {
      // We list it to Set Price market place to confirm that it not cause problems here
      await mgdSetPrice.connect(addr1).list(1, toWei(price));
      await expect(mgdAuction.endAuction(1)).to.be.revertedWithCustomError(
        mgdAuction,
        "MGDMarketplaceItemIsNotListed"
      );
    });

    it("Should revert with AuctionTimeNotStartedYet error if the end auction function is called and the auction have not received any bids yet.", async () => {
      await mgdAuction.connect(addr1).list(1, toWei(price));
      await expect(mgdAuction.endAuction(1)).to.be.revertedWithCustomError(
        mgdAuction,
        "AuctionTimeNotStartedYet"
      );
    });

    it("Should revert with AuctionCannotBeEndedYet error if the end auction function is called before the time of duration of the auction be ended.", async () => {
      await mgdAuction.connect(addr1).list(1, toWei(price));
      await mgdAuction.connect(addr2).placeBid(1, { value: toWei(price) });
      await expect(mgdAuction.endAuction(1)).to.be.revertedWithCustomError(
        mgdAuction,
        "AuctionCannotBeEndedYet"
      );
    });

    it("Should revert with MGDMarketFunctionForSetPriceListedNFT error if the purchaseNFT function with one parameter is called to buy an item that is listed to Auction. For that the purchseNFT function with two params must be called and its function is internal and just can be called by the childrens smart contracts like the MGDAuction.", async () => {
      await mgdAuction.connect(addr1).list(1, toWei(price));
      await expect(
        mgdAuction.connect(addr2).purchaseNft(1, { value: toWei(price) })
      ).to.be.revertedWithCustomError(
        mgdAuction,
        "MGDMarketFunctionForSetPriceListedNFT"
      );
    });
  });

  describe("\n \n _________________________________ END AUCTION FOR PRIMARY SALE _________________________________\n", function () {
    const _duration = 2; // seconds
    const _finalTime = 1; // seconds
    const _timeout = 3 * 1000; // seconds

    let price = 20;
    // Calculate the fee and balance values based on the price
    let fee: number;
    let balance: number;
    let collFee: number;
    let primarySaleFee: number;

    beforeEach(async () => {
      await mgdCompany.updateAuctionTimeDuration(_duration);
      await mgdCompany.updateAuctionFinalMinutes(_finalTime);
      // MGD owner whitelist the artist
      await mgdCompany.connect(deployer).whitelist(addr1.address, true);
      // addr1 mints a nft
      await mintGoldDustERC721.connect(addr1).mintNft(URI, toWei(5));
      // Artist approve gdMarketPlace marketplace to exchange its NFT
      await mintGoldDustERC721
        .connect(addr1)
        .setApprovalForAll(mgdAuction.address, true);

      await mgdAuction.connect(addr1).list(1, toWei(price));

      fee = (price * primary_sale_fee_percent) / 100;
      collFee = (price * collector_fee) / 100;
      primarySaleFee = fee + collFee;
      balance = price - primarySaleFee;
    });

    it("Should:\n \t - Simulate a primary sale that transfer an NFT to the buyer;\n \t - Verify if the item changed status for sale;\n \t - Verify if the seller balance increases;\n \t - Verify if the marketplace's owner receives the fee;\n \t - Verify if the isSecondarySale attribute was set to true;\n \t - Verify if the buyer balance was deacresed exactly the gas fee + the token price;", async function () {
      // get the balances for the seller and the owner of the marketplace.
      const sellerInitalEthBal = await addr1.getBalance();
      const feeAccountInitialEthBal = await deployer.getBalance();
      const feeAccountAfterEthBalShouldBe = ethers.BigNumber.from(
        feeAccountInitialEthBal
      ).add(toWei(primarySaleFee));

      let addr2BalanceBefore = await addr2.getBalance();

      await mgdAuction.connect(addr2).placeBid(1, { value: toWei(price) });

      // verify if the flag for secondary is false
      expect(
        (await mgdAuction.connect(addr1).idMarketItem(1)).isSecondarySale
      ).to.be.equal(false);

      await new Promise((resolve) => setTimeout(resolve, _timeout));

      let gasPrice = await mgdAuction.signer.getGasPrice();
      let gasLimit = await mgdAuction.estimateGas.endAuction(1);

      console.log("\t GAS PRICE END AUCTION: ", gasPrice);
      console.log("\t GAS LIMIT END AUCTION: ", gasLimit);

      console.log(
        "\t\t TOTAL GAS ESTIMATION END AUCTION (USD): ",
        (+ethers.BigNumber.from(gasPrice).mul(gasLimit) / (100 * 10 ** 18)) *
          2500
      );

      console.log("\n\t\t AUCTION HIGHEST BID: ", price);
      console.log("\t\t Primary Market fee: ", fee);
      console.log("\t\t Collector fee: ", collFee);
      console.log("\t\t Marketplace owner fee: ", primarySaleFee);
      console.log("\t\t Balance to seller: ", balance);

      // execute the endAuction function
      expect(await mgdAuction.endAuction(1))
        .to.emit(mgdAuction, "NftPurchasedPrimaryMarket")
        .withArgs(
          1,
          addr1.address,
          addr2.address,
          toWei(price),
          toWei(fee),
          toWei(collector_fee),
          true
        );

      console.log(
        "\n\t\t MARKETPLACE OWNER BALANCE BEFORE SALE: ",
        parseFloat(fromWei(feeAccountInitialEthBal))
      );

      console.log(
        "\t\t (OBS: IT'S A LITTLE BIT LESS THAN IT SHOULD BE BECAUSE THE EXECUTION OF ENDAUCTION FUNCTION + PURCHASENFT FUNCTION GAS) \n\t\t MARKETPLACE OWNER BALANCE AFTER SALE: ",
        parseFloat(fromWei(await deployer.getBalance()))
      );

      console.log(
        "\t\t MARKETPLACE OWNER BALANCE AFTER SALE SHOULD BE: ",
        parseFloat(fromWei(feeAccountAfterEthBalShouldBe))
      );

      let addr2ShouldBeAfter = ethers.BigNumber.from(addr2BalanceBefore)
        .sub(toWei(price))
        .sub(ethers.BigNumber.from(gasPrice).mul(gasLimit));

      expect(
        parseFloat(
          (parseFloat(fromWei(await addr2.getBalance())) * 2500).toFixed(2)
        )
      ).to.be.closeTo(
        parseFloat((parseFloat(fromWei(addr2ShouldBeAfter)) * 2500).toFixed(2)),
        1
      );

      // verify if the owner of the NFT changed for the buyer
      expect(await mintGoldDustERC721.ownerOf(1)).to.equal(addr2.address);

      // verify if the flag for secondary market changed for true
      expect(
        (await mgdAuction.connect(addr1).idMarketItem(1)).isSecondarySale
      ).to.be.equal(true);

      // verify if the marketplace owner's balance increased the fee
      expect(
        parseFloat(
          (parseFloat(fromWei(await deployer.getBalance())) * 2500).toFixed(1)
        )
      ).to.be.closeTo(
        parseFloat(
          (parseFloat(fromWei(feeAccountAfterEthBalShouldBe)) * 2500).toFixed(1)
        ),
        1
      );

      // verify if the seller received the balance
      expect(await addr1.getBalance()).to.be.equal(
        ethers.BigNumber.from(sellerInitalEthBal).add(toWei(balance))
      );

      // expect item sold to be true
      expect((await mgdAuction.idMarketItem(1)).sold).to.be.equal(true);

      // expect item sold to be true
      expect(await mgdAuction.itemsSold()).to.be.equal(1);

      console.log(
        "\t\t SELLER BALANCE BEFORE SALE: ",
        parseFloat(fromWei(sellerInitalEthBal))
      );

      console.log(
        "\t\t SELLER BALANCE AFTER SALE: ",
        parseFloat(fromWei(await addr1.getBalance()))
      );

      console.log(
        "\t\t AUCTION WINNER BALANCE BEFORE SALE: ",
        parseFloat(fromWei(addr2BalanceBefore))
      );

      console.log(
        "\t\t AUCTION WINNER BALANCE AFTER SALE: ",
        parseFloat(fromWei(await addr2.getBalance()))
      );
    });
  });

  describe("------------------ END AUCTION NFT FOR SECONDARY MARKET ------------------", function () {
    const _duration = 2; // seconds
    const _finalTime = 1; // seconds
    const _timeout = 3 * 1000; // seconds

    let price = 20;
    let royaltyFee: number;
    let balance: number;
    let secondarySaleFee: number;

    beforeEach(async () => {
      await mgdCompany.connect(deployer).updateAuctionTimeDuration(_duration);
      await mgdCompany.connect(deployer).updateAuctionFinalMinutes(_finalTime);
      // MGD owner whitelist the artist
      await mgdCompany.connect(deployer).whitelist(addr1.address, true);
      // addr1 mints a nft
      await mintGoldDustERC721.connect(addr1).mintNft(URI, toWei(5));
      // Artist approve gdMarketPlace marketplace to exchange its NFT
      await mintGoldDustERC721
        .connect(addr1)
        .setApprovalForAll(mgdAuction.address, true);

      await mgdAuction.connect(addr1).list(1, toWei(0));

      await mgdAuction.connect(addr2).placeBid(1, { value: toWei(price - 1) });

      secondarySaleFee = (price * secondary_sale_fee_percent) / 100;
      royaltyFee = (price * royalty) / 100;
      balance = price - (secondarySaleFee + royaltyFee);
    });

    it("Should simulate a secondary sale that transfer an NFT to the buyer, verify if the item changed status for sale, verify if the seller balance increases and also if the marketplace's owner receives the fee and verify if the artist creator have received the royalty.", async function () {
      await new Promise((resolve) => setTimeout(resolve, _timeout));

      await mgdAuction.endAuction(1);

      await mgdAuction.connect(addr2).list(1, toWei(price));
      // verify if the isSecondarySale sale attribute is true
      expect((await mgdAuction.idMarketItem(1)).isSecondarySale).to.equal(true);

      // get the balances for the seller and the owner of the marketplace.
      const feeAccountInitialEthBal = await deployer.getBalance();

      let addr3BalanceBefore = await addr3.getBalance();

      await mgdAuction.connect(addr3).placeBid(1, { value: toWei(price) });

      // get the NFT's artist creator balance
      const provider = ethers.provider;
      const artistCreatorAddress = await mintGoldDustERC721.tokenIdArtist(1);
      const artistCreatorInitialBal = await provider.getBalance(
        artistCreatorAddress
      );

      // get the addr2 buyer initial balance
      const artistSellerInitialBal = await addr2.getBalance();

      await new Promise((resolve) => setTimeout(resolve, _timeout));

      let gasPrice = await mgdAuction.signer.getGasPrice();
      let gasLimit = await mgdAuction.estimateGas.endAuction(1);

      console.log("\t GAS PRICE: ", gasPrice);
      console.log("\t GAS LIMIT: ", gasLimit);

      console.log(
        "\t\t TOTAL GAS ESTIMATION (USD): ",
        (+ethers.BigNumber.from(gasPrice).mul(gasLimit) / (100 * 10 ** 18)) *
          2500
      );

      // execute the buyNft function
      expect(await mgdAuction.endAuction(1))
        .to.emit(mgdAuction, "NftPurchased")
        .withArgs(
          1,
          addr2.address,
          addr3.address,
          toWei(price),
          toWei(royalty),
          toWei(royaltyFee),
          artistCreatorAddress,
          toWei(secondarySaleFee)
        );

      // prepare the future balance that the owner should have after the transaction
      const feeAccountAfterEthBalShouldBe = ethers.BigNumber.from(
        feeAccountInitialEthBal
      ).add(toWei(secondarySaleFee));

      // verify if the owner of the NFT changed for the buyer
      expect(await mintGoldDustERC721.ownerOf(1)).to.equal(addr3.address);

      console.log("\n\t\t ITEM PRICE: ", price);
      console.log("\t\t Secondary Market fee: ", secondarySaleFee);
      console.log("\t\t Royalty fee: ", royaltyFee);
      console.log("\t\t Balance to seller: ", balance);
      console.log(
        "\n\t\t MARKETPLACE OWNER BALANCE BEFORE AUCTION: ",
        parseFloat(fromWei(feeAccountInitialEthBal))
      );

      console.log(
        "\t\t MARKETPLACE OWNER BALANCE AFTER AUCTION: ",
        parseFloat(fromWei(await deployer.getBalance()))
      );

      // verify if the marketplace owner's balance increased the fee
      expect(
        parseFloat(
          (parseFloat(fromWei(await deployer.getBalance())) * 2500).toFixed(1)
        )
      ).to.be.closeTo(
        parseFloat(
          (parseFloat(fromWei(feeAccountAfterEthBalShouldBe)) * 2500).toFixed(1)
        ),
        1
      );

      // verify if the seller received the balance
      expect(await addr2.getBalance()).to.be.equal(
        ethers.BigNumber.from(artistSellerInitialBal).add(toWei(balance))
      );

      console.log(
        "\t\t SELLER BALANCE BEFORE AUCTION: ",
        parseFloat(fromWei(artistSellerInitialBal))
      );

      console.log(
        "\t\t SELLER BALANCE AFTER AUCTION: ",
        parseFloat(fromWei(await addr2.getBalance()))
      );

      const artistCreatorAfterBal = await addr1.getBalance();

      console.log(
        "\t\t ARTIST BALANCE BEFORE AUCTION: ",
        parseFloat(fromWei(artistCreatorInitialBal))
      );

      console.log(
        "\t\t ARTIST BALANCE AFTER AUCTION WITH THE ROYALTY: ",
        parseFloat(fromWei(artistCreatorAfterBal))
      );

      console.log(
        "\t\t AUCTION WINNER BALANCE BEFORE AUCTION: ",
        parseFloat(fromWei(addr3BalanceBefore))
      );

      console.log(
        "\t\t AUCTION WINNER BALANCE AFTER AUCTION: ",
        parseFloat(fromWei(await addr3.getBalance()))
      );

      // verify if the artist received the royalty
      expect(await provider.getBalance(artistCreatorAddress)).to.be.equal(
        ethers.BigNumber.from(artistCreatorInitialBal).add(toWei(royaltyFee))
      );

      let addr3ShouldBeAfter = ethers.BigNumber.from(addr3BalanceBefore)
        .sub(toWei(price))
        .sub(ethers.BigNumber.from(gasPrice).mul(gasLimit));

      expect(
        parseFloat(parseFloat(fromWei(await addr3.getBalance())).toFixed(4))
      ).to.be.approximately(
        parseFloat(parseFloat(fromWei(addr3ShouldBeAfter)).toFixed(4)),
        1
      );

      // expect item sold to be true
      expect((await mgdAuction.idMarketItem(1)).sold).to.be.equal(true);
    });
  });
});
