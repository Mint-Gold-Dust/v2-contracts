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
  });

  describe("\n\t------------------ WAIT UNTIL THE END OF TIME AND WINNER CALL END AUCTION TO GET THE TOKEN ------------------\n", () => {
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
      await mintGoldDustERC721
        .connect(addr1)
        .mintNft(URI, toWei(5), quantityToMint, bytesMemoir);
      // Artist approve gdMarketPlace marketplace to exchange its NFT
      await mintGoldDustERC721
        .connect(addr1)
        .setApprovalForAll(mintGoldDustMarketplaceAuction.address, true);
    });

    it("Should simulate a completed auction flow", async function () {
      const sellerBalanceBefore = await addr1.getBalance();

      const ownerBalanceBefore = await deployer.getBalance();

      const txList = await mintGoldDustMarketplaceAuction
        .connect(addr1)
        .list(1, quantityToList, mintGoldDustERC721.address, toWei(price));

      const receiptList = await txList.wait();

      const totalGasList = receiptList.gasUsed.mul(await txList.gasPrice);

      // *********************** FIRST BID ****************************
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

      console.log(`\n\t\tWaiting until the last 5 minutes of the auction...`);
      await new Promise((resolve) => setTimeout(resolve, _timeout));

      // ******************** SECOND BID ***********************
      const winnerBalanceBeforeBid = await addr3.getBalance();
      const txBid = await mintGoldDustMarketplaceAuction
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
      const winnerBalanceAfterBid = await addr3.getBalance();
      const receiptBid = await txBid.wait();

      const totalGasBid = receiptBid.gasUsed.mul(await txBid.gasPrice);

      console.log(`\n\t\tWaiting until the final of the auction...`);
      await new Promise((resolve) => setTimeout(resolve, _timeout * 2));

      const tx = await mintGoldDustMarketplaceAuction
        .connect(addr3)
        .endAuction({
          tokenId: 1,
          contractAddress: mintGoldDustERC721.address,
          seller: addr1.address,
        });

      const winnerAfterEndAuction = await addr3.getBalance();

      const receipt = await tx.wait();

      const totalGas = receipt.gasUsed.mul(await tx.gasPrice);

      const etherValue = ethers.utils.formatEther(totalGas);

      console.log(`GAS USED: ${etherValue} ETH`);

      const primarySaleFee = (secondBidValue * 100 * 0.15) / 100;
      const collectorFee = secondBidValue * 0.03;
      const sellerAmount = secondBidValue - primarySaleFee - collectorFee;

      console.log("primarySaleFee: ", primarySaleFee);
      console.log("collectorFee: ", collectorFee);
      console.log("sellerAmount: ", sellerAmount);

      expect(receipt.events[1].event).to.be.equal(
        "MintGoldDustNftPurchasedPrimaryMarket"
      );
      expect(receipt.events[1].eventSignature).to.be.equal(
        "MintGoldDustNftPurchasedPrimaryMarket(uint256,uint256,address,address,uint256,uint256,uint256,uint256,uint256,bool,bool,bool)"
      );
      expect(receipt.events[1].args.saleId).to.be.equal(1);
      expect(receipt.events[1].args.tokenId).to.be.equal(1);
      expect(receipt.events[1].args.seller).to.be.equal(addr1.address);
      expect(receipt.events[1].args.newOwner).to.be.equal(addr3.address);
      expect(receipt.events[1].args.buyPrice).to.be.equal(
        toWei(secondBidValue)
      );
      // seller amount should be the second bid value minus the fee + collector fee
      expect(receipt.events[1].args.sellerAmount).to.be.equal(
        toWei(sellerAmount)
      );
      expect(receipt.events[1].args.feeAmount).to.be.equal(
        toWei(primarySaleFee)
      );
      expect(receipt.events[1].args.collectorFeeAmount).to.be.equal(
        toWei(collectorFee)
      );
      expect(receipt.events[1].args.tokenAmountSold).to.be.equal(1);
      expect(receipt.events[1].args.hasCollaborators).to.be.equal(false);
      expect(receipt.events[1].args.isAuction).to.be.equal(true);
      expect(receipt.events[1].args.isERC721).to.be.equal(true);

      const sellerBalanceAfter = await addr1.getBalance();

      const ownerBalanceAfter = await deployer.getBalance();

      expect(fromWei(winnerBalanceBeforeBid)).to.be.equal(
        fromWei(
          ethers.BigNumber.from(winnerAfterEndAuction)
            .add(toWei(secondBidValue))
            .add(ethers.BigNumber.from(totalGasBid))
            .add(ethers.BigNumber.from(totalGas))
        )
      );

      expect(fromWei(sellerBalanceAfter)).to.be.equal(
        fromWei(
          ethers.BigNumber.from(sellerBalanceBefore)
            .add(toWei(sellerAmount))
            .sub(ethers.BigNumber.from(totalGasList))
        )
      );

      expect(fromWei(ownerBalanceAfter)).to.be.equal(
        fromWei(
          ethers.BigNumber.from(ownerBalanceBefore)
            .add(toWei(primarySaleFee))
            .add(toWei(collectorFee))
        )
      );
    });
  });
});
