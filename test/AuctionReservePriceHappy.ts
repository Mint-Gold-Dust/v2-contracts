require("dotenv").config();
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect, use } from "chai";
import { Contract, ContractFactory } from "ethers";
import { ethers } from "hardhat";

const toWei = (num: any) => ethers.utils.parseEther(num.toString());
const fromWei = (num: any) => ethers.utils.formatEther(num);

describe("\nMintGoldDustMaretplaceAuction.sol + MintGoldDustERC721.sol Smart Contracts \n************___************\n \nHere we'll have the tests related of an auction flow for the MintGoldDustERC721 token. \n", function () {
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
  });

  describe("\n \n ****************_**************** PLACE A BID HAPPY PATHS ****************_****************\n", function () {
    let price = 4;
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
      await mintGoldDustERC721
        .connect(addr1)
        .mintNft(URI, toWei(5), quantityToMint, bytesMemoir);
      // Artist approve gdMarketPlace marketplace to exchange its NFT
      await mintGoldDustERC721
        .connect(addr1)
        .setApprovalForAll(mintGoldDustMarketplaceAuction.address, true);
    });

    describe("\n\t------------------ AUCTION WITH A RESERVE PRICE ------------------\n", () => {
      beforeEach(async () => {
        await mintGoldDustMarketplaceAuction
          .connect(addr1)
          .list(1, quantityToList, mintGoldDustERC721.address, toWei(price));
      });

      it("Should place a first bid and: \n\t - Verify if the highest bid was updated. \n\t - Verify if the endAuction time was updated. \n\t - Verify if the bidder balance was decreased the gas fee plus the auction price. \n\t - Verify if the auction contract balance was added by the bid value.", async function () {
        console.log(
          "\t\tHIGHEST BID BEFORE FIRST BID: ",
          (
            await mintGoldDustMarketplaceAuction
              .connect(addr1)
              .idMarketItemsByContractByOwner(
                mintGoldDustERC721.address,
                1,
                addr1.address
              )
          ).auctionProps.highestBid
        );
        expect(
          (
            await mintGoldDustMarketplaceAuction
              .connect(addr1)
              .idMarketItemsByContractByOwner(
                mintGoldDustERC721.address,
                1,
                addr1.address
              )
          ).auctionProps.highestBid
        ).to.be.equal(0);
        console.log(
          "\t\tAUCTION END TIME BEFORE BID: ",
          (
            await mintGoldDustMarketplaceAuction
              .connect(addr1)
              .idMarketItemsByContractByOwner(
                mintGoldDustERC721.address,
                1,
                addr1.address
              )
          ).auctionProps.endTime
        );

        expect(
          (
            await mintGoldDustMarketplaceAuction
              .connect(addr1)
              .idMarketItemsByContractByOwner(
                mintGoldDustERC721.address,
                1,
                addr1.address
              )
          ).auctionProps.endTime
        ).to.be.equal(0);

        const provider = ethers.provider;
        const mgdAuctionBalanceBefore = await provider.getBalance(
          mintGoldDustMarketplaceAuction.address
        );

        const bidderBalanceBefore = await addr2.getBalance();

        // The first bid greater than zero, starts the time. In our test 3 seconds
        expectedEndTime = Math.floor(Date.now() / 1000) + auction_duration;

        const tx = await mintGoldDustMarketplaceAuction.connect(addr2).placeBid(
          {
            tokenId: 1,
            contractAddress: mintGoldDustERC721.address,
            seller: addr1.address,
          },
          {
            value: toWei(price),
          }
        );

        const receipt = await tx.wait();

        // Check AuctionTimeStarted event
        expect(receipt.events[0].event).to.be.equal("AuctionTimeStarted");
        expect(receipt.events[0].eventSignature).to.be.equal(
          "AuctionTimeStarted(uint256,address,uint256,uint256,uint256)"
        );
        expect(receipt.events[0].args.tokenId).to.be.equal(1);
        expect(receipt.events[0].args.contractAddress).to.be.equal(
          mintGoldDustERC721.address
        );
        expect(receipt.events[0].args.startTime).to.be.equal(
          (await receipt.events[0].getBlock()).timestamp
        );

        // Assuming you have the timestamp from the event
        const timestamp = receipt.events[0].args.startTime;

        // Convert the timestamp to a Date object
        const resultDate: Date = new Date(timestamp.toNumber() * 1000);

        // Add 24 hours to the date
        resultDate.setSeconds(resultDate.getSeconds() + 5);

        expect(
          new Date(receipt.events[0].args.endTime.toNumber() * 1000).getTime()
        ).to.be.equal(resultDate.getTime());

        expect(receipt.events[0].args.auctionId).to.be.equal(1);

        // Check AuctionNewBid event
        // eventSignature: 'AuctionNewBid(uint256,address,address,address,uint256,uint256,uint256)',
        expect(receipt.events[1].event).to.be.equal("AuctionNewBid");
        expect(receipt.events[1].eventSignature).to.be.equal(
          "AuctionNewBid(uint256,address,address,address,uint256,uint256,uint256)"
        );
        expect(receipt.events[1].args.tokenId).to.be.equal(1);
        expect(receipt.events[1].args.contractAddress).to.be.equal(
          mintGoldDustERC721.address
        );
        expect(receipt.events[1].args.previousBidder).to.be.equal(
          ethers.constants.AddressZero
        );
        expect(receipt.events[1].args.currentBidder).to.be.equal(addr2.address);
        expect(receipt.events[1].args.bid).to.be.equal(toWei(price));
        expect(receipt.events[1].args.bidTime).to.be.equal(
          (await receipt.events[0].getBlock()).timestamp
        );
        expect(receipt.events[1].args.auctionId).to.be.equal(1);

        console.log("Gas used to cancel auction: ", receipt.gasUsed.toString());
        console.log("Gas price: ", (await tx.gasPrice).toString());
        console.log("Total gas fee: ", receipt.gasUsed.mul(await tx.gasPrice));

        const totalGas = receipt.gasUsed.mul(await tx.gasPrice);

        const bidderBalanceAfter = await addr2.getBalance();
        const mgdAuctionBalanceAfter = await provider.getBalance(
          mintGoldDustMarketplaceAuction.address
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
                .add(ethers.BigNumber.from(totalGas))
            )
          )
        );

        expect(fromWei(bidderBalanceBefore)).to.be.equal(
          fromWei(
            ethers.BigNumber.from(bidderBalanceAfter)
              .add(toWei(price))
              .add(ethers.BigNumber.from(totalGas))
          )
        );

        // Verify if the end time was set to 24 hours after the first bid greater than zero.
        expect(
          (
            await mintGoldDustMarketplaceAuction
              .connect(addr1)
              .idMarketItemsByContractByOwner(
                mintGoldDustERC721.address,
                1,
                addr1.address
              )
          ).auctionProps.endTime
        ).to.be.closeTo(expectedEndTime, 1000);

        expect(
          new Date(
            (
              await mintGoldDustMarketplaceAuction
                .connect(addr1)
                .idMarketItemsByContractByOwner(
                  mintGoldDustERC721.address,
                  1,
                  addr1.address
                )
            ).auctionProps.endTime.toNumber() * 1000
          ).getTime()
        ).to.be.equal(resultDate.getTime());

        console.log(
          "\n\t\tAUCTION END TIME AFTER BID: ",
          (
            await mintGoldDustMarketplaceAuction
              .connect(addr1)
              .idMarketItemsByContractByOwner(
                mintGoldDustERC721.address,
                1,
                addr1.address
              )
          ).auctionProps.endTime.toString()
        );

        console.log(
          "\t\tHIGHEST AFTER FIRST BID: ",
          parseFloat(
            fromWei(
              (
                await mintGoldDustMarketplaceAuction
                  .connect(addr1)
                  .idMarketItemsByContractByOwner(
                    mintGoldDustERC721.address,
                    1,
                    addr1.address
                  )
              ).auctionProps.highestBid
            )
          )
        );
        expect(
          (
            await mintGoldDustMarketplaceAuction
              .connect(addr1)
              .idMarketItemsByContractByOwner(
                mintGoldDustERC721.address,
                1,
                addr1.address
              )
          ).auctionProps.highestBid
        ).to.be.equal(toWei(price));
      });
    });

    describe("\n\t------------------ SECOND BID BUT BEFORE THE LAST 5 MINUTES ------------------\n", () => {
      const secondBidValue = price + 2;
      beforeEach(async () => {
        await mintGoldDustMarketplaceAuction
          .connect(addr1)
          .list(1, quantityToList, mintGoldDustERC721.address, toWei(0));
      });
      it("Should place a first bid and: \n\t - Verify if the highest bid was updated. \n\t - Verify if the endAuction time was updated. \n\t - Verify if the bidder balance was decreased the gas fee plus the auction price. \n\t - Verify if the auction contract balance was added by the bid value.", async function () {
        console.log(
          "\t\tHIGHEST BID BEFORE FIRST BID: ",
          (
            await mintGoldDustMarketplaceAuction
              .connect(addr1)
              .idMarketItemsByContractByOwner(
                mintGoldDustERC721.address,
                1,
                addr1.address
              )
          ).auctionProps.highestBid
        );
        expect(
          (
            await mintGoldDustMarketplaceAuction
              .connect(addr1)
              .idMarketItemsByContractByOwner(
                mintGoldDustERC721.address,
                1,
                addr1.address
              )
          ).auctionProps.highestBid
        ).to.be.equal(0);
        console.log(
          "\t\tAUCTION END TIME BEFORE BID: ",
          (
            await mintGoldDustMarketplaceAuction
              .connect(addr1)
              .idMarketItemsByContractByOwner(
                mintGoldDustERC721.address,
                1,
                addr1.address
              )
          ).auctionProps.endTime
        );

        expect(
          (
            await mintGoldDustMarketplaceAuction
              .connect(addr1)
              .idMarketItemsByContractByOwner(
                mintGoldDustERC721.address,
                1,
                addr1.address
              )
          ).auctionProps.endTime
        ).to.be.equal(0);

        const provider = ethers.provider;
        let mgdAuctionBalanceBefore = await provider.getBalance(
          mintGoldDustMarketplaceAuction.address
        );

        let bidder1BalanceBefore = await addr2.getBalance();

        // The first bid greater than zero, starts the time. In our test 3 seconds
        expectedEndTime = Math.floor(Date.now() / 1000) + auction_duration;

        // ******************** FIRST BID ****************************
        const tx = await mintGoldDustMarketplaceAuction.connect(addr2).placeBid(
          {
            tokenId: 1,
            contractAddress: mintGoldDustERC721.address,
            seller: addr1.address,
          },
          {
            value: toWei(price),
          }
        );

        const receipt = await tx.wait();

        // Check AuctionTimeStarted event
        expect(receipt.events[0].event).to.be.equal("AuctionTimeStarted");
        expect(receipt.events[0].eventSignature).to.be.equal(
          "AuctionTimeStarted(uint256,address,uint256,uint256,uint256)"
        );
        expect(receipt.events[0].args.tokenId).to.be.equal(1);
        expect(receipt.events[0].args.contractAddress).to.be.equal(
          mintGoldDustERC721.address
        );
        expect(receipt.events[0].args.startTime).to.be.equal(
          (await receipt.events[0].getBlock()).timestamp
        );

        // Assuming you have the timestamp from the event
        const timestamp = receipt.events[0].args.startTime;

        // Convert the timestamp to a Date object
        const resultDate: Date = new Date(timestamp.toNumber() * 1000);

        // Add 24 hours to the date
        resultDate.setSeconds(resultDate.getSeconds() + auction_duration);

        expect(
          new Date(receipt.events[0].args.endTime.toNumber() * 1000).getTime()
        ).to.be.equal(resultDate.getTime());

        expect(receipt.events[0].args.auctionId).to.be.equal(1);

        // Check AuctionNewBid event
        // eventSignature: 'AuctionNewBid(uint256,address,address,address,uint256,uint256,uint256)',
        expect(receipt.events[1].event).to.be.equal("AuctionNewBid");
        expect(receipt.events[1].eventSignature).to.be.equal(
          "AuctionNewBid(uint256,address,address,address,uint256,uint256,uint256)"
        );
        expect(receipt.events[1].args.tokenId).to.be.equal(1);
        expect(receipt.events[1].args.contractAddress).to.be.equal(
          mintGoldDustERC721.address
        );
        expect(receipt.events[1].args.previousBidder).to.be.equal(
          ethers.constants.AddressZero
        );
        expect(receipt.events[1].args.currentBidder).to.be.equal(addr2.address);
        expect(receipt.events[1].args.bid).to.be.equal(toWei(price));
        expect(receipt.events[1].args.bidTime).to.be.equal(
          (await receipt.events[0].getBlock()).timestamp
        );
        expect(receipt.events[1].args.auctionId).to.be.equal(1);

        const totalGas = receipt.gasUsed.mul(await tx.gasPrice);

        let bidder1BalanceAfter = await addr2.getBalance();
        let mgdAuctionBalanceAfter = await provider.getBalance(
          mintGoldDustMarketplaceAuction.address
        );

        let bidder2BalanceBefore = await addr3.getBalance();

        console.log(
          "\n\t\tHIGHEST BID AFTER FIRST BID: ",
          parseFloat(
            fromWei(
              (
                await mintGoldDustMarketplaceAuction
                  .connect(addr1)
                  .idMarketItemsByContractByOwner(
                    mintGoldDustERC721.address,
                    1,
                    addr1.address
                  )
              ).auctionProps.highestBid
            )
          )
        );

        console.log(
          "\t\tAUCTION END TIME AFTER FIRST BID: ",
          (
            await mintGoldDustMarketplaceAuction
              .connect(addr1)
              .idMarketItemsByContractByOwner(
                mintGoldDustERC721.address,
                1,
                addr1.address
              )
          ).auctionProps.endTime.toString()
        );

        let endTimeAfterFirstBid = (
          await mintGoldDustMarketplaceAuction
            .connect(addr1)
            .idMarketItemsByContractByOwner(
              mintGoldDustERC721.address,
              1,
              addr1.address
            )
        ).auctionProps.endTime.toString();

        expect(
          new Date(
            (
              await mintGoldDustMarketplaceAuction
                .connect(addr1)
                .idMarketItemsByContractByOwner(
                  mintGoldDustERC721.address,
                  1,
                  addr1.address
                )
            ).auctionProps.endTime.toNumber() * 1000
          ).getTime()
        ).to.be.equal(resultDate.getTime());

        // **** VERIFY IF THE END TIME WAS SET TO 24 HOURS AFTER THE FIRST BID GREATER THAN ZERO ****
        expect(
          (
            await mintGoldDustMarketplaceAuction
              .connect(addr1)
              .idMarketItemsByContractByOwner(
                mintGoldDustERC721.address,
                1,
                addr1.address
              )
          ).auctionProps.endTime
        ).to.be.closeTo(expectedEndTime, 1000);

        // ***** EXPECT HIHEST BID TO BE THE FIRST BID VALUE AFTER FIRST BID *****
        expect(
          (
            await mintGoldDustMarketplaceAuction
              .connect(addr1)
              .idMarketItemsByContractByOwner(
                mintGoldDustERC721.address,
                1,
                addr1.address
              )
          ).auctionProps.highestBid
        ).to.be.equal(toWei(price));

        // ******************** SECOND BID ***********************
        const tx2 = await mintGoldDustMarketplaceAuction
          .connect(addr3)
          .placeBid(
            {
              tokenId: 1,
              contractAddress: mintGoldDustERC721.address,
              seller: addr1.address,
            },
            {
              value: toWei(secondBidValue),
            }
          );

        const receipt2 = await tx2.wait();

        // Check AuctionTimeStarted event

        // Check AuctionNewBid event
        // eventSignature: 'AuctionNewBid(uint256,address,address,address,uint256,uint256,uint256)',
        expect(receipt2.events[1].event).to.be.equal("AuctionNewBid");
        expect(receipt2.events[1].eventSignature).to.be.equal(
          "AuctionNewBid(uint256,address,address,address,uint256,uint256,uint256)"
        );
        expect(receipt2.events[1].args.tokenId).to.be.equal(1);
        expect(receipt2.events[1].args.contractAddress).to.be.equal(
          mintGoldDustERC721.address
        );
        expect(receipt2.events[1].args.previousBidder).to.be.equal(
          addr2.address
        );
        expect(receipt2.events[1].args.currentBidder).to.be.equal(
          addr3.address
        );
        expect(receipt2.events[1].args.bid).to.be.equal(toWei(secondBidValue));
        expect(receipt2.events[1].args.bidTime).to.be.equal(
          (await receipt2.events[0].getBlock()).timestamp
        );
        expect(receipt2.events[1].args.auctionId).to.be.equal(1);

        // Assuming you have the timestamp from the event
        const timestamp2 = receipt.events[0].args.startTime;

        // Convert the timestamp to a Date object
        const resultDate2: Date = new Date(timestamp2.toNumber() * 1000);

        // Add 24 hours to the date
        resultDate2.setSeconds(resultDate2.getSeconds() + auction_duration);

        const totalGas2 = receipt2.gasUsed.mul(await tx2.gasPrice);

        let endTimeAfterScondtBid = (
          await mintGoldDustMarketplaceAuction
            .connect(addr1)
            .idMarketItemsByContractByOwner(
              mintGoldDustERC721.address,
              1,
              addr1.address
            )
        ).auctionProps.endTime.toString();
        let bidder2BalanceAfter = await addr3.getBalance();

        let mgdAuctionBalanceAfterSecondBid = await provider.getBalance(
          mintGoldDustMarketplaceAuction.address
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
                .add(ethers.BigNumber.from(totalGas))
            )
          )
        );

        const bidder1BalanceAfterSecondBid = await addr2.getBalance();

        console.log(
          "\t\tBIDDER 1 BALANCE AFTER SECOND BID SHOULD BE REFUNDED: ",
          parseFloat(fromWei(bidder1BalanceAfterSecondBid))
        );

        // **** EXPECT THE BIDDER 1 BALANCE TO BE DECREASED CORRECTLY AFTER FIST BID ****
        expect(fromWei(bidder1BalanceBefore)).to.be.equal(
          fromWei(
            ethers.BigNumber.from(bidder1BalanceAfter)
              .add(toWei(price))
              .add(ethers.BigNumber.from(totalGas))
          )
        );

        // **** EXPECT THE BIDDER 1 TO BE REFUNDED AFTER SECOND BID ****
        expect(bidder1BalanceAfterSecondBid).to.be.equal(
          ethers.BigNumber.from(bidder1BalanceAfter).add(toWei(price))
        );
        // IMPORTANT: This test is done in the CancelMarketPlaceAuctionWithERC*.ts files

        expect(fromWei(bidder2BalanceBefore)).to.be.equal(
          fromWei(
            ethers.BigNumber.from(bidder2BalanceAfter)
              .add(toWei(secondBidValue))
              .add(ethers.BigNumber.from(totalGas2))
          )
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

          fromWei(
            ethers.BigNumber.from(bidder2BalanceAfter)
              .add(toWei(secondBidValue))
              .add(ethers.BigNumber.from(totalGas2))
          )
        );

        // **** VERIFY IF THE END TIME STILL 24 HOURS AFTER THE SECOND BID BEFORE THE LAST 5 MINUTES ****
        expect(
          (
            await mintGoldDustMarketplaceAuction
              .connect(addr1)
              .idMarketItemsByContractByOwner(
                mintGoldDustERC721.address,
                1,
                addr1.address
              )
          ).auctionProps.endTime
        ).to.be.closeTo(expectedEndTime, 1000);

        console.log(
          "\t\tHIGHEST AFTER SECOND BID: ",
          parseFloat(
            fromWei(
              (
                await mintGoldDustMarketplaceAuction
                  .connect(addr1)
                  .idMarketItemsByContractByOwner(
                    mintGoldDustERC721.address,
                    1,
                    addr1.address
                  )
              ).auctionProps.highestBid
            )
          )
        );
        console.log(
          "\n\t\tAUCTION END TIME AFTER SECOND BID SHOULD KEEP THE SAME: ",
          (
            await mintGoldDustMarketplaceAuction
              .connect(addr1)
              .idMarketItemsByContractByOwner(
                mintGoldDustERC721.address,
                1,
                addr1.address
              )
          ).auctionProps.endTime.toString()
        );

        // ***** EXPECT HIHEST BID TO BE THE LAST BID AFTER SECOND BID *****
        expect(
          (
            await mintGoldDustMarketplaceAuction
              .connect(addr1)
              .idMarketItemsByContractByOwner(
                mintGoldDustERC721.address,
                1,
                addr1.address
              )
          ).auctionProps.highestBid
        ).to.be.equal(toWei(secondBidValue));
      });
    });

    describe("\n\t------------------ SECOND BID NOW IN THE LAST 5 MINUTES ------------------\n", () => {
      const secondBidValue = price + 2;
      beforeEach(async () => {
        await mintGoldDustMarketplaceAuction
          .connect(addr1)
          .list(1, quantityToList, mintGoldDustERC721.address, toWei(0));
      });
      it("Should place a second bid in the last 5 minutes and: \n\t - Verify if the end time was increased by more 5 minutes.", async function () {
        console.log(
          "\t\tAUCTION END TIME BEFORE FIRST BID: ",
          parseFloat(
            fromWei(
              (
                await mintGoldDustMarketplaceAuction
                  .connect(addr1)
                  .idMarketItemsByContractByOwner(
                    mintGoldDustERC721.address,
                    1,
                    addr1.address
                  )
              ).auctionProps.endTime
            )
          )
        );
        expect(
          (
            await mintGoldDustMarketplaceAuction
              .connect(addr1)
              .idMarketItemsByContractByOwner(
                mintGoldDustERC721.address,
                1,
                addr1.address
              )
          ).auctionProps.endTime
        ).to.be.equal(0);

        // The first bid greater than zero, starts the time. In our test 3 seconds
        expectedEndTime = Math.floor(Date.now() / 1000) + auction_duration;

        // *********************** FIRST BID ****************************
        const tx = await mintGoldDustMarketplaceAuction.connect(addr2).placeBid(
          {
            tokenId: 1,
            contractAddress: mintGoldDustERC721.address,
            seller: addr1.address,
          },
          {
            value: toWei(price),
          }
        );

        const receipt = await tx.wait();

        // Check AuctionTimeStarted event
        expect(receipt.events[0].event).to.be.equal("AuctionTimeStarted");
        expect(receipt.events[0].eventSignature).to.be.equal(
          "AuctionTimeStarted(uint256,address,uint256,uint256,uint256)"
        );
        expect(receipt.events[0].args.tokenId).to.be.equal(1);
        expect(receipt.events[0].args.contractAddress).to.be.equal(
          mintGoldDustERC721.address
        );
        expect(receipt.events[0].args.startTime).to.be.equal(
          (await receipt.events[0].getBlock()).timestamp
        );

        // Assuming you have the timestamp from the event
        const timestamp = receipt.events[0].args.startTime;

        // Convert the timestamp to a Date object
        const resultDate: Date = new Date(timestamp.toNumber() * 1000);

        // Add 24 hours to the date
        resultDate.setSeconds(resultDate.getSeconds() + auction_duration);

        expect(
          new Date(receipt.events[0].args.endTime.toNumber() * 1000).getTime()
        ).to.be.equal(resultDate.getTime());

        expect(receipt.events[0].args.auctionId).to.be.equal(1);

        // Check AuctionNewBid event
        // eventSignature: 'AuctionNewBid(uint256,address,address,address,uint256,uint256,uint256)',
        expect(receipt.events[1].event).to.be.equal("AuctionNewBid");
        expect(receipt.events[1].eventSignature).to.be.equal(
          "AuctionNewBid(uint256,address,address,address,uint256,uint256,uint256)"
        );
        expect(receipt.events[1].args.tokenId).to.be.equal(1);
        expect(receipt.events[1].args.contractAddress).to.be.equal(
          mintGoldDustERC721.address
        );
        expect(receipt.events[1].args.previousBidder).to.be.equal(
          ethers.constants.AddressZero
        );
        expect(receipt.events[1].args.currentBidder).to.be.equal(addr2.address);
        expect(receipt.events[1].args.bid).to.be.equal(toWei(price));
        expect(receipt.events[1].args.bidTime).to.be.equal(
          (await receipt.events[0].getBlock()).timestamp
        );
        expect(receipt.events[1].args.auctionId).to.be.equal(1);

        const totalGas = receipt.gasUsed.mul(await tx.gasPrice);

        console.log(
          "\t\tAUCTION END TIME AFTER FIRST BID: ",
          (
            await mintGoldDustMarketplaceAuction
              .connect(addr1)
              .idMarketItemsByContractByOwner(
                mintGoldDustERC721.address,
                1,
                addr1.address
              )
          ).auctionProps.endTime.toString()
        );

        let endTimeAfterFirstBid = (
          await mintGoldDustMarketplaceAuction
            .connect(addr1)
            .idMarketItemsByContractByOwner(
              mintGoldDustERC721.address,
              1,
              addr1.address
            )
        ).auctionProps.endTime.toString();

        // **** VERIFY IF THE END TIME WAS SET TO 24 HOURS AFTER THE FIRST BID GREATER THAN ZERO ****
        expect(
          new Date(
            (
              await mintGoldDustMarketplaceAuction
                .connect(addr1)
                .idMarketItemsByContractByOwner(
                  mintGoldDustERC721.address,
                  1,
                  addr1.address
                )
            ).auctionProps.endTime.toNumber() * 1000
          ).getTime()
        ).to.be.equal(resultDate.getTime());

        console.log(`\n\t\tWaiting until the last 5 minutes of the auction...`);
        await new Promise((resolve) => setTimeout(resolve, _timeout));

        // ******************** SECOND BID ***********************
        const tx2 = await mintGoldDustMarketplaceAuction
          .connect(addr3)
          .placeBid(
            {
              tokenId: 1,
              contractAddress: mintGoldDustERC721.address,
              seller: addr1.address,
            },
            {
              value: toWei(secondBidValue),
            }
          );

        const receipt2 = await tx2.wait();

        // Assuming you have the timestamp from the event
        const timestampExtended = receipt.events[0].args.startTime;

        // Convert the timestamp to a Date object
        const resultDateExtended: Date = new Date(
          timestampExtended.toNumber() * 1000
        );

        // Add 24 hours to the date
        resultDateExtended.setSeconds(
          resultDateExtended.getSeconds() + auction_duration
        );

        // Add last 5 minutes
        resultDateExtended.setSeconds(
          resultDateExtended.getSeconds() + auction_extension_duration
        );

        expect(receipt2.events[0].event).to.be.equal("AuctionExtended");
        expect(receipt2.events[0].eventSignature).to.be.equal(
          "AuctionExtended(uint256,address,uint256,uint256)"
        );
        expect(receipt2.events[0].args.tokenId).to.be.equal(1);
        expect(receipt2.events[0].args.contractAddress).to.be.equal(
          mintGoldDustERC721.address
        );
        expect(receipt2.events[0].args.newEndTime).to.be.equal(
          resultDateExtended.getTime() / 1000
        );
        expect(receipt2.events[0].args.auctionId).to.be.equal(1);

        expect(receipt2.events[1].event).to.be.equal("LastBidderRefunded");
        expect(receipt2.events[1].eventSignature).to.be.equal(
          "LastBidderRefunded(address,uint256)"
        );
        expect(receipt2.events[1].args.recipient).to.be.equal(addr2.address); // The previous bidder
        expect(receipt2.events[1].args.amount).to.be.equal(toWei(price)); // The previous bid value

        expect(receipt2.events[2].event).to.be.equal("AuctionNewBid");
        expect(receipt2.events[2].eventSignature).to.be.equal(
          "AuctionNewBid(uint256,address,address,address,uint256,uint256,uint256)"
        );
        expect(receipt2.events[2].args.tokenId).to.be.equal(1);
        expect(receipt2.events[2].args.contractAddress).to.be.equal(
          mintGoldDustERC721.address
        );
        expect(receipt2.events[2].args.previousBidder).to.be.equal(
          addr2.address
        );
        expect(receipt2.events[2].args.currentBidder).to.be.equal(
          addr3.address
        );
        expect(receipt2.events[2].args.bid).to.be.equal(toWei(secondBidValue));
        expect(receipt2.events[2].args.bidTime).to.be.equal(
          (await receipt2.events[0].getBlock()).timestamp
        );
        expect(receipt2.events[2].args.auctionId).to.be.equal(1);

        // Assuming you have the timestamp from the event
        const timestamp2 = receipt.events[0].args.startTime;

        // Convert the timestamp to a Date object
        const resultDate2: Date = new Date(timestamp2.toNumber() * 1000);

        // Add 24 hours to the date
        resultDate2.setSeconds(resultDate2.getSeconds() + auction_duration);

        const totalGas2 = receipt2.gasUsed.mul(await tx2.gasPrice);

        let endTimeAfterScondtBid = (
          await mintGoldDustMarketplaceAuction
            .connect(addr1)
            .idMarketItemsByContractByOwner(
              mintGoldDustERC721.address,
              1,
              addr1.address
            )
        ).auctionProps.endTime.toString();

        // ***** EXPECT END TIME TO BE INCREASED MORE 5 MINUTES AFTER SECOND BID ******

        expect(parseInt(endTimeAfterScondtBid)).to.be.equal(
          parseInt(endTimeAfterFirstBid) + auction_extension_duration
        );

        console.log(
          `\n\t\tAUCTION END TIME AFTER SECOND BID SHOULD BE INCREASED (In our test, we're using ${auction_extension_duration} seconds for the last time like example, ${auction_duration} second for auction duration and ${_timeout} seconds of timeout between the two bids): `,
          (
            await mintGoldDustMarketplaceAuction
              .connect(addr1)
              .idMarketItemsByContractByOwner(
                mintGoldDustERC721.address,
                1,
                addr1.address
              )
          ).auctionProps.endTime.toString()
        );
      });
    }); // aqui
  });
});
