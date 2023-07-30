require("dotenv").config();
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect, use } from "chai";
import { Contract, ContractFactory } from "ethers";
import { ethers } from "hardhat";

const toWei = (num: any) => ethers.utils.parseEther(num.toString());
const fromWei = (num: any) => ethers.utils.formatEther(num);

describe("\nMGDAuction.sol Smart Contract \n************___************\n \nThis smart contract is responsible by all functionalities related with the marketplace auction. \n", function () {
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
  let addr5: SignerWithAddress;
  let addr6: SignerWithAddress;
  let addr7: SignerWithAddress;
  let addr8: SignerWithAddress;
  let addr9: SignerWithAddress;
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
  const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

  let primary_sale_fee_percent = 15;
  let secondary_sale_fee_percent = 5;
  let collector_fee = 3;
  let max_royalty = 20;
  let royalty = 5;

  let tokenId = 0;

  beforeEach(async function () {
    MintGoldDustCompany = await ethers.getContractFactory(
      "MintGoldDustCompany"
    );
    MintGoldDustERC721 = await ethers.getContractFactory("MintGoldDustERC721");
    MintGoldDustSetPrice = await ethers.getContractFactory(
      "MintGoldDustSetPrice"
    );
    MintGoldDustMarketplaceAuction = await ethers.getContractFactory(
      "MintGoldDustMarketplaceAuction"
    );
    MintGoldDustERC1155 = await ethers.getContractFactory(
      "MintGoldDustERC1155"
    );
    MintGoldDustMemoir = await ethers.getContractFactory("MintGoldDustMemoir");

    mintGoldDustMemoir = await MintGoldDustMemoir.deploy();
    await mintGoldDustMemoir.deployed();

    [
      deployer,
      addr1,
      addr2,
      addr3,
      addr4,
      addr5,
      addr6,
      addr7,
      addr8,
      addr9,
      ...addrs
    ] = await ethers.getSigners();

    mintGoldDustCompany = await upgrades.deployProxy(
      MintGoldDustCompany,
      [
        TEST_OWNER,
        primary_sale_fee_percent_initial,
        secondary_sale_fee_percent_initial,
        collector_fee_initial,
        max_royalty_initial,
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

  describe("\n****************_**************** Tests related with listing a NFT for Auction ****************_****************\n", function () {
    let price = 1;
    let quantityToMint = 10;
    let quantityToList = 5;
    let priceToPurchase = price * quantityToList;

    beforeEach(async () => {
      // MGD owner whitelist the artist
      await mintGoldDustCompany
        .connect(deployer)
        .whitelist(addr1.address, true);

      const encode = new TextEncoder();
      const bytesMemoir = encode.encode(MEMOIR);

      // addr1 mints a nft
      let transaction = await mintGoldDustERC1155
        .connect(addr1)
        .splitMint(
          URI,
          toWei(5),
          [addr5.address, addr6.address, addr7.address, addr8.address],
          [toWei(20), toWei(20), toWei(20), toWei(20), toWei(20)],
          quantityToMint,
          bytesMemoir
        );
      // Wait for the transaction to be finalized
      const receipt = await transaction.wait();
      tokenId = receipt.events[0].args[3];
      // Artist approve gdMarketPlace marketplace to exchange its NFT
      await mintGoldDustERC1155
        .connect(addr1)
        .setApprovalForAll(mintGoldDustMarketplaceAuction.address, true);
    });

    it("Should track newly listed item, transfer NFT from seller to MGD marketplace and emit the MintGoldDustNftListedToAuction event.", async function () {
      console.log(
        "\t ARTIST BALANCE BEFORE LIST: ",
        parseFloat(parseFloat(fromWei(await addr1.getBalance())).toFixed(5))
      );

      let artistBalanceBefore = await addr1.getBalance();

      const tx = await mintGoldDustMarketplaceAuction
        .connect(addr1)
        .list(
          tokenId,
          quantityToList,
          mintGoldDustERC1155.address,
          toWei(price)
        );
      const receipt = await tx.wait();

      // Check that the transaction emitted an event
      expect(receipt.events?.length).to.equal(2);

      // Get the block timestamp
      const block = await ethers.provider.getBlock(receipt.blockNumber);
      const timestamp = block.timestamp;
      expect(timestamp).to.be.above(0);

      expect(receipt.events[1].event).to.equal(
        "MintGoldDustNftListedToAuction"
      );
      expect(receipt.events[1].args.length).to.equal(6);
      expect(receipt.events[1].args[0]).to.be.equal(1);
      expect(receipt.events[1].args[1]).to.be.equal(1);
      expect(receipt.events[1].args[2]).to.be.equal(addr1.address);
      expect(receipt.events[1].args[3]).to.be.equal(toWei(price));
      expect(receipt.events[1].args[4]).to.be.equal(timestamp);
      expect(receipt.events[1].args[5]).to.be.equal(
        mintGoldDustERC1155.address
      );

      console.log(
        "\t ARTIST BALANCE AFTER LIST: ",
        parseFloat(parseFloat(fromWei(await addr1.getBalance())).toFixed(5))
      );

      console.log(
        "\t \tSo the gas estimation was more less (IN USD):",
        parseFloat(
          fromWei(
            ethers.BigNumber.from(artistBalanceBefore).sub(
              await addr1.getBalance()
            )
          )
        ) * 2500
      );

      // owner should be the marketplace
      expect(
        await mintGoldDustERC1155.balanceOf(
          mintGoldDustMarketplaceAuction.address,
          1
        )
      ).to.equal(quantityToList);

      expect(await mintGoldDustERC1155.balanceOf(addr1.address, 1)).to.equal(
        quantityToMint - quantityToList
      );
    });

    it("Should revert the transaction if an artist is not the owner of the token and try to list on the gold dust marketplace.", async function () {
      expect(
        mintGoldDustMarketplaceAuction
          .connect(addr2)
          .list(
            1,
            quantityToList,
            mintGoldDustERC1155.address,
            toWei(price)
          )
      )
        .to.revertedWithCustomError(
          mintGoldDustMarketplaceAuction,
          "MintGoldDustAddressUnauthorized"
        )
        .withArgs("Not owner!");
    });

    it("Should track a creation of an auction without a reserve price that expect the following conditions: \n \t - Expect emit the MintGoldDustNftListedToAuction event; \n \t - Expect auction structure attributes match with all passed to create auction function; \n \t - Auction end time should not be started yet to 24 hours and should be zero. \n \t - The auction price (initial price) should be zero. This way after any bid greater than zero the time of 24 hours should starts.", async () => {
      const tx = await mintGoldDustMarketplaceAuction
        .connect(addr1)
        .list(1, quantityToList, mintGoldDustERC1155.address, toWei(0));
      const receipt = await tx.wait();

      // Check that the transaction emitted an event
      expect(receipt.events?.length).to.equal(2);

      // Get the block timestamp
      const block = await ethers.provider.getBlock(receipt.blockNumber);
      const timestamp = block.timestamp;
      expect(timestamp).to.be.above(0);

      expect(receipt.events[1].event).to.equal(
        "MintGoldDustNftListedToAuction"
      );
      expect(receipt.events[1].args.length).to.equal(6);
      expect(receipt.events[1].args[0]).to.be.equal(1);
      expect(receipt.events[1].args[1]).to.be.equal(1);
      expect(receipt.events[1].args[2]).to.be.equal(addr1.address);
      expect(receipt.events[1].args[3]).to.be.equal(toWei(0));
      expect(receipt.events[1].args[4]).to.be.equal(timestamp);
      expect(receipt.events[1].args[5]).to.be.equal(
        mintGoldDustERC1155.address
      );

      let marketItem =
        await mintGoldDustMarketplaceAuction.idMarketItemsByContractByOwner(
          mintGoldDustERC1155.address,
          1,
          addr1.address
        );

      expect(marketItem.tokenId).to.be.equal(1);
      expect(marketItem.seller).to.be.equal(addr1.address);
      expect(marketItem.price).to.be.equal(0);
      expect(marketItem.sold).to.be.equal(false);
      expect(marketItem.isAuction).to.be.equal(true);
      expect(marketItem.auctionProps.endTime).to.be.equal(0);
      expect(marketItem.auctionProps.highestBidder).to.be.equal(ZERO_ADDRESS);
      expect(marketItem.auctionProps.highestBid).to.be.equal(0);
      expect(marketItem.auctionProps.cancelled).to.be.equal(false);
      expect(marketItem.auctionProps.ended).to.be.equal(false);
    });

    it("Should track a creation of an auction with a reserve price that expect the following conditions: \n \t - Expect emit the MintGoldDustNftListedToAuction event; \n \t - Expect auction structure attributes match with all passed to create auction function; \n \t - Auction end time should not be started yet to 24 hours and should be zero. \n \t - The auction price (initial price) should be zero. This way after any bid greater than zero the time of 24 hours should starts.", async () => {
      const tx = await mintGoldDustMarketplaceAuction
        .connect(addr1)
        .list(
          1,
          quantityToList,
          mintGoldDustERC1155.address,
          toWei(price)
        );
      const receipt = await tx.wait();

      // Check that the transaction emitted an event
      expect(receipt.events?.length).to.equal(2);

      // Get the block timestamp
      const block = await ethers.provider.getBlock(receipt.blockNumber);
      const timestamp = block.timestamp;
      expect(timestamp).to.be.above(0);

      expect(receipt.events[1].event).to.equal(
        "MintGoldDustNftListedToAuction"
      );
      expect(receipt.events[1].args.length).to.equal(6);
      expect(receipt.events[1].args[0]).to.be.equal(1);
      expect(receipt.events[1].args[1]).to.be.equal(1);
      expect(receipt.events[1].args[2]).to.be.equal(addr1.address);
      expect(receipt.events[1].args[3]).to.be.equal(toWei(price));
      expect(receipt.events[1].args[4]).to.be.equal(timestamp);
      expect(receipt.events[1].args[5]).to.be.equal(
        mintGoldDustERC1155.address
      );

      let marketItem =
        await mintGoldDustMarketplaceAuction.idMarketItemsByContractByOwner(
          mintGoldDustERC1155.address,
          1,
          addr1.address
        );

      expect(marketItem.tokenId).to.be.equal(1);
      expect(marketItem.seller).to.be.equal(addr1.address);
      expect(marketItem.price).to.be.equal(toWei(price));
      expect(marketItem.sold).to.be.equal(false);
      expect(marketItem.isAuction).to.be.equal(true);
      expect(marketItem.auctionProps.endTime).to.be.equal(0);
      expect(marketItem.auctionProps.highestBidder).to.be.equal(ZERO_ADDRESS);
      expect(marketItem.auctionProps.highestBid).to.be.equal(toWei(0));
      expect(marketItem.auctionProps.cancelled).to.be.equal(false);
      expect(marketItem.auctionProps.ended).to.be.equal(false);
    });
  });

  describe("\n \n **************__************** PLACE A BID GENERAL UNHAPPY PATHS **************__**************", function () {
    let price = 4;
    const _duration = 3; // seconds
    const _finalTime = 1; // seconds
    const _timeout = 4 * 1000; // seconds
    let quantityToMint = 10;
    let quantityToList = 5;
    let priceToPurchase = price * quantityToList;

    beforeEach(async () => {
      await mintGoldDustCompany.updateAuctionTimeDuration(_duration);
      await mintGoldDustCompany.updateAuctionFinalMinutes(_finalTime);
      // MGD owner whitelist the artist
      await mintGoldDustCompany
        .connect(deployer)
        .whitelist(addr1.address, true);

      const encode = new TextEncoder();
      const bytesMemoir = encode.encode(MEMOIR);

      // addr1 mints a nft
      await mintGoldDustERC1155
        .connect(addr1)
        .splitMint(
          URI,
          toWei(5),
          [addr5.address, addr6.address, addr7.address],
          [toWei(25), toWei(25), toWei(25), toWei(25)],
          quantityToMint,
          bytesMemoir
        );
      // Artist approve gdMarketPlace marketplace to exchange its NFT
      await mintGoldDustERC1155
        .connect(addr1)
        .setApprovalForAll(mintGoldDustMarketplaceAuction.address, true);
    });

    it("Should revert with an AuctionMustBeEnded() error when some user tries to bid in a timed auction that have ended already.", async function () {
      await mintGoldDustMarketplaceAuction
        .connect(addr1)
        .list(
          1,
          quantityToList,
          mintGoldDustERC1155.address,
          toWei(price)
        );

      // The first bid greater than zero, starts the time. In our test 3 seconds
      await mintGoldDustMarketplaceAuction.connect(addr2).placeBid(
        {
          tokenId: 1,
          contractAddress: mintGoldDustERC1155.address,
          seller: addr1.address,
        },
        {
          value: toWei(priceToPurchase),
        }
      );

      // Let's wait 4 seconds
      await new Promise((resolve) => setTimeout(resolve, _timeout));

      // addr3 tries to place a new bid after the time ends
      await expect(
        mintGoldDustMarketplaceAuction.connect(addr3).placeBid(
          {
            tokenId: 1,
            contractAddress: mintGoldDustERC1155.address,
            seller: addr1.address,
          },
          {
            value: toWei(priceToPurchase + 1),
          }
        )
      )
        .to.be.revertedWithCustomError(
          MintGoldDustMarketplaceAuction,
          "AuctionMustBeEnded"
        )
        .withArgs(1);
    });

    it("Should revert with an AuctionCreatorCannotBid() error if the auction creator (NFT Owner) tries to place a bid.", async function () {
      await mintGoldDustMarketplaceAuction
        .connect(addr1)
        .list(
          1,
          quantityToList,
          mintGoldDustERC1155.address,
          toWei(price)
        );
      await expect(
        mintGoldDustMarketplaceAuction.connect(addr1).placeBid(
          {
            tokenId: 1,
            contractAddress: mintGoldDustERC1155.address,
            seller: addr1.address,
          },
          {
            value: toWei(priceToPurchase),
          }
        )
      ).to.be.revertedWithCustomError(
        MintGoldDustMarketplaceAuction,
        "AuctionCreatorCannotBid"
      );
    });

    it("Should revert with an LastBidderCannotPlaceNextBid() error if the last bidder tries to place a bid again.", async function () {
      await mintGoldDustMarketplaceAuction
        .connect(addr1)
        .list(
          1,
          quantityToList,
          mintGoldDustERC1155.address,
          toWei(price)
        );

      await expect(
        mintGoldDustMarketplaceAuction.connect(addr2).placeBid(
          {
            tokenId: 1,
            contractAddress: mintGoldDustERC1155.address,
            seller: addr1.address,
          },
          {
            value: toWei(priceToPurchase),
          }
        )
      ).to.emit(mintGoldDustMarketplaceAuction, "AuctionNewBid");

      await expect(
        mintGoldDustMarketplaceAuction.connect(addr2).placeBid(
          {
            tokenId: 1,
            contractAddress: mintGoldDustERC1155.address,
            seller: addr1.address,
          },
          {
            value: toWei(priceToPurchase + 1),
          }
        )
      ).to.be.revertedWithCustomError(
        MintGoldDustMarketplaceAuction,
        "LastBidderCannotPlaceNextBid"
      );
    });

    it("Should revert with an BidTooLow() error when some user tries to place bid with a value equal the highest bid.", async function () {
      await mintGoldDustMarketplaceAuction
        .connect(addr1)
        .list(
          1,
          quantityToList,
          mintGoldDustERC1155.address,
          toWei(price)
        );
      await mintGoldDustMarketplaceAuction.connect(addr2).placeBid(
        {
          tokenId: 1,
          contractAddress: mintGoldDustERC1155.address,
          seller: addr1.address,
        },
        {
          value: toWei(priceToPurchase),
        }
      );

      await expect(
        mintGoldDustMarketplaceAuction.connect(addr3).placeBid(
          {
            tokenId: 1,
            contractAddress: mintGoldDustERC1155.address,
            seller: addr1.address,
          },
          {
            value: toWei(priceToPurchase),
          }
        )
      ).to.be.revertedWithCustomError(
        MintGoldDustMarketplaceAuction,
        "BidTooLow"
      );
    });

    it("Should revert with an BidTooLow() error when some user tries to place bid with a value less than the highest bid.", async function () {
      await mintGoldDustMarketplaceAuction
        .connect(addr1)
        .list(
          1,
          quantityToList,
          mintGoldDustERC1155.address,
          toWei(price)
        );

      await mintGoldDustMarketplaceAuction.connect(addr2).placeBid(
        {
          tokenId: 1,
          contractAddress: mintGoldDustERC1155.address,
          seller: addr1.address,
        },
        {
          value: toWei(priceToPurchase),
        }
      );

      await expect(
        mintGoldDustMarketplaceAuction.connect(addr3).placeBid(
          {
            tokenId: 1,
            contractAddress: mintGoldDustERC1155.address,
            seller: addr1.address,
          },
          {
            value: toWei(priceToPurchase - 1),
          }
        )
      ).to.be.revertedWithCustomError(
        MintGoldDustMarketplaceAuction,
        "BidTooLow"
      );
    });

    it("Should revert with an BidTooLow() error when some user tries to place the first bid with a value less than the reserve price in an auction with a reserve price.", async function () {
      await mintGoldDustMarketplaceAuction
        .connect(addr1)
        .list(
          1,
          quantityToList,
          mintGoldDustERC1155.address,
          toWei(price)
        );
      await expect(
        mintGoldDustMarketplaceAuction.connect(addr2).placeBid(
          {
            tokenId: 1,
            contractAddress: mintGoldDustERC1155.address,
            seller: addr1.address,
          },
          {
            value: toWei(priceToPurchase - 1),
          }
        )
      ).to.be.revertedWithCustomError(
        MintGoldDustMarketplaceAuction,
        "BidTooLow"
      );
    });

    it("Should revert with an BidTooLow() error when some user tries to place the first bid with a value equal zero in an auction without a reserve price.", async function () {
      await mintGoldDustMarketplaceAuction
        .connect(addr1)
        .list(1, quantityToList, mintGoldDustERC1155.address, toWei(0));
      await expect(
        mintGoldDustMarketplaceAuction.connect(addr2).placeBid(
          {
            tokenId: 1,
            contractAddress: mintGoldDustERC1155.address,
            seller: addr1.address,
          },
          {
            value: toWei(0),
          }
        )
      ).to.be.revertedWithCustomError(
        MintGoldDustMarketplaceAuction,
        "BidTooLow"
      );
    });
  });

  describe("\n \n ****************_**************** PLACE A BID HAPPY PATHS ****************_****************\n", function () {
    let price = 4;
    const _duration = 10; // seconds
    const _finalTime = 8; // seconds
    const _timeout = 3 * 1000; // seconds
    let expectedEndTime;
    let quantityToMint = 10;
    let quantityToList = 5;
    let priceToPurchase = price * quantityToList;

    beforeEach(async () => {
      await mintGoldDustCompany.updateAuctionTimeDuration(_duration);
      await mintGoldDustCompany.updateAuctionFinalMinutes(_finalTime);
      // MGD owner whitelist the artist
      await mintGoldDustCompany
        .connect(deployer)
        .whitelist(addr1.address, true);

      const encode = new TextEncoder();
      const bytesMemoir = encode.encode(MEMOIR);

      // addr1 mints a nft
      await mintGoldDustERC1155
        .connect(addr1)
        .splitMint(
          URI,
          toWei(5),
          [addr5.address, addr6.address, addr7.address, addr8.address],
          [toWei(20), toWei(20), toWei(20), toWei(20), toWei(20)],
          quantityToMint,
          bytesMemoir
        );
      // Artist approve gdMarketPlace marketplace to exchange its NFT
      await mintGoldDustERC1155
        .connect(addr1)
        .setApprovalForAll(mintGoldDustMarketplaceAuction.address, true);
    });

    describe("\n\t------------------ AUCTION WITH A RESERVE PRICE ------------------\n", () => {
      beforeEach(async () => {
        await mintGoldDustMarketplaceAuction
          .connect(addr1)
          .list(
            1,
            quantityToList,
            mintGoldDustERC1155.address,
            toWei(price)
          );
      });
      it("Should place a first bid and: \n\t - Verify if the highest bid was updated. \n\t - Verify if the endAuction time was updated. \n\t - Verify if the bidder balance was decreased the gas fee plus the auction price. \n\t - Verify if the auction contract balance was added by the bid value.", async function () {
        console.log(
          "\t\tHIGHEST BID BEFORE FIRST BID: ",
          (
            await mintGoldDustMarketplaceAuction
              .connect(addr1)
              .idMarketItemsByContractByOwner(
                mintGoldDustERC1155.address,
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
                mintGoldDustERC1155.address,
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
                mintGoldDustERC1155.address,
                1,
                addr1.address
              )
          ).auctionProps.endTime
        );
        let gasPrice =
          await mintGoldDustMarketplaceAuction.signer.getGasPrice();
        let gasLimit =
          await mintGoldDustMarketplaceAuction.estimateGas.placeBid(
            {
              tokenId: 1,
              contractAddress: mintGoldDustERC1155.address,
              seller: addr1.address,
            },
            {
              value: toWei(priceToPurchase),
            }
          );

        console.log("\t\tGAS PRICE TO PLACE A BID: ", gasPrice);
        console.log("\t\tGAS LIMIT TO PLACE A BID: ", gasLimit);

        console.log(
          "\t\t\tTOTAL GAS ESTIMATION (USD): ",
          (+ethers.BigNumber.from(gasPrice).mul(gasLimit) / (100 * 10 ** 18)) *
            2500
        );
        expect(
          (
            await mintGoldDustMarketplaceAuction
              .connect(addr1)
              .idMarketItemsByContractByOwner(
                mintGoldDustERC1155.address,
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
        expectedEndTime = Math.floor(Date.now() / 1000) + _duration;

        await expect(
          mintGoldDustMarketplaceAuction.connect(addr2).placeBid(
            {
              tokenId: 1,
              contractAddress: mintGoldDustERC1155.address,
              seller: addr1.address,
            },
            {
              value: toWei(priceToPurchase),
            }
          )
        ).to.emit(mintGoldDustMarketplaceAuction, "AuctionNewBid");

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
                .add(toWei(priceToPurchase))
                .add(ethers.BigNumber.from(gasPrice).mul(gasLimit))
            )
          )
        );

        expect(parseFloat(fromWei(bidderBalanceBefore)).toFixed(3)).to.be.equal(
          parseFloat(
            fromWei(
              ethers.BigNumber.from(bidderBalanceAfter)
                .add(toWei(priceToPurchase))
                .add(ethers.BigNumber.from(gasPrice).mul(gasLimit))
            )
          ).toFixed(3)
        );

        // Verify if the end time was set to 24 hours after the first bid greater than zero.
        expect(
          (
            await mintGoldDustMarketplaceAuction
              .connect(addr1)
              .idMarketItemsByContractByOwner(
                mintGoldDustERC1155.address,
                1,
                addr1.address
              )
          ).auctionProps.endTime
        ).to.be.closeTo(expectedEndTime, 1000);

        console.log(
          "\n\t\tAUCTION END TIME AFTER BID: ",
          (
            await mintGoldDustMarketplaceAuction
              .connect(addr1)
              .idMarketItemsByContractByOwner(
                mintGoldDustERC1155.address,
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
                    mintGoldDustERC1155.address,
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
                mintGoldDustERC1155.address,
                1,
                addr1.address
              )
          ).auctionProps.highestBid
        ).to.be.equal(toWei(priceToPurchase));
      });
    });

    describe("\n\t------------------ AUCTION WITHOUT A RESERVE PRICE ------------------\n", () => {
      beforeEach(async () => {
        await mintGoldDustMarketplaceAuction
          .connect(addr1)
          .list(1, quantityToList, mintGoldDustERC1155.address, toWei(0));
      });
      it("Should place a first bid and: \n\t - Verify if the highest bid was updated. \n\t - Verify if the endAuction time was updated. \n\t - Verify if the bidder balance was decreased the gas fee plus the auction price. \n\t - Verify if the auction contract balance was added by the bid value.", async function () {
        console.log(
          "\t\tHIGHEST price BEFORE FIRST BID: ",
          (
            await mintGoldDustMarketplaceAuction
              .connect(addr1)
              .idMarketItemsByContractByOwner(
                mintGoldDustERC1155.address,
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
                mintGoldDustERC1155.address,
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
                mintGoldDustERC1155.address,
                1,
                addr1.address
              )
          ).auctionProps.endTime
        );
        let gasPrice =
          await mintGoldDustMarketplaceAuction.signer.getGasPrice();
        let gasLimit =
          await mintGoldDustMarketplaceAuction.estimateGas.placeBid(
            {
              tokenId: 1,
              contractAddress: mintGoldDustERC1155.address,
              seller: addr1.address,
            },
            {
              value: toWei(priceToPurchase),
            }
          );

        console.log("\t\tGAS PRICE TO PLACE A BID: ", gasPrice);
        console.log("\t\tGAS LIMIT TO PLACE A BID: ", gasLimit);

        console.log(
          "\t\t\tTOTAL GAS ESTIMATION (USD): ",
          (+ethers.BigNumber.from(gasPrice).mul(gasLimit) / (100 * 10 ** 18)) *
            2500
        );
        expect(
          (
            await mintGoldDustMarketplaceAuction
              .connect(addr1)
              .idMarketItemsByContractByOwner(
                mintGoldDustERC1155.address,
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
        expectedEndTime = Math.floor(Date.now() / 1000) + _duration;

        await expect(
          mintGoldDustMarketplaceAuction.connect(addr2).placeBid(
            {
              tokenId: 1,
              contractAddress: mintGoldDustERC1155.address,
              seller: addr1.address,
            },
            {
              value: toWei(priceToPurchase),
            }
          )
        ).to.emit(mintGoldDustMarketplaceAuction, "AuctionNewBid");

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
                .add(toWei(priceToPurchase))
                .add(ethers.BigNumber.from(gasPrice).mul(gasLimit))
            )
          )
        );

        expect(parseFloat(fromWei(bidderBalanceBefore)).toFixed(4)).to.be.equal(
          parseFloat(
            fromWei(
              ethers.BigNumber.from(bidderBalanceAfter)
                .add(toWei(priceToPurchase))
                .add(ethers.BigNumber.from(gasPrice).mul(gasLimit))
            )
          ).toFixed(4)
        );

        // Verify if the end time was set to 24 hours after the first bid greater than zero.
        expect(
          (
            await mintGoldDustMarketplaceAuction
              .connect(addr1)
              .idMarketItemsByContractByOwner(
                mintGoldDustERC1155.address,
                1,
                addr1.address
              )
          ).auctionProps.endTime
        ).to.be.closeTo(expectedEndTime, 1000);

        console.log(
          "\n\t\tAUCTION END TIME AFTER BID: ",
          (
            await mintGoldDustMarketplaceAuction
              .connect(addr1)
              .idMarketItemsByContractByOwner(
                mintGoldDustERC1155.address,
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
                    mintGoldDustERC1155.address,
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
                mintGoldDustERC1155.address,
                1,
                addr1.address
              )
          ).auctionProps.highestBid
        ).to.be.equal(toWei(priceToPurchase));
      });
    });

    describe("\n\t------------------ SECOND BID BUT BEFORE THE LAST 5 MINUTES ------------------\n", () => {
      const secondBidValue = priceToPurchase + 2;
      beforeEach(async () => {
        await mintGoldDustMarketplaceAuction
          .connect(addr1)
          .list(1, quantityToList, mintGoldDustERC1155.address, toWei(0));
      });
      it("Should place a first bid and: \n\t - Verify if the highest bid was updated. \n\t - Verify if the endAuction time was updated. \n\t - Verify if the bidder balance was decreased the gas fee plus the auction price. \n\t - Verify if the auction contract balance was added by the bid value.", async function () {
        console.log(
          "\t\tHIGHEST price BEFORE FIRST BID: ",
          (
            await mintGoldDustMarketplaceAuction
              .connect(addr1)
              .idMarketItemsByContractByOwner(
                mintGoldDustERC1155.address,
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
                mintGoldDustERC1155.address,
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
                mintGoldDustERC1155.address,
                1,
                addr1.address
              )
          ).auctionProps.endTime
        );
        let gasPrice =
          await mintGoldDustMarketplaceAuction.signer.getGasPrice();
        let gasLimit =
          await mintGoldDustMarketplaceAuction.estimateGas.placeBid(
            {
              tokenId: 1,
              contractAddress: mintGoldDustERC1155.address,
              seller: addr1.address,
            },
            {
              value: toWei(priceToPurchase),
            }
          );

        expect(
          (
            await mintGoldDustMarketplaceAuction
              .connect(addr1)
              .idMarketItemsByContractByOwner(
                mintGoldDustERC1155.address,
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
        expectedEndTime = Math.floor(Date.now() / 1000) + _duration;

        // ******************** FIRST BID ****************************
        await expect(
          mintGoldDustMarketplaceAuction.connect(addr2).placeBid(
            {
              tokenId: 1,
              contractAddress: mintGoldDustERC1155.address,
              seller: addr1.address,
            },
            {
              value: toWei(priceToPurchase),
            }
          )
        ).to.emit(mintGoldDustMarketplaceAuction, "AuctionNewBid");

        let bidder1BalanceAfter = await addr2.getBalance();
        let mgdAuctionBalanceAfter = await provider.getBalance(
          mintGoldDustMarketplaceAuction.address
        );

        let bidder2BalanceBefore = await addr3.getBalance();

        let gasPrice2 =
          await mintGoldDustMarketplaceAuction.signer.getGasPrice();
        let gasLimit2 =
          await mintGoldDustMarketplaceAuction.estimateGas.placeBid(
            {
              tokenId: 1,
              contractAddress: mintGoldDustERC1155.address,
              seller: addr1.address,
            },
            {
              value: toWei(secondBidValue),
            }
          );

        console.log(
          "\n\t\tHIGHEST BID AFTER FIRST BID: ",
          parseFloat(
            fromWei(
              (
                await mintGoldDustMarketplaceAuction
                  .connect(addr1)
                  .idMarketItemsByContractByOwner(
                    mintGoldDustERC1155.address,
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
                mintGoldDustERC1155.address,
                1,
                addr1.address
              )
          ).auctionProps.endTime.toString()
        );

        let endTimeAfterFirstBid = (
          await mintGoldDustMarketplaceAuction
            .connect(addr1)
            .idMarketItemsByContractByOwner(
              mintGoldDustERC1155.address,
              1,
              addr1.address
            )
        ).auctionProps.endTime.toString();

        // **** VERIFY IF THE END TIME WAS SET TO 24 HOURS AFTER THE FIRST BID GREATER THAN ZERO ****
        expect(
          (
            await mintGoldDustMarketplaceAuction
              .connect(addr1)
              .idMarketItemsByContractByOwner(
                mintGoldDustERC1155.address,
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
                mintGoldDustERC1155.address,
                1,
                addr1.address
              )
          ).auctionProps.highestBid
        ).to.be.equal(toWei(priceToPurchase));

        // ******************** SECOND BID ***********************
        await expect(
          mintGoldDustMarketplaceAuction.connect(addr3).placeBid(
            {
              tokenId: 1,
              contractAddress: mintGoldDustERC1155.address,
              seller: addr1.address,
            },
            {
              value: toWei(secondBidValue),
            }
          )
        ).to.emit(mintGoldDustMarketplaceAuction, "AuctionNewBid");

        let endTimeAfterScondtBid = (
          await mintGoldDustMarketplaceAuction
            .connect(addr1)
            .idMarketItemsByContractByOwner(
              mintGoldDustERC1155.address,
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
                .add(toWei(priceToPurchase))
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
                .add(toWei(priceToPurchase))
                .add(ethers.BigNumber.from(gasPrice).mul(gasLimit))
            )
          ).toFixed(4)
        );

        // **** EXPECT THE BIDDER 1 TO BE REFUNDED AFTER SECOND BID ****
        expect(bidder1BalanceAfterSecondBid).to.be.equal(
          ethers.BigNumber.from(bidder1BalanceAfter).add(toWei(priceToPurchase))
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
          (
            await mintGoldDustMarketplaceAuction
              .connect(addr1)
              .idMarketItemsByContractByOwner(
                mintGoldDustERC1155.address,
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
                    mintGoldDustERC1155.address,
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
                mintGoldDustERC1155.address,
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
                mintGoldDustERC1155.address,
                1,
                addr1.address
              )
          ).auctionProps.highestBid
        ).to.be.equal(toWei(secondBidValue));
      });
    });

    describe("\n\t------------------ SECOND BID NOW IN THE LAST 5 MINUTES ------------------\n", () => {
      const secondBidValue = priceToPurchase + 2;
      beforeEach(async () => {
        await mintGoldDustMarketplaceAuction
          .connect(addr1)
          .list(1, quantityToList, mintGoldDustERC1155.address, toWei(0));
      });
      it("Should place a second bid in the last 5 minutes and: \n\t - Verify if the end time was increased by more 5 minutes.", async function () {
        console.log(
          "\t\tAUCTION TIME BEFORE FIRST BID: ",
          parseFloat(
            fromWei(
              (
                await mintGoldDustMarketplaceAuction
                  .connect(addr1)
                  .idMarketItemsByContractByOwner(
                    mintGoldDustERC1155.address,
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
                mintGoldDustERC1155.address,
                1,
                addr1.address
              )
          ).auctionProps.endTime
        ).to.be.equal(0);

        // The first bid greater than zero, starts the time. In our test 3 seconds
        expectedEndTime = Math.floor(Date.now() / 1000) + _duration;

        // *********************** FIRST BID ****************************
        await expect(
          mintGoldDustMarketplaceAuction.connect(addr2).placeBid(
            {
              tokenId: 1,
              contractAddress: mintGoldDustERC1155.address,
              seller: addr1.address,
            },
            {
              value: toWei(priceToPurchase),
            }
          )
        ).to.emit(mintGoldDustMarketplaceAuction, "AuctionNewBid");

        console.log(
          "\t\tAUCTION END TIME AFTER FIRST BID: ",
          (
            await mintGoldDustMarketplaceAuction
              .connect(addr1)
              .idMarketItemsByContractByOwner(
                mintGoldDustERC1155.address,
                1,
                addr1.address
              )
          ).auctionProps.endTime.toString()
        );

        let endTimeAfterFirstBid = (
          await mintGoldDustMarketplaceAuction
            .connect(addr1)
            .idMarketItemsByContractByOwner(
              mintGoldDustERC1155.address,
              1,
              addr1.address
            )
        ).auctionProps.endTime.toString();

        // **** VERIFY IF THE END TIME WAS SET TO 24 HOURS AFTER THE FIRST BID GREATER THAN ZERO ****
        expect(
          (
            await mintGoldDustMarketplaceAuction
              .connect(addr1)
              .idMarketItemsByContractByOwner(
                mintGoldDustERC1155.address,
                1,
                addr1.address
              )
          ).auctionProps.endTime
        ).to.be.closeTo(expectedEndTime, 1000);

        console.log(`\n\t\tWaiting until the last 5 minutes of the auction...`);
        await new Promise((resolve) => setTimeout(resolve, _timeout));

        // ******************** SECOND BID ***********************
        await expect(
          mintGoldDustMarketplaceAuction.connect(addr3).placeBid(
            {
              tokenId: 1,
              contractAddress: mintGoldDustERC1155.address,
              seller: addr1.address,
            },
            {
              value: toWei(secondBidValue),
            }
          )
        ).to.emit(mintGoldDustMarketplaceAuction, "AuctionNewBid");

        let endTimeAfterScondtBid = (
          await mintGoldDustMarketplaceAuction
            .connect(addr1)
            .idMarketItemsByContractByOwner(
              mintGoldDustERC1155.address,
              1,
              addr1.address
            )
        ).auctionProps.endTime.toString();

        // ***** EXPECT END TIME TO BE INCREASED MORE 5 MINUTES AFTER SECOND BID ******

        expect(parseInt(endTimeAfterScondtBid)).to.be.equal(
          parseInt(endTimeAfterFirstBid) + _finalTime
        );

        console.log(
          `\n\t\tAUCTION END TIME AFTER SECOND BID SHOULD BE INCREASED (In our test, we're using ${_finalTime} seconds for the last time like example, ${_duration} second for auction duration and ${_timeout} seconds of timeout between the two bids): `,
          (
            await mintGoldDustMarketplaceAuction
              .connect(addr1)
              .idMarketItemsByContractByOwner(
                mintGoldDustERC1155.address,
                1,
                addr1.address
              )
          ).auctionProps.endTime.toString()
        );
      });
    });
  });

  describe("\n \n ****************_**************** END AUCTION UNHAPPY PATHS ****************_****************\n", function () {
    let price = 4;
    const _duration = 10; // seconds
    const _finalTime = 8; // seconds
    const _timeout = 3 * 1000; // seconds
    const quantityToList = 5;
    const quantityToMint = 10;
    let priceToPurchase = price * quantityToList;

    beforeEach(async () => {
      await mintGoldDustCompany.updateAuctionTimeDuration(_duration);
      await mintGoldDustCompany.updateAuctionFinalMinutes(_finalTime);
      // MGD owner whitelist the artist
      await mintGoldDustCompany
        .connect(deployer)
        .whitelist(addr1.address, true);

      const encode = new TextEncoder();
      const bytesMemoir = encode.encode(MEMOIR);

      // addr1 mints a nft
      await mintGoldDustERC1155
        .connect(addr1)
        .splitMint(
          URI,
          toWei(5),
          [addr5.address, addr6.address, addr7.address, addr8.address],
          [toWei(20), toWei(20), toWei(20), toWei(20), toWei(20)],
          quantityToMint,
          bytesMemoir
        );
      // Artist approve gdMarketPlace marketplace to exchange its NFT
      await mintGoldDustERC1155
        .connect(addr1)
        .setApprovalForAll(mintGoldDustMarketplaceAuction.address, true);
    });

    it("Should revert with MintGoldDustItemIsNotListed error if the end auction function is called and the tokenId was not listed on MintGoldDustMarketplaceAuction.", async () => {
      await mintGoldDustERC1155
        .connect(addr1)
        .setApprovalForAll(mintGoldDustSetPrice.address, true);

      await mintGoldDustSetPrice
        .connect(addr1)
        .list(
          1,
          quantityToList,
          mintGoldDustERC1155.address,
          toWei(price)
        );

      await expect(
        mintGoldDustMarketplaceAuction.endAuction({
          tokenId: 1,
          contractAddress: mintGoldDustERC1155.address,
          seller: addr1.address,
        })
      )
        .to.be.revertedWithCustomError(
          mintGoldDustMarketplaceAuction,
          "MintGoldDustItemIsNotListed"
        )
        .withArgs(mintGoldDustERC1155.address);
    });

    it("Should revert with AuctionTimeNotStartedYet error if the end auction function is called and the auction have not received any bids yet.", async () => {
      await mintGoldDustMarketplaceAuction
        .connect(addr1)
        .list(
          1,
          quantityToList,
          mintGoldDustERC1155.address,
          toWei(price)
        );
      await expect(
        mintGoldDustMarketplaceAuction.endAuction({
          tokenId: 1,
          contractAddress: mintGoldDustERC1155.address,
          seller: addr1.address,
        })
      ).to.be.revertedWithCustomError(
        mintGoldDustMarketplaceAuction,
        "AuctionTimeNotStartedYet"
      );
    });

    it("Should revert with AuctionCannotBeEndedYet error if the end auction function is called before the time of duration of the auction be ended.", async () => {
      await mintGoldDustMarketplaceAuction
        .connect(addr1)
        .list(
          1,
          quantityToList,
          mintGoldDustERC1155.address,
          toWei(price)
        );
      await mintGoldDustMarketplaceAuction.connect(addr2).placeBid(
        {
          tokenId: 1,
          contractAddress: mintGoldDustERC1155.address,
          seller: addr1.address,
        },
        {
          value: toWei(priceToPurchase),
        }
      );
      await expect(
        mintGoldDustMarketplaceAuction.endAuction({
          tokenId: 1,
          contractAddress: mintGoldDustERC1155.address,
          seller: addr1.address,
        })
      ).to.be.revertedWithCustomError(
        mintGoldDustMarketplaceAuction,
        "AuctionCannotBeEndedYet"
      );
    });

    it("Should revert with MintGoldDustFunctionForSetPriceListedNFT error if the purchaseNFT function with one parameter is called to buy an item that is listed to Auction. For that the purchseNFT function with two params must be called and its function is internal and just can be called by the childrens smart contracts like the MintGoldDustMarketplaceAuction.", async () => {
      await mintGoldDustMarketplaceAuction
        .connect(addr1)
        .list(
          1,
          quantityToList,
          mintGoldDustERC1155.address,
          toWei(price)
        );
      await expect(
        mintGoldDustMarketplaceAuction.connect(addr2).purchaseNft(
          {
            tokenId: 1,
            amount: quantityToList,
            contractAddress: mintGoldDustERC1155.address,
            seller: addr1.address,
          },
          {
            value: toWei(priceToPurchase),
          }
        )
      ).to.be.revertedWithCustomError(
        mintGoldDustMarketplaceAuction,
        "MintGoldDustFunctionForSetPriceListedNFT"
      );
    });
  });

  describe("\n \n ****************_**************** END AUCTION FOR PRIMARY SALE ****************_****************\n", function () {
    const _duration = 2; // seconds
    const _finalTime = 1; // seconds
    const _timeout = 3 * 1000; // seconds
    const quantityToList = 4;
    const quantityToMint = 4;

    let price = 20;
    // Calculate the fee and balance values based on the price
    let fee: number;
    let balance: number;
    let collFee: number;
    let primarySaleFee: number;
    let priceToPurchase = price * quantityToList;

    beforeEach(async () => {
      await mintGoldDustCompany.updateAuctionTimeDuration(_duration);
      await mintGoldDustCompany.updateAuctionFinalMinutes(_finalTime);
      // MGD owner whitelist the artist
      await mintGoldDustCompany
        .connect(deployer)
        .whitelist(addr1.address, true);

      const encode = new TextEncoder();
      const bytesMemoir = encode.encode(MEMOIR);

      // addr1 mints a nft
      await mintGoldDustERC1155
        .connect(addr1)
        .splitMint(
          URI,
          toWei(5),
          [addr5.address, addr6.address, addr7.address, addr8.address],
          [toWei(20), toWei(20), toWei(20), toWei(20), toWei(20)],
          quantityToMint,
          bytesMemoir
        );
      // Artist approve gdMarketPlace marketplace to exchange its NFT
      await mintGoldDustERC1155
        .connect(addr1)
        .setApprovalForAll(mintGoldDustMarketplaceAuction.address, true);

      await mintGoldDustMarketplaceAuction
        .connect(addr1)
        .list(
          1,
          quantityToList,
          mintGoldDustERC1155.address,
          toWei(price)
        );

      fee = (priceToPurchase * primary_sale_fee_percent) / 100;
      collFee = (priceToPurchase * collector_fee) / 100;
      primarySaleFee = fee + collFee;
      balance = priceToPurchase - primarySaleFee;
    });

    it("Should:\n \t - Simulate a primary sale that transfer a mintGoldDustERC721 to the buyer;\n \t - Verify if the item changed status for sale; \n \t - Verify if the hasCollaborator flag is true; \n \t - Check if the isERC721 attribute is false;\n \t -  And also the isAuction attribute must be true;\n \t - Verify if the seller balance increases;\n \t - Verify if the marketplace's owner receives the fee;\n \t - Verify if the isSecondarySale attribute was set to true;\n \t - Verify if the buyer balance was deacresed exactly the gas fee + the token price;", async function () {
      // get the balances for the seller and the owner of the marketplace.
      const sellerInitalEthBal = await addr1.getBalance();
      const colaborator1InitialBalance = await addr5.getBalance();
      const colaborator2InitialBalance = await addr6.getBalance();
      const colaborator3InitialBalance = await addr7.getBalance();
      const colaborator4InitialBalance = await addr8.getBalance();

      const feeAccountInitialEthBal = await deployer.getBalance();
      const feeAccountAfterEthBalShouldBe = ethers.BigNumber.from(
        feeAccountInitialEthBal
      ).add(toWei(primarySaleFee));

      let addr2BalanceBefore = await addr2.getBalance();

      let gasPricePlaceBid =
        await mintGoldDustMarketplaceAuction.signer.getGasPrice();
      let gasLimitPlaceBid =
        await mintGoldDustMarketplaceAuction.estimateGas.placeBid(
          {
            tokenId: 1,
            contractAddress: mintGoldDustERC1155.address,
            seller: addr1.address,
          },
          {
            value: toWei(priceToPurchase),
          }
        );

      console.log(
        "\t\t TOTAL GAS ESTIMATION TO PLACE A BID (USD): ",
        +ethers.BigNumber.from(gasPricePlaceBid).mul(gasLimitPlaceBid)
      );

      await mintGoldDustMarketplaceAuction.connect(addr2).placeBid(
        {
          tokenId: 1,
          contractAddress: mintGoldDustERC1155.address,
          seller: addr1.address,
        },
        {
          value: toWei(priceToPurchase),
        }
      );

      // verify if the flag for secondary is false
      expect(
        (
          await mintGoldDustMarketplaceAuction
            .connect(addr1)
            .idMarketItemsByContractByOwner(
              mintGoldDustERC1155.address,
              1,
              addr1.address
            )
        ).isSecondarySale
      ).to.be.equal(false);

      await new Promise((resolve) => setTimeout(resolve, _timeout));

      let gasPrice = await mintGoldDustMarketplaceAuction.signer.getGasPrice();
      let gasLimit =
        await mintGoldDustMarketplaceAuction.estimateGas.endAuction({
          tokenId: 1,
          contractAddress: mintGoldDustERC1155.address,
          seller: addr1.address,
        });

      console.log("\t GAS PRICE END AUCTION: ", gasPrice);
      console.log("\t GAS LIMIT END AUCTION: ", gasLimit);

      console.log(
        "\t\t TOTAL GAS ESTIMATION END AUCTION (USD): ",
        (+ethers.BigNumber.from(gasPrice).mul(gasLimit) / (100 * 10 ** 18)) *
          2500
      );

      console.log("\n\t\t AUCTION HIGHEST BID: ", priceToPurchase);
      console.log("\t\t Primary Market fee: ", fee);
      console.log("\t\t Collector fee: ", collFee);
      console.log("\t\t Marketplace owner fee: ", primarySaleFee);
      console.log("\n\t\t Total Balance to seller + collaborators: ", balance);

      console.log("\n\t\t Balance to seller: ", balance / 5);
      console.log("\t\t Balance to collaborator 1: ", balance / 5);
      console.log("\t\t Balance to collaborator 2: ", balance / 5);
      console.log("\t\t Balance to collaborator 3: ", balance / 5);
      console.log("\t\t Balance to collaborator 4: ", balance / 5);

      // execute the endAuction function
      await expect(
        mintGoldDustMarketplaceAuction.endAuction({
          tokenId: 1,
          contractAddress: mintGoldDustERC1155.address,
          seller: addr1.address,
        })
      )
        .to.emit(
          mintGoldDustMarketplaceAuction,
          "MintGoldDustNftPurchasedPrimaryMarket"
        )
        .withArgs(
          1,
          1,
          addr1.address,
          addr2.address,
          toWei(priceToPurchase),
          toWei(balance),
          toWei(fee),
          toWei(collFee),
          quantityToList,
          true,
          true,
          false
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
        .sub(toWei(priceToPurchase))
        .sub(ethers.BigNumber.from(gasPricePlaceBid).mul(gasLimitPlaceBid));

      expect(
        parseFloat(
          (parseFloat(fromWei(await addr2.getBalance())) * 2500).toFixed(2)
        )
      ).to.be.closeTo(
        parseFloat((parseFloat(fromWei(addr2ShouldBeAfter)) * 2500).toFixed(2)),
        1
      );

      // verify if the owner of the NFT changed for the buyer
      expect(await mintGoldDustERC1155.balanceOf(addr2.address, 1)).to.equal(
        quantityToList
      );

      // verify if the flag for secondary market changed for true
      expect(
        (
          await mintGoldDustMarketplaceAuction
            .connect(addr1)
            .idMarketItemsByContractByOwner(
              mintGoldDustERC1155.address,
              1,
              addr2.address
            )
        ).isSecondarySale
      ).to.be.equal(true);

      // verify if the marketplace owner's balance increased the fee
      expect(
        Math.round(
          parseFloat(
            (parseFloat(fromWei(await deployer.getBalance())) * 2500).toFixed(1)
          )
        )
      ).to.be.closeTo(
        Math.round(
          parseFloat(
            (parseFloat(fromWei(feeAccountAfterEthBalShouldBe)) * 2500).toFixed(
              1
            )
          )
        ),
        1
      );

      // verify if the seller received the balance
      expect(await addr1.getBalance()).to.be.equal(
        ethers.BigNumber.from(sellerInitalEthBal)
          .mul(5)
          .add(toWei(balance))
          .div(5)
      );

      expect(await addr5.getBalance()).to.be.equal(
        ethers.BigNumber.from(colaborator1InitialBalance)
          .mul(5)
          .add(toWei(balance))
          .div(5)
      );

      expect(await addr6.getBalance()).to.be.equal(
        ethers.BigNumber.from(colaborator2InitialBalance)
          .mul(5)
          .add(toWei(balance))
          .div(5)
      );

      expect(await addr7.getBalance()).to.be.equal(
        ethers.BigNumber.from(colaborator3InitialBalance)
          .mul(5)
          .add(toWei(balance))
          .div(5)
      );

      expect(await addr8.getBalance()).to.be.equal(
        ethers.BigNumber.from(colaborator4InitialBalance)
          .mul(5)
          .add(toWei(balance))
          .div(5)
      );

      // expect item sold to be true
      expect(
        (
          await mintGoldDustMarketplaceAuction.idMarketItemsByContractByOwner(
            mintGoldDustERC1155.address,
            1,
            addr2.address
          )
        ).sold
      ).to.be.equal(true);

      // expect item sold to be true
      expect(await mintGoldDustMarketplaceAuction.itemsSold()).to.be.equal(1);

      console.log(
        "\t\t SELLER BALANCE BEFORE SALE: ",
        parseFloat(fromWei(sellerInitalEthBal))
      );

      console.log(
        "\t\t SELLER BALANCE AFTER SALE: ",
        parseFloat(fromWei(await addr1.getBalance()))
      );

      console.log(
        "\t\t COLLABORATOR 1 BEFORE SALE: ",
        parseFloat(fromWei(colaborator1InitialBalance))
      );

      console.log(
        "\t\t COLLABORATOR 1 AFTER SALE: ",
        parseFloat(fromWei(await addr5.getBalance()))
      );

      console.log(
        "\t\t COLLABORATOR 2 BEFORE SALE: ",
        parseFloat(fromWei(colaborator2InitialBalance))
      );

      console.log(
        "\t\t COLLABORATOR 2 AFTER SALE: ",
        parseFloat(fromWei(await addr6.getBalance()))
      );

      console.log(
        "\t\t COLLABORATOR 3 BEFORE SALE: ",
        parseFloat(fromWei(colaborator3InitialBalance))
      );

      console.log(
        "\t\t COLLABORATOR 3 AFTER SALE: ",
        parseFloat(fromWei(await addr7.getBalance()))
      );

      console.log(
        "\t\t COLLABORATOR 4 BEFORE SALE: ",
        parseFloat(fromWei(colaborator4InitialBalance))
      );

      console.log(
        "\t\t COLLABORATOR 4 AFTER SALE: ",
        parseFloat(fromWei(await addr8.getBalance()))
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

    const quantityToList = 4;
    const quantityToMint = 4;

    let price = 20;
    let royaltyFee: number;
    let balance: number;
    let secondarySaleFee: number;
    let priceToPurchase = price * quantityToList;

    beforeEach(async () => {
      await mintGoldDustCompany
        .connect(deployer)
        .updateAuctionTimeDuration(_duration);
      await mintGoldDustCompany
        .connect(deployer)
        .updateAuctionFinalMinutes(_finalTime);
      // MGD owner whitelist the artist
      await mintGoldDustCompany
        .connect(deployer)
        .whitelist(addr1.address, true);

      const encode = new TextEncoder();
      const bytesMemoir = encode.encode(MEMOIR);

      // addr1 mints a nft
      await mintGoldDustERC1155
        .connect(addr1)
        .splitMint(
          URI,
          toWei(5),
          [addr5.address, addr6.address, addr7.address, addr8.address],
          [toWei(20), toWei(20), toWei(20), toWei(20), toWei(20)],
          quantityToMint,
          bytesMemoir
        );
      // Artist approve gdMarketPlace marketplace to exchange its NFT
      await mintGoldDustERC1155
        .connect(addr1)
        .setApprovalForAll(mintGoldDustMarketplaceAuction.address, true);

      await mintGoldDustMarketplaceAuction
        .connect(addr1)
        .list(1, quantityToList, mintGoldDustERC1155.address, toWei(0));

      await mintGoldDustMarketplaceAuction.connect(addr2).placeBid(
        {
          tokenId: 1,
          contractAddress: mintGoldDustERC1155.address,
          seller: addr1.address,
        },
        { value: toWei(priceToPurchase - 1) }
      );

      secondarySaleFee = (priceToPurchase * secondary_sale_fee_percent) / 100;
      royaltyFee = (priceToPurchase * royalty) / 100;
      balance = priceToPurchase - (secondarySaleFee + royaltyFee);
    });

    it("Should simulate a secondary sale that transfer a mintGoldDustERC721 to the buyer, verify if the item changed status for sale, verify if the seller balance increases and also if the marketplace's owner receives the fee and verify if the artist creator have received the royalty. Verify if the hasCollaborator flag is true, the isERC721 attribute is false and if the isAuction attribute is true.", async function () {
      await new Promise((resolve) => setTimeout(resolve, _timeout));

      await mintGoldDustMarketplaceAuction.endAuction({
        tokenId: 1,
        contractAddress: mintGoldDustERC1155.address,
        seller: addr1.address,
      });

      await mintGoldDustERC1155
        .connect(addr2)
        .setApprovalForAll(mintGoldDustMarketplaceAuction.address, true);

      await mintGoldDustMarketplaceAuction
        .connect(addr2)
        .list(
          1,
          quantityToList,
          mintGoldDustERC1155.address,
          toWei(price)
        );
      // verify if the isSecondarySale sale attribute is true
      expect(
        (
          await mintGoldDustMarketplaceAuction.idMarketItemsByContractByOwner(
            mintGoldDustERC1155.address,
            1,
            addr2.address
          )
        ).isSecondarySale
      ).to.equal(true);

      // get the balances for the seller and the owner of the marketplace.
      const feeAccountInitialEthBal = await deployer.getBalance();

      let addr3BalanceBefore = await addr3.getBalance();

      await mintGoldDustMarketplaceAuction.connect(addr3).placeBid(
        {
          tokenId: 1,
          contractAddress: mintGoldDustERC1155.address,
          seller: addr2.address,
        },
        { value: toWei(priceToPurchase) }
      );

      // get the NFT's artist creator balance
      const provider = ethers.provider;
      const artistCreatorAddress = await mintGoldDustERC1155.tokenIdArtist(1);
      const artistCreatorInitialBal = await provider.getBalance(
        artistCreatorAddress
      );

      // get the addr2 buyer initial balance
      const artistSellerInitialBal = await addr2.getBalance();

      await new Promise((resolve) => setTimeout(resolve, _timeout));

      let gasPrice = await mintGoldDustMarketplaceAuction.signer.getGasPrice();
      let gasLimit =
        await mintGoldDustMarketplaceAuction.estimateGas.endAuction({
          tokenId: 1,
          contractAddress: mintGoldDustERC1155.address,
          seller: addr2.address,
        });

      console.log("\t GAS PRICE: ", gasPrice);
      console.log("\t GAS LIMIT: ", gasLimit);

      console.log(
        "\t\t TOTAL GAS ESTIMATION (USD): ",
        (+ethers.BigNumber.from(gasPrice).mul(gasLimit) / (100 * 10 ** 18)) *
          2500
      );

      // execute the buyNft function
      await expect(
        mintGoldDustMarketplaceAuction.endAuction({
          tokenId: 1,
          contractAddress: mintGoldDustERC1155.address,
          seller: addr2.address,
        })
      )
        .to.emit(
          mintGoldDustMarketplaceAuction,
          "MintGoldDustNftPurchasedSecondaryMarket"
        )
        .withArgs(
          2,
          1,
          addr2.address,
          addr3.address,
          toWei(priceToPurchase),
          toWei(balance),
          toWei(royalty),
          toWei(royaltyFee),
          addr1.address,
          toWei(secondarySaleFee),
          quantityToList,
          true,
          true,
          false
        );

      // prepare the future balance that the owner should have after the transaction
      const feeAccountAfterEthBalShouldBe = ethers.BigNumber.from(
        feeAccountInitialEthBal
      ).add(toWei(secondarySaleFee));

      // verify if the owner of the NFT changed for the buyer
      expect(await mintGoldDustERC1155.balanceOf(addr3.address, 1)).to.equal(
        quantityToList
      );

      console.log("\n\t\t ITEM PRICE: ", priceToPurchase);
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
        ethers.BigNumber.from(artistCreatorInitialBal).add(
          toWei(royaltyFee / 5)
        )
      );

      let addr3ShouldBeAfter = ethers.BigNumber.from(addr3BalanceBefore)
        .sub(toWei(priceToPurchase))
        .sub(ethers.BigNumber.from(gasPrice).mul(gasLimit));

      expect(
        parseFloat(parseFloat(fromWei(await addr3.getBalance())).toFixed(3))
      ).to.be.approximately(
        parseFloat(parseFloat(fromWei(addr3ShouldBeAfter)).toFixed(3)),
        1
      );

      // expect item sold to be true
      expect(
        (
          await mintGoldDustMarketplaceAuction.idMarketItemsByContractByOwner(
            mintGoldDustERC1155.address,
            1,
            addr3.address
          )
        ).sold
      ).to.be.equal(true);
    });
  });
});
