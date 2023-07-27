require("dotenv").config();
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";
import { Contract, ContractFactory } from "ethers";
import { ethers } from "hardhat";

const toWei = (num: any) => ethers.utils.parseEther(num.toString());
const fromWei = (num: any) => ethers.utils.formatEther(num);

describe("\nMintGoldDustMaretplaceAuction.sol + MintGoldDustERC721.sol Smart Contracts \n************___************\n \nHere we'll have the tests related of an auction refund last bidder and withdrawal flow. \n", function () {
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
  let addrs: SignerWithAddress[];

  let URI = "sample URI";
  let baseURI = "https://example.com/{id}.json";

  //const REAL_OWNER = "0x46ab5D1518688f66286aF7c6C9f5552edd050d15";
  const TEST_OWNER = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266";
  const primary_sale_fee_percent_initial = 15000000000000000000n;
  const secondary_sale_fee_percent_initial = 5000000000000000000n;
  const collector_fee_initial = 3000000000000000000n;
  const max_royalty_initial = 20000000000000000000n;

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

    [deployer, addr1, addr2, addr3, ...addrs] = await ethers.getSigners();

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

  describe("\n****************_**************** Tests related with withdrawal refunded funds in an auction after a highest bid for MintGoldDustERC721 ****************_****************\n", function () {
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

    it("Should simulate two subsequent bids so that the first bidder is refunded and then withdraws the funds.", async function () {
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

      // Place first bid
      const tx1 = await mintGoldDustMarketplaceAuction.connect(addr2).placeBid(
        {
          tokenId: 1,
          contractAddress: mintGoldDustERC721.address,
          seller: addr1.address,
        },
        {
          value: toWei(price),
        }
      );

      const receipt1 = await tx1.wait();

      // Check AuctionTimeStarted event
      expect(receipt1.events[0].event).to.be.equal("AuctionTimeStarted");
      expect(receipt1.events[0].eventSignature).to.be.equal(
        "AuctionTimeStarted(uint256,address,uint256,uint256,uint256)"
      );
      expect(receipt1.events[0].args.tokenId).to.be.equal(1);
      expect(receipt1.events[0].args.contractAddress).to.be.equal(
        mintGoldDustERC721.address
      );
      expect(receipt1.events[0].args.startTime).to.be.equal(
        (await receipt1.events[0].getBlock()).timestamp
      );

      // Assuming you have the timestamp from the event
      const timestamp = receipt1.events[0].args.startTime;

      // Convert the timestamp to a Date object
      const resultDate: Date = new Date(timestamp.toNumber() * 1000);

      // Add 24 hours to the date
      resultDate.setHours(resultDate.getHours() + 24);

      expect(
        new Date(receipt1.events[0].args.endTime.toNumber() * 1000).getTime()
      ).to.be.equal(resultDate.getTime());

      expect(receipt1.events[0].args.auctionId).to.be.equal(1);

      // Check AuctionNewBid event
      expect(receipt1.events[1].event).to.be.equal("AuctionNewBid");
      expect(receipt1.events[1].eventSignature).to.be.equal(
        "AuctionNewBid(uint256,address,address,address,uint256,uint256,uint256)"
      );
      expect(receipt1.events[1].args.tokenId).to.be.equal(1);
      expect(receipt1.events[1].args.contractAddress).to.be.equal(
        mintGoldDustERC721.address
      );
      expect(receipt1.events[1].args.previousBidder).to.be.equal(
        ethers.constants.AddressZero
      );
      expect(receipt1.events[1].args.currentBidder).to.be.equal(addr2.address);
      expect(receipt1.events[1].args.bid).to.be.equal(toWei(price));
      expect(receipt1.events[1].args.bidTime).to.be.equal(
        (await receipt1.events[0].getBlock()).timestamp
      );
      expect(receipt1.events[1].args.auctionId).to.be.equal(1);

      expect(receipt1.events[2]).to.be.undefined;

      // Check the recipientBalances mapping before the bidder be refunded
      const addr2RecipientBalancesBefore =
        await mintGoldDustMarketplaceAuction.recipientBalances(addr2.address);
      expect(addr2RecipientBalancesBefore).to.be.equal(0);

      // Place Second bid
      const tx2 = await mintGoldDustMarketplaceAuction.connect(addr3).placeBid(
        {
          tokenId: 1,
          contractAddress: mintGoldDustERC721.address,
          seller: addr1.address,
        },
        {
          value: toWei(price + 1),
        }
      );

      const receipt2 = await tx2.wait();

      // Check LastBidderRefunded event
      expect(receipt2.events[0].event).to.be.equal("LastBidderRefunded");
      expect(receipt2.events[0].eventSignature).to.be.equal(
        "LastBidderRefunded(address,uint256,uint256)"
      );
      expect(receipt2.events[0].args.recipient).to.be.equal(addr2.address);
      expect(receipt2.events[0].args.amount).to.be.equal(toWei(price));
      expect(receipt2.events[0].args.totalAmount).to.be.equal(toWei(price));

      // Check Auction New Bid event again but now for the second bid
      expect(receipt2.events[1].event).to.be.equal("AuctionNewBid");
      expect(receipt2.events[1].eventSignature).to.be.equal(
        "AuctionNewBid(uint256,address,address,address,uint256,uint256,uint256)"
      );
      expect(receipt2.events[1].args.tokenId).to.be.equal(1);
      expect(receipt2.events[1].args.contractAddress).to.be.equal(
        mintGoldDustERC721.address
      );
      expect(receipt2.events[1].args.previousBidder).to.be.equal(addr2.address);
      expect(receipt2.events[1].args.currentBidder).to.be.equal(addr3.address);
      expect(receipt2.events[1].args.bid).to.be.equal(toWei(price + 1));
      expect(receipt2.events[1].args.bidTime).to.be.equal(
        (await receipt2.events[0].getBlock()).timestamp
      );
      expect(receipt2.events[1].args.auctionId).to.be.equal(1);

      // Gas values
      console.log("Gas used to cancel auction: ", receipt2.gasUsed.toString());
      console.log("Gas price: ", (await tx2.gasPrice).toString());
      console.log("Total gas fee: ", receipt2.gasUsed.mul(await tx2.gasPrice));

      // Now I need to check the mapping(address => uint256) public recipientBalances to see if the add2 was refunded correctly
      const addr2RecipientBalancesAfter =
        await mintGoldDustMarketplaceAuction.recipientBalances(addr2.address);
      expect(addr2RecipientBalancesAfter).to.be.equal(toWei(price));

      /**
       * Now I need to call the:
       * function withdrawRefundedFunds(uint256 amount) external {
       *   require(amount <= recipientBalances[msg.sender], "Insufficient balance.");
       *   recipientBalances[msg.sender] -= amount;
       *   (bool success, ) = msg.sender.call{ value: amount }("");
       *   require(success, "Failed to transfer funds.");
       *   emit Withdrawal(msg.sender, amount);
       * }
       * And after I need to check if the balance of the addr2 was added by the amount less the gas used
       */
      const addr2BalanceBefore = await addr2.getBalance();
      const tx3 = await mintGoldDustMarketplaceAuction
        .connect(addr2)
        .withdrawRefundedFunds(toWei(price));
      const receipt3 = await tx3.wait();

      // Check Withdrawal event
      expect(receipt3.events[0].event).to.be.equal("Withdrawal");
      expect(receipt3.events[0].eventSignature).to.be.equal(
        "Withdrawal(address,uint256)"
      );

      const gasUsed = receipt3.gasUsed.mul(await tx3.gasPrice); // 1 ether

      expect(receipt3.events[0].args.recipient).to.be.equal(addr2.address);
      expect(receipt3.events[0].args.amount).to.be.equal(toWei(price));

      const priceInWei = toWei(price); // 1 ether
      const finalBalance = addr2BalanceBefore.add(priceInWei).sub(gasUsed);

      expect(await addr2.getBalance()).to.be.equal(finalBalance);
    });

    it("Should reverts if some address try to withdraw more than the balance.", async function () {
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

      await mintGoldDustMarketplaceAuction.connect(addr3).placeBid(
        {
          tokenId: 1,
          contractAddress: mintGoldDustERC721.address,
          seller: addr1.address,
        },
        {
          value: toWei(price + 1),
        }
      );

      await expect(
        mintGoldDustMarketplaceAuction
          .connect(addr2)
          .withdrawRefundedFunds(toWei(price + 1))
      ).to.be.revertedWith("Insufficient balance");
    });
  });
});
