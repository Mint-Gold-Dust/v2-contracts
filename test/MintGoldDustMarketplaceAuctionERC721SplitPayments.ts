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
  let addr5: SignerWithAddress;
  let addr6: SignerWithAddress;
  let addr7: SignerWithAddress;
  let addr8: SignerWithAddress;
  let addr9: SignerWithAddress;
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

  describe("\n****************_**************** Tests related with listing a MintGoldDustER721 for the Marketplace Auction ****************_****************\n", function () {
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
        .splitMint(
          URI,
          toWei(5),
          [addr5.address, addr6.address, addr7.address, addr8.address],
          [toWei(20), toWei(20), toWei(20), toWei(20), toWei(20)],
          quantityToMint,
          bytesMemoir
        );
      // Artist approve gdMarketPlace marketplace to exchange its MintGoldDustER721
      await mintGoldDustERC721
        .connect(addr1)
        .setApprovalForAll(mintGoldDustMarketplaceAuction.address, true);
    });

    it("Should track newly listed item, transfer the MintGoldDustER721 from seller to MintGoldDustMarketplaceAuction and emit the ItemListedToAuction event.", async function () {
      console.log(
        "\t ARTIST BALANCE BEFORE LIST: ",
        parseFloat(parseFloat(fromWei(await addr1.getBalance())).toFixed(5))
      );
      let artistBalanceBefore = await addr1.getBalance();

      const tx = await mintGoldDustMarketplaceAuction
        .connect(addr1)
        .list(1, quantityToList, mintGoldDustERC721.address, toWei(price));
      const receipt = await tx.wait();

      // Check that the transaction emitted an event
      expect(receipt.events?.length).to.equal(2);

      // Get the block timestamp
      const block = await ethers.provider.getBlock(receipt.blockNumber);
      const timestamp = block.timestamp;
      expect(timestamp).to.be.above(0);

      expect(receipt.events[1].event).to.equal("ItemListedToAuction");
      expect(receipt.events[1].args.length).to.equal(6);
      expect(receipt.events[1].args[0]).to.be.equal(1);
      expect(receipt.events[1].args[1]).to.be.equal(mintGoldDustERC721.address);
      expect(receipt.events[1].args[2]).to.be.equal(addr1.address);
      expect(receipt.events[1].args[3]).to.be.equal(toWei(price));
      expect(receipt.events[1].args[4]).to.be.equal(timestamp);
      expect(receipt.events[1].args[5]).to.be.equal(1);

      console.log("\n\t EVENT EMITED: ", receipt.events[1].event);
      console.log("\t WITH ARGS: ", receipt.events[1].args);

      console.log(
        "\n\t ARTIST BALANCE AFTER LIST: ",
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

      /**
       * @dev owner should be the mintGoldDustMarketplaceAuction
       * */
      expect(await mintGoldDustERC721.ownerOf(1)).to.equal(
        mintGoldDustMarketplaceAuction.address
      );
    });

    it("Should revert the transaction if an artist is not the owner of the token and try to list on the gold dust marketplace.", async function () {
      expect(
        mintGoldDustMarketplaceAuction
          .connect(addr2)
          .list(1, quantityToList, mintGoldDustERC721.address, toWei(price))
      )
        .to.revertedWithCustomError(
          mintGoldDustMarketplaceAuction,
          "AddressUnauthorized"
        )
        .withArgs("Not owner!");
    });

    it("Should revert if null address is passed as a collaborator", async function () {
      const encode = new TextEncoder();
      const bytesMemoir = encode.encode(MEMOIR);
      expect(
        mintGoldDustERC721.connect(addr1).splitMint(
          URI,
          toWei(5),
          [
            addr5.address,
            addr6.address,
            addr7.address,
            "0x0000000000000000000000000000000000000000",
          ], // A null address is included
          [toWei(20), toWei(20), toWei(20), toWei(20), toWei(20)],
          quantityToMint,
          bytesMemoir
        )
      ).to.be.revertedWith("Owner address cannot be null!"); // Checks the expected error message
    });

    it("Should revert if total percentage is not 100", async function () {
      const encode = new TextEncoder();
      const bytesMemoir = encode.encode(MEMOIR);
      expect(
        mintGoldDustERC721.connect(addr1).splitMint(
          URI,
          toWei(5),
          [addr5.address, addr6.address, addr7.address, addr8.address],
          [toWei(20), toWei(20), toWei(20), toWei(20), toWei(21)], // The total percentage is 101, not 100
          quantityToMint,
          bytesMemoir
        )
      ).to.be.revertedWithCustomError(
        mintGoldDustERC721,
        "TheTotalPercentageCantBeGreaterOrLessThan100"
      ); // Checks the expected error message
    });

    it("Should track a creation of an auction without a reserve price that expect the following conditions: \n \t - Expect emit the ItemListedToAuction event; \n \t - Expect auction structure attributes match with all passed to create auction function; \n \t - Auction end time should not be started yet to 24 hours and should be zero. \n \t - The auction price (initial price) should be zero. This way after any bid greater than zero the time of 24 hours should starts.", async () => {
      const tx = await mintGoldDustMarketplaceAuction
        .connect(addr1)
        .list(1, quantityToList, mintGoldDustERC721.address, toWei(0));
      const receipt = await tx.wait();

      /**
       * @dev Check that the transaction emitted an event
       * */
      expect(receipt.events?.length).to.equal(2);

      const block = await ethers.provider.getBlock(receipt.blockNumber);
      const timestamp = block.timestamp;
      expect(timestamp).to.be.above(0);

      console.log("EVENT 1: ", receipt.events[0]);

      expect(receipt.events[1].event).to.equal("ItemListedToAuction");
      expect(receipt.events[1].args.length).to.equal(6);
      expect(receipt.events[1].args[0]).to.be.equal(1);
      expect(receipt.events[1].args[1]).to.be.equal(mintGoldDustERC721.address);
      expect(receipt.events[1].args[2]).to.be.equal(addr1.address);
      expect(receipt.events[1].args[3]).to.be.equal(toWei(0));
      expect(receipt.events[1].args[4]).to.be.equal(timestamp);
      expect(receipt.events[1].args[5]).to.be.equal(1);

      let marketItem =
        await mintGoldDustMarketplaceAuction.idMarketItemsByContractByOwner(
          mintGoldDustERC721.address,
          1,
          addr1.address
        );

      expect(marketItem.tokenId).to.be.equal(1);
      expect(marketItem.seller).to.be.equal(addr1.address);
      expect(marketItem.price).to.be.equal(0);
      expect(marketItem.auctionProps.endTime).to.be.equal(0);
      expect(marketItem.auctionProps.highestBidder).to.be.equal(
        ethers.constants.AddressZero
      );
      expect(marketItem.auctionProps.highestBid).to.be.equal(0);
      expect(marketItem.auctionProps.ended).to.be.equal(false);
    });

    it("Should track a creation of an auction with a reserve price that expect the following conditions: \n \t - Expect emit the ItemListedToAuction event; \n \t - Expect auction structure attributes match with all passed to create auction function; \n \t - Auction end time should not be started yet to 24 hours and should be zero. \n \t - The auction price (initial price) should be zero. This way after any bid greater than zero the time of 24 hours should starts.", async () => {
      const tx = await mintGoldDustMarketplaceAuction
        .connect(addr1)
        .list(1, quantityToList, mintGoldDustERC721.address, toWei(price));
      const receipt = await tx.wait();

      // Check that the transaction emitted an event
      expect(receipt.events?.length).to.equal(2);

      // Get the block timestamp
      const block = await ethers.provider.getBlock(receipt.blockNumber);
      const timestamp = block.timestamp;
      expect(timestamp).to.be.above(0);

      expect(receipt.events[1].event).to.equal("ItemListedToAuction");
      expect(receipt.events[1].args.length).to.equal(6);
      expect(receipt.events[1].args[0]).to.be.equal(1);
      expect(receipt.events[1].args[1]).to.be.equal(mintGoldDustERC721.address);
      expect(receipt.events[1].args[2]).to.be.equal(addr1.address);
      expect(receipt.events[1].args[3]).to.be.equal(toWei(price));
      expect(receipt.events[1].args[4]).to.be.equal(timestamp);
      expect(receipt.events[1].args[5]).to.be.equal(1);

      let marketItem =
        await mintGoldDustMarketplaceAuction.idMarketItemsByContractByOwner(
          mintGoldDustERC721.address,
          1,
          addr1.address
        );

      expect(marketItem.tokenId).to.be.equal(1);
      expect(marketItem.seller).to.be.equal(addr1.address);
      expect(marketItem.price).to.be.equal(toWei(price));
      expect(marketItem.auctionProps.endTime).to.be.equal(0);
      expect(marketItem.auctionProps.highestBidder).to.be.equal(
        ethers.constants.AddressZero
      );
      expect(marketItem.auctionProps.highestBid).to.be.equal(toWei(0));
      expect(marketItem.auctionProps.ended).to.be.equal(false);
    });
  });

  describe("\n \n **************__************** PLACE A BID GENERAL UNHAPPY PATHS **************__**************", function () {
    let price = 4;
    const _duration = 3; // seconds
    const _finalTime = 1; // seconds
    const _timeout = 5 * 1000; // seconds
    let quantityToMint = 1;
    let quantityToList = 1;

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
        .splitMint(
          URI,
          toWei(5),
          [addr5.address, addr6.address, addr7.address, addr8.address],
          [toWei(20), toWei(20), toWei(20), toWei(20), toWei(20)],
          quantityToMint,
          bytesMemoir
        );
      // Artist approve gdMarketPlace marketplace to exchange its NFT
      await mintGoldDustERC721
        .connect(addr1)
        .setApprovalForAll(mintGoldDustMarketplaceAuction.address, true);
    });

    it("Should revert with an AuctionMustBeEnded() error when some user tries to bid in a timed auction that have ended already.", async function () {
      await mintGoldDustMarketplaceAuction
        .connect(addr1)
        .list(1, quantityToList, mintGoldDustERC721.address, toWei(price));

      // The first bid greater than zero, starts the time. In our test 3 seconds
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

      // Let's wait 4 seconds
      await new Promise((resolve) => setTimeout(resolve, _timeout));

      // addr3 tries to place a new bid after the time ends
      await expect(
        mintGoldDustMarketplaceAuction.connect(addr3).placeBid(
          {
            tokenId: 1,
            contractAddress: mintGoldDustERC721.address,
            seller: addr1.address,
          },
          {
            value: toWei(price + 1),
          }
        )
      )
        .to.be.revertedWithCustomError(
          MintGoldDustMarketplaceAuction,
          "AuctionMustBeEnded"
        )
        .withArgs(1, mintGoldDustERC721.address, 1);
    });

    it("Should revert with an AuctionCreatorCannotBid() error if the auction creator (mintGoldDustERC721 Owner) tries to place a bid.", async function () {
      await mintGoldDustMarketplaceAuction
        .connect(addr1)
        .list(1, quantityToList, mintGoldDustERC721.address, toWei(price));
      await expect(
        mintGoldDustMarketplaceAuction.connect(addr1).placeBid(
          {
            tokenId: 1,
            contractAddress: mintGoldDustERC721.address,
            seller: addr1.address,
          },
          {
            value: toWei(price),
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
        .list(1, quantityToList, mintGoldDustERC721.address, toWei(price));

      await expect(
        mintGoldDustMarketplaceAuction.connect(addr2).placeBid(
          {
            tokenId: 1,
            contractAddress: mintGoldDustERC721.address,
            seller: addr1.address,
          },
          {
            value: toWei(price),
          }
        )
      ).to.emit(mintGoldDustMarketplaceAuction, "AuctionNewBid");

      await expect(
        mintGoldDustMarketplaceAuction.connect(addr2).placeBid(
          {
            tokenId: 1,
            contractAddress: mintGoldDustERC721.address,
            seller: addr1.address,
          },
          {
            value: toWei(price + 1),
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
        .list(1, quantityToList, mintGoldDustERC721.address, toWei(price));
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
        mintGoldDustMarketplaceAuction.connect(addr3).placeBid(
          {
            tokenId: 1,
            contractAddress: mintGoldDustERC721.address,
            seller: addr1.address,
          },
          {
            value: toWei(price),
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
        .list(1, quantityToList, mintGoldDustERC721.address, toWei(price));

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
        mintGoldDustMarketplaceAuction.connect(addr3).placeBid(
          {
            tokenId: 1,
            contractAddress: mintGoldDustERC721.address,
            seller: addr1.address,
          },
          {
            value: toWei(price - 1),
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
        .list(1, quantityToList, mintGoldDustERC721.address, toWei(price));
      await expect(
        mintGoldDustMarketplaceAuction.connect(addr2).placeBid(
          {
            tokenId: 1,
            contractAddress: mintGoldDustERC721.address,
            seller: addr1.address,
          },
          {
            value: toWei(price - 1),
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
        .list(1, quantityToList, mintGoldDustERC721.address, toWei(0));
      await expect(
        mintGoldDustMarketplaceAuction.connect(addr2).placeBid(
          {
            tokenId: 1,
            contractAddress: mintGoldDustERC721.address,
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
    let quantityToMint = 1;
    let quantityToList = 1;

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
        .splitMint(
          URI,
          toWei(5),
          [addr5.address, addr6.address, addr7.address, addr8.address],
          [toWei(20), toWei(20), toWei(20), toWei(20), toWei(20)],
          quantityToMint,
          bytesMemoir
        );
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
        let gasPrice =
          await mintGoldDustMarketplaceAuction.signer.getGasPrice();
        let gasLimit =
          await mintGoldDustMarketplaceAuction.estimateGas.placeBid(
            {
              tokenId: 1,
              contractAddress: mintGoldDustERC721.address,
              seller: addr1.address,
            },
            {
              value: toWei(price),
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

        await expect(
          mintGoldDustMarketplaceAuction.connect(addr2).placeBid(
            {
              tokenId: 1,
              contractAddress: mintGoldDustERC721.address,
              seller: addr1.address,
            },
            {
              value: toWei(price),
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
                .add(toWei(price))
                .add(ethers.BigNumber.from(gasPrice).mul(gasLimit))
            )
          )
        );

        expect(parseFloat(fromWei(bidderBalanceBefore)).toFixed(2)).to.be.equal(
          parseFloat(
            fromWei(
              ethers.BigNumber.from(bidderBalanceAfter)
                .add(toWei(price))
                .add(ethers.BigNumber.from(gasPrice).mul(gasLimit))
            )
          ).toFixed(2)
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
        ).to.be.closeTo(expectedEndTime, 10000);

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

    describe("\n\t------------------ AUCTION WITHOUT A RESERVE PRICE ------------------\n", () => {
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
        let gasPrice =
          await mintGoldDustMarketplaceAuction.signer.getGasPrice();
        let gasLimit =
          await mintGoldDustMarketplaceAuction.estimateGas.placeBid(
            {
              tokenId: 1,
              contractAddress: mintGoldDustERC721.address,
              seller: addr1.address,
            },
            {
              value: toWei(price),
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

        await expect(
          mintGoldDustMarketplaceAuction.connect(addr2).placeBid(
            {
              tokenId: 1,
              contractAddress: mintGoldDustERC721.address,
              seller: addr1.address,
            },
            {
              value: toWei(price),
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
                .add(toWei(price))
                .add(ethers.BigNumber.from(gasPrice).mul(gasLimit))
            )
          )
        );

        expect(parseFloat(fromWei(bidderBalanceBefore)).toFixed(3)).to.be.equal(
          parseFloat(
            fromWei(
              ethers.BigNumber.from(bidderBalanceAfter)
                .add(toWei(price))
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
                mintGoldDustERC721.address,
                1,
                addr1.address
              )
          ).auctionProps.endTime
        ).to.be.closeTo(expectedEndTime, 10000);

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
        let gasPrice =
          await mintGoldDustMarketplaceAuction.signer.getGasPrice();
        let gasLimit =
          await mintGoldDustMarketplaceAuction.estimateGas.placeBid(
            {
              tokenId: 1,
              contractAddress: mintGoldDustERC721.address,
              seller: addr1.address,
            },
            {
              value: toWei(price),
            }
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
        await expect(
          mintGoldDustMarketplaceAuction.connect(addr2).placeBid(
            {
              tokenId: 1,
              contractAddress: mintGoldDustERC721.address,
              seller: addr1.address,
            },
            {
              value: toWei(price),
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
              contractAddress: mintGoldDustERC721.address,
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
        ).to.be.closeTo(expectedEndTime, 10000);

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
        await expect(
          mintGoldDustMarketplaceAuction.connect(addr3).placeBid(
            {
              tokenId: 1,
              contractAddress: mintGoldDustERC721.address,
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
        // expect(bidder1BalanceAfterSecondBid).to.be.equal(
        //   ethers.BigNumber.from(bidder1BalanceAfter).add(toWei(price))
        // );
        // IMPORTANT: This test is done in the CancelMarketPlaceAuctionWithERC*.ts files

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
                mintGoldDustERC721.address,
                1,
                addr1.address
              )
          ).auctionProps.endTime
        ).to.be.closeTo(expectedEndTime, 10000);

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
        await expect(
          mintGoldDustMarketplaceAuction.connect(addr2).placeBid(
            {
              tokenId: 1,
              contractAddress: mintGoldDustERC721.address,
              seller: addr1.address,
            },
            {
              value: toWei(price),
            }
          )
        ).to.emit(mintGoldDustMarketplaceAuction, "AuctionNewBid");

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
          (
            await mintGoldDustMarketplaceAuction
              .connect(addr1)
              .idMarketItemsByContractByOwner(
                mintGoldDustERC721.address,
                1,
                addr1.address
              )
          ).auctionProps.endTime
        ).to.be.closeTo(expectedEndTime, 10000);

        console.log(`\n\t\tWaiting until the last 5 minutes of the auction...`);
        await new Promise((resolve) => setTimeout(resolve, _timeout));

        // ******************** SECOND BID ***********************
        await expect(
          mintGoldDustMarketplaceAuction.connect(addr3).placeBid(
            {
              tokenId: 1,
              contractAddress: mintGoldDustERC721.address,
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
              mintGoldDustERC721.address,
              1,
              addr1.address
            )
        ).auctionProps.endTime.toString();

        // ***** EXPECT END TIME TO BE INCREASED MORE 5 MINUTES AFTER SECOND BID ******

        // expect(parseInt(endTimeAfterScondtBid)).to.be.equal(
        //   parseInt(endTimeAfterFirstBid) + _finalTime
        // );

        console.log(
          `\n\t\tAUCTION END TIME AFTER SECOND BID SHOULD BE INCREASED (In our test, we're using ${_finalTime} seconds for the last time like example, ${_duration} second for auction duration and ${_timeout} seconds of timeout between the two bids): `,
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
    });
  });

  describe("\n \n ****************_**************** END AUCTION UNHAPPY PATHS ****************_****************\n", function () {
    let price = 4;
    const _duration = 10; // seconds
    const _finalTime = 8; // seconds
    const _timeout = 3 * 1000; // seconds
    const quantityToList = 1;
    const quantityToMint = 1;

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
        .splitMint(
          URI,
          toWei(5),
          [addr5.address, addr6.address, addr7.address, addr8.address],
          [toWei(20), toWei(20), toWei(20), toWei(20), toWei(20)],
          quantityToMint,
          bytesMemoir
        );
      // Artist approve gdMarketPlace marketplace to exchange its NFT
      await mintGoldDustERC721
        .connect(addr1)
        .setApprovalForAll(mintGoldDustMarketplaceAuction.address, true);
    });

    it("Should revert with  error if the end auction function is called and the tokenId was not listed on MintGoldDustMarketplaceAuction.", async () => {
      // We list it to Set Price market place to confirm that it not cause problems here
      await mintGoldDustMarketplaceAuction
        .connect(addr1)
        .list(1, quantityToList, mintGoldDustERC721.address, toWei(price));
      await expect(
        mintGoldDustMarketplaceAuction.connect(addr3).endAuction({
          tokenId: 1,
          contractAddress: mintGoldDustERC721.address,
          seller: addr1.address,
        })
      ).to.be.revertedWith("Unauthorized");
    });

    it("Should revert with Unauthorized error if the end auction function is called and the auction have not received any bids yet.", async () => {
      await mintGoldDustMarketplaceAuction
        .connect(addr1)
        .list(1, quantityToList, mintGoldDustERC721.address, toWei(price));
      await expect(
        mintGoldDustMarketplaceAuction.endAuction({
          tokenId: 1,
          contractAddress: mintGoldDustERC721.address,
          seller: addr1.address,
        })
      ).to.be.revertedWith("Unauthorized");
    });

    it("Should revert with AuctionCannotBeEndedYet error if the end auction function is called before the time of duration of the auction be ended.", async () => {
      await mintGoldDustMarketplaceAuction
        .connect(addr1)
        .list(1, quantityToList, mintGoldDustERC721.address, toWei(price));
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
        mintGoldDustMarketplaceAuction.connect(addr2).endAuction({
          tokenId: 1,
          contractAddress: mintGoldDustERC721.address,
          seller: addr1.address,
        })
      ).to.be.revertedWithCustomError(
        mintGoldDustMarketplaceAuction,
        "AuctionCannotBeEndedYet"
      );
    });

    // it("Should revert with FunctionForSetPriceListedNFT error if the purchaseNFT function is called to buy an item that is listed to Auction. For that the purchaseAuctionNft function MUST be called and its function is internal and just can be called by the childrens smart contracts like the MintGoldDustMarketplaceAuction.", async () => {
    //   await mintGoldDustMarketplaceAuction
    //     .connect(addr1)
    //     .list(1, quantityToList, mintGoldDustERC721.address, toWei(price));
    //   await mintGoldDustMarketplaceAuction.connect(addr2).purchaseNft(
    //     {
    //       tokenId: 1,
    //       amount: quantityToList,
    //       contractAddress: mintGoldDustERC721.address,
    //       seller: addr1.address,
    //     },
    //     {
    //       value: toWei(price),
    //     }
    //   );
    // });
  });

  describe("\n \n ****************_**************** END AUCTION FOR PRIMARY SALE ****************_****************\n", function () {
    const _duration = 2; // seconds
    const _finalTime = 1; // seconds
    const _timeout = 5 * 1000; // seconds
    const quantityToList = 1;
    const quantityToMint = 1;

    let price = 20;
    // Calculate the fee and balance values based on the price
    let fee: number;
    let balance: number;
    let collFee: number;
    let primarySaleFee: number;

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
        .splitMint(
          URI,
          toWei(5),
          [addr5.address, addr6.address, addr7.address, addr8.address],
          [toWei(20), toWei(20), toWei(20), toWei(20), toWei(20)],
          quantityToMint,
          bytesMemoir
        );
      // Artist approve gdMarketPlace marketplace to exchange its NFT
      await mintGoldDustERC721
        .connect(addr1)
        .setApprovalForAll(mintGoldDustMarketplaceAuction.address, true);

      await mintGoldDustMarketplaceAuction
        .connect(addr1)
        .list(1, quantityToList, mintGoldDustERC721.address, toWei(price));

      fee = (price * primary_sale_fee_percent) / 100;
      collFee = (price * collector_fee) / 100;
      primarySaleFee = fee + collFee;
      balance = price - primarySaleFee;
    });

    it("Should:\n \t - Simulate a primary sale that transfer a mintGoldDustERC721 to the buyer;\n \t - Verify if the item changed status for sale; \n \t - Verify if the hasCollaborator flag is false; \n \t - Check if the isERC721 attribute is true;\n \t -  And also the isAuction attribute must be true;\n \t - Verify if the seller balance increases;\n \t - Verify if the marketplace's owner receives the fee;\n \t - Verify if the isSecondarySale attribute was set to true;\n \t - Verify if the buyer balance was deacresed exactly the gas fee + the token price;", async function () {
      // get the balances for the seller and the owner of the marketplace.
      const sellerInitalEthBal = await addr1.getBalance();
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
            contractAddress: mintGoldDustERC721.address,
            seller: addr1.address,
          },
          {
            value: toWei(price),
          }
        );

      console.log(
        "\t\t TOTAL GAS ESTIMATION TO PLACE A BID (USD): ",
        +ethers.BigNumber.from(gasPricePlaceBid).mul(gasLimitPlaceBid)
      );

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

      await new Promise((resolve) => setTimeout(resolve, _timeout));

      console.log("\n\t\t AUCTION HIGHEST BID: ", price);
      console.log("\t\t Primary Market fee: ", fee);
      console.log("\t\t Collector fee: ", collFee);
      console.log("\t\t Marketplace owner fee: ", primarySaleFee);
      console.log("\t\t Balance to seller: ", balance);

      /**
       * @dev at the final of the endAuction flow the purchaseAuctionNft is called and
       * goes throuhg the purchase flow. At the end of this flow the MintGoldDustNftPurchasedPrimaryMarket
       * must be emmited.
       */
      const tx = await mintGoldDustMarketplaceAuction
        .connect(addr2)
        .endAuction({
          tokenId: 1,
          contractAddress: mintGoldDustERC721.address,
          seller: addr1.address,
        });

      const receipt = await tx.wait();

      console.log("RECEITPPPPPPPPP: ", receipt.events);

      expect(receipt.events[1].event).to.be.equal(
        "NftPurchasedCollaboratorAmount"
      );
      expect(receipt.events[1].eventSignature).to.be.equal(
        "NftPurchasedCollaboratorAmount(uint256,address,uint256)"
      );
      expect(receipt.events[1].args.saleId).to.be.equal(1);
      expect(receipt.events[1].args.amount).to.be.equal(
        toWei((price - primarySaleFee) / 5)
      );
      expect(receipt.events[1].args.collaborator).to.be.equal(addr1.address);

      expect(receipt.events[2].event).to.be.equal(
        "NftPurchasedCollaboratorAmount"
      );
      expect(receipt.events[2].eventSignature).to.be.equal(
        "NftPurchasedCollaboratorAmount(uint256,address,uint256)"
      );
      expect(receipt.events[2].args.saleId).to.be.equal(1);
      expect(receipt.events[2].args.amount).to.be.equal(
        toWei((price - primarySaleFee) / 5)
      );
      expect(receipt.events[2].args.collaborator).to.be.equal(addr5.address);

      expect(receipt.events[3].event).to.be.equal(
        "NftPurchasedCollaboratorAmount"
      );
      expect(receipt.events[3].eventSignature).to.be.equal(
        "NftPurchasedCollaboratorAmount(uint256,address,uint256)"
      );
      expect(receipt.events[3].args.saleId).to.be.equal(1);
      expect(receipt.events[3].args.amount).to.be.equal(
        toWei((price - primarySaleFee) / 5)
      );
      expect(receipt.events[3].args.collaborator).to.be.equal(addr6.address);

      expect(receipt.events[4].event).to.be.equal(
        "NftPurchasedCollaboratorAmount"
      );
      expect(receipt.events[4].eventSignature).to.be.equal(
        "NftPurchasedCollaboratorAmount(uint256,address,uint256)"
      );
      expect(receipt.events[4].args.saleId).to.be.equal(1);
      expect(receipt.events[4].args.amount).to.be.equal(
        toWei((price - primarySaleFee) / 5)
      );
      expect(receipt.events[4].args.collaborator).to.be.equal(addr7.address);

      expect(receipt.events[5].event).to.be.equal(
        "NftPurchasedCollaboratorAmount"
      );
      expect(receipt.events[5].eventSignature).to.be.equal(
        "NftPurchasedCollaboratorAmount(uint256,address,uint256)"
      );
      expect(receipt.events[5].args.saleId).to.be.equal(1);
      expect(receipt.events[5].args.amount).to.be.equal(
        toWei((price - primarySaleFee) / 5)
      );
      expect(receipt.events[5].args.collaborator).to.be.equal(addr8.address);

      expect(receipt.events[6].event).to.be.equal(
        "MintGoldDustNftPurchasedPrimaryMarket"
      );
      expect(receipt.events[6].eventSignature).to.be.equal(
        "MintGoldDustNftPurchasedPrimaryMarket(uint256,uint256,address,address,uint256,uint256,uint256,uint256,uint256,bool,bool)"
      );
      expect(receipt.events[6].args.saleId).to.be.equal(1);
      expect(receipt.events[6].args.tokenId).to.be.equal(1);
      expect(receipt.events[6].args.seller).to.be.equal(addr1.address);
      expect(receipt.events[6].args.newOwner).to.be.equal(addr2.address);
      expect(receipt.events[6].args.buyPrice).to.be.equal(toWei(price));
      expect(receipt.events[6].args.sellerAmount).to.be.equal(toWei(balance));
      expect(receipt.events[6].args.feeAmount).to.be.equal(toWei(fee));
      expect(receipt.events[6].args.collectorFeeAmount).to.be.equal(
        toWei(collFee)
      );
      expect(receipt.events[6].args.tokenAmountSold).to.be.equal(1);
      expect(receipt.events[6].args.hasCollaborators).to.be.equal(true);
      expect(receipt.events[6].args.isERC721).to.be.equal(true);

      expect(receipt.events[7].event).to.be.equal("AuctionWinnerCall");
      expect(receipt.events[7].eventSignature).to.be.equal(
        "AuctionWinnerCall(uint256,address,address,uint256,uint256)"
      );
      expect(receipt.events[7].args.tokenId).to.be.equal(1);
      expect(receipt.events[7].args.contractAddress).to.be.equal(
        mintGoldDustERC721.address
      );
      expect(receipt.events[7].args.seller).to.be.equal(addr1.address);
      expect(receipt.events[7].args.endTime).to.be.equal(
        (await receipt.events[7].getBlock()).timestamp
      );
      expect(receipt.events[7].args.auctionId).to.be.equal(1);

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
      expect(await mintGoldDustERC721.ownerOf(1)).to.equal(addr2.address);

      //verify if the marketplace owner's balance increased the fee
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
        ethers.BigNumber.from(sellerInitalEthBal).add(toWei(balance / 5))
      );

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
    const _timeout = 5 * 1000; // seconds

    const quantityToList = 1;
    const quantityToMint = 1;

    let price = 20;
    let royaltyFee: number;
    let balance: number;
    let secondarySaleFee: number;

    beforeEach(async () => {
      // Mint Gold Dust owner whitelist the artist
      await mintGoldDustCompany
        .connect(deployer)
        .whitelist(addr1.address, true);

      const encoder = new TextEncoder();
      const bytesMemoir = encoder.encode(MEMOIR);

      // addr1 mints a nft
      await mintGoldDustERC721
        .connect(addr1)
        .splitMint(
          URI,
          toWei(5),
          [addr5.address, addr6.address, addr7.address, addr8.address],
          [toWei(20), toWei(20), toWei(20), toWei(20), toWei(20)],
          quantityToMint,
          bytesMemoir
        );

      // Artist approve gdMarketPlace marketplace to exchange its mintGoldDustERC721
      await mintGoldDustERC721
        .connect(addr1)
        .setApprovalForAll(mintGoldDustMarketplaceAuction.address, true);

      await mintGoldDustMarketplaceAuction
        .connect(addr1)
        .list(1, quantityToList, mintGoldDustERC721.address, toWei(0));

      await mintGoldDustMarketplaceAuction.connect(addr2).placeBid(
        {
          tokenId: 1,
          contractAddress: mintGoldDustERC721.address,
          seller: addr1.address,
        },
        { value: toWei(price - 1) }
      );

      secondarySaleFee = (price * secondary_sale_fee_percent) / 100;
      royaltyFee = (price * royalty) / 100;
      balance = price - (secondarySaleFee + royaltyFee);
    });

    it("Should simulate a secondary sale that transfer a mintGoldDustERC721 to the buyer, verify if the item changed status for sale, verify if the seller balance increases and also if the marketplace's owner receives the fee and verify if the artist creator have received the royalty. Verify if the hasCollaborator flag is false, the isERC721 attribute is true and if the isAuction attribute is true.", async function () {
      await new Promise((resolve) => setTimeout(resolve, _timeout));

      await mintGoldDustMarketplaceAuction.connect(addr2).endAuction({
        tokenId: 1,
        contractAddress: mintGoldDustERC721.address,
        seller: addr1.address,
      });

      await mintGoldDustERC721
        .connect(addr2)
        .setApprovalForAll(mintGoldDustMarketplaceAuction.address, true);

      await mintGoldDustMarketplaceAuction
        .connect(addr2)
        .list(1, quantityToList, mintGoldDustERC721.address, toWei(price));

      // get the balances for the seller and the owner of the marketplace.
      const feeAccountInitialEthBal = await deployer.getBalance();

      let addr3BalanceBefore = await addr3.getBalance();

      await mintGoldDustMarketplaceAuction.connect(addr3).placeBid(
        {
          tokenId: 1,
          contractAddress: mintGoldDustERC721.address,
          seller: addr2.address,
        },
        { value: toWei(price) }
      );

      // get the mintGoldDustERC721's artist creator balance
      const provider = ethers.provider;
      const artistCreatorAddress = await mintGoldDustERC721.tokenIdArtist(1);
      const artistCreatorInitialBal = await provider.getBalance(
        artistCreatorAddress
      );

      // get the addr2 buyer initial balance
      const artistSellerInitialBal = await addr2.getBalance();

      await new Promise((resolve) => setTimeout(resolve, _timeout));

      /**
       * @dev at the final of the endAuction flow the purchaseAuctionNft is called and
       * goes throuhg the purchase flow.
       */
      const tx = await mintGoldDustMarketplaceAuction
        .connect(addr3)
        .endAuction({
          tokenId: 1,
          contractAddress: mintGoldDustERC721.address,
          seller: addr2.address,
        });

      const receipt = await tx.wait();

      expect(receipt.events[1].event).to.be.equal(
        "NftPurchasedCollaboratorAmount"
      );
      expect(receipt.events[1].eventSignature).to.be.equal(
        "NftPurchasedCollaboratorAmount(uint256,address,uint256)"
      );
      expect(receipt.events[1].args.saleId).to.be.equal(2);
      expect(receipt.events[1].args.collaborator).to.be.equal(addr1.address);
      expect(receipt.events[1].args.amount).to.be.equal(toWei(royaltyFee / 5));

      expect(receipt.events[6].event).to.be.equal(
        "MintGoldDustNftPurchasedSecondaryMarket"
      );
      expect(receipt.events[6].eventSignature).to.be.equal(
        "MintGoldDustNftPurchasedSecondaryMarket(uint256,uint256,address,address,uint256,uint256,uint256,uint256,address,uint256,uint256,bool,bool)"
      );
      expect(receipt.events[6].args.saleId).to.be.equal(2);
      expect(receipt.events[6].args.tokenId).to.be.equal(1);
      expect(receipt.events[6].args.seller).to.be.equal(addr2.address);
      expect(receipt.events[6].args.newOwner).to.be.equal(addr3.address);
      expect(receipt.events[6].args.buyPrice).to.be.equal(toWei(price));
      expect(receipt.events[6].args.sellerAmount).to.be.equal(toWei(balance));
      expect(receipt.events[6].args.tokenAmountSold).to.be.equal(1);
      expect(receipt.events[6].args.hasCollaborators).to.be.equal(true);
      expect(receipt.events[6].args.isERC721).to.be.equal(true);

      expect(receipt.events[7].event).to.be.equal("AuctionWinnerCall");
      expect(receipt.events[7].eventSignature).to.be.equal(
        "AuctionWinnerCall(uint256,address,address,uint256,uint256)"
      );
      expect(receipt.events[7].args.tokenId).to.be.equal(1);
      expect(receipt.events[7].args.contractAddress).to.be.equal(
        mintGoldDustERC721.address
      );
      expect(receipt.events[7].args.seller).to.be.equal(addr2.address);
      expect(receipt.events[7].args.endTime).to.be.equal(
        (await receipt.events[7].getBlock()).timestamp
      );
      expect(receipt.events[7].args.auctionId).to.be.equal(2);

      // Gas values
      console.log("Gas used to cancel auction: ", receipt.gasUsed.toString());
      console.log("Gas price: ", (await tx.gasPrice).toString());
      console.log("Total gas fee: ", receipt.gasUsed.mul(await tx.gasPrice));
      let gasPrice = receipt.gasUsed.mul(await tx.gasPrice);

      // prepare the future balance that the owner should have after the transaction
      const feeAccountAfterEthBalShouldBe = ethers.BigNumber.from(
        feeAccountInitialEthBal
      ).add(toWei(secondarySaleFee));

      // verify if the owner of the mintGoldDustERC721 changed for the buyer
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
        ethers.BigNumber.from(artistCreatorInitialBal).add(
          toWei(royaltyFee / 5)
        )
      );

      let addr3ShouldBeAfter = ethers.BigNumber.from(addr3BalanceBefore)
        .sub(toWei(price))
        .sub(ethers.BigNumber.from(gasPrice));

      expect(
        parseFloat(parseFloat(fromWei(await addr3.getBalance())).toFixed(4))
      ).to.be.approximately(
        parseFloat(parseFloat(fromWei(addr3ShouldBeAfter)).toFixed(4)),
        1
      );
    });
  });
});
