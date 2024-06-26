require("dotenv").config();
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect, use } from "chai";
import { Contract, ContractFactory } from "ethers";
import { ethers } from "hardhat";
import chai from "chai";
import chaiAsPromised from "chai-as-promised";

chai.use(chaiAsPromised);

const toWei = (num: any) => ethers.utils.parseEther(num.toString());
const fromWei = (num: any) => ethers.utils.formatEther(num);

describe("MintGoldDustSetPrice.sol Smart Contract \n___________________________________________________\n \nThis smart contract is responsible by all functionalities related with the fixed price market. \n Here goes the tests related with the MintGoldDustSetPrice market and the MintGoldDustERC1155 tokens. \n\n", function () {
  let MintGoldDustERC721: ContractFactory;
  let mintGoldDustERC721: Contract;

  let MintGoldDustERC1155: ContractFactory;
  let mintGoldDustERC1155: Contract;

  let MintGoldDustCompany: ContractFactory;
  let mgdCompany: Contract;

  let MintGoldDustSetPrice: ContractFactory;
  let mintGoldDustSetPrice: Contract;

  let MintGoldDustMemoir: ContractFactory;
  let mintGoldDustMemoir: Contract;

  let MintGoldDustMarketplaceAuction: ContractFactory;
  let mintGoldDustMarketplaceAuction: Contract;

  let deployer: SignerWithAddress;
  let addr1: SignerWithAddress;
  let addr2: SignerWithAddress;
  let addr3: SignerWithAddress;
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
  const auction_duration = 5;
  const auction_extension_duration = 1;

  let primary_sale_fee_percent = 15;
  let secondary_sale_fee_percent = 5;
  let collector_fee = 3;
  let max_royalty = 20;
  let royalty = 5;

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

    [deployer, addr1, addr2, addr3, ...addrs] = await ethers.getSigners();

    mgdCompany = await upgrades.deployProxy(
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
    await mgdCompany.deployed();

    mintGoldDustERC721 = await upgrades.deployProxy(
      MintGoldDustERC721,
      [mgdCompany.address],
      {
        initializer: "initializeChild",
      }
    );

    mintGoldDustERC1155 = await upgrades.deployProxy(
      MintGoldDustERC1155,
      [mgdCompany.address, baseURI],
      {
        initializer: "initializeChild",
      }
    );
    await mintGoldDustERC1155.deployed();

    mintGoldDustSetPrice = await upgrades.deployProxy(
      MintGoldDustSetPrice,
      [
        mgdCompany.address,
        mintGoldDustERC721.address,
        mintGoldDustERC1155.address,
      ],
      { initializer: "initializeChild" }
    );
    await mintGoldDustSetPrice.deployed();

    mintGoldDustMarketplaceAuction = await upgrades.deployProxy(
      MintGoldDustMarketplaceAuction,
      [
        mgdCompany.address,
        mintGoldDustERC721.address,
        mintGoldDustERC1155.address,
      ],
      { initializer: "initializeChild" }
    );
    await mintGoldDustMarketplaceAuction.deployed();

    await mgdCompany.connect(deployer).setValidator(deployer.address, true);

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

  describe("\n--------------- Tests related witn the list NFT functionality ---------------\n", function () {
    let price = 1;
    let quantityToMint = 10;
    let quantityToList = 5;

    // Create an instance of the ListDTO struct

    beforeEach(async () => {
      // MGD owner whitelist the artist
      await mgdCompany.connect(deployer).whitelist(addr1.address, true);

      const encoder = new TextEncoder();
      const bytesMEMOIR = encoder.encode(MEMOIR);

      // addr1 mints a nft
      await mintGoldDustERC1155
        .connect(addr1)
        .mintNft(URI, toWei(5), quantityToMint, bytesMEMOIR);
      // Artist approve gdMarketPlace marketplace to exchange its NFT
      await mintGoldDustERC1155
        .connect(addr1)
        .setApprovalForAll(mintGoldDustSetPrice.address, true);
    });

    it("Should revert with a MustBeERC721OrERC1155 error if the contract address trying to list is neither a ERC721 nor a ERC1155.", async function () {
      await expect(
        mintGoldDustSetPrice
          .connect(addr1)
          .list(1, 1, mgdCompany.address, toWei(price))
      ).to.be.revertedWithCustomError(
        mintGoldDustSetPrice,
        "MustBeERC721OrERC1155"
      );

      await expect(
        mintGoldDustSetPrice
          .connect(addr1)
          .list(1, 1, addr1.address, toWei(price))
      ).to.be.revertedWithCustomError(
        mintGoldDustSetPrice,
        "MustBeERC721OrERC1155"
      );
    });

    it("Should track a listing of a MintGoldDustERC1155", async function () {
      // The owner of the token should be the artists before listing
      expect(await mintGoldDustERC1155.balanceOf(addr1.address, 1)).to.equal(
        quantityToMint
      );

      console.log(
        "\t ARTIST BALANCE BEFORE LIST: ",
        parseFloat(parseFloat(fromWei(await addr1.getBalance())).toFixed(5))
      );
      let artistBalanceBefore = await addr1.getBalance();

      await expect(
        mintGoldDustSetPrice
          .connect(addr1)
          .list(1, quantityToList, mintGoldDustERC1155.address, toWei(price))
      )
        .to.emit(mintGoldDustSetPrice, "MintGoldDustNftListedToSetPrice")
        .withArgs(
          1,
          addr1.address,
          toWei(price),
          quantityToList,
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
        await mintGoldDustERC1155.balanceOf(mintGoldDustSetPrice.address, 1)
      ).to.equal(5);

      expect(await mintGoldDustERC1155.balanceOf(addr1.address, 1)).to.equal(
        quantityToList
      );
    });

    it("Should secondary sale keep false if an artist list, delist and list again an item.", async function () {
      await mintGoldDustSetPrice
        .connect(addr1)
        .list(1, quantityToList, mintGoldDustERC1155.address, toWei(price));
      await mintGoldDustSetPrice.connect(addr1).delistNft({
        tokenId: 1,
        amount: quantityToList,
        nft: mintGoldDustERC1155.address,
      });
      await mintGoldDustSetPrice
        .connect(addr1)
        .list(1, quantityToList, mintGoldDustERC1155.address, toWei(price));
      expect(
        (
          await mintGoldDustSetPrice
            .connect(addr1)
            .getManagePrimarySale(mintGoldDustERC1155.address, 1)
        ).soldout
      ).to.be.equal(false);
    });

    it("Should revert the transaction if an artist tries to list its nft with price less than or equal zero.", async function () {
      await expect(
        mintGoldDustSetPrice
          .connect(addr1)
          .list(1, quantityToList, mintGoldDustERC1155.address, toWei(0))
      ).to.be.revertedWithCustomError(
        mintGoldDustSetPrice,
        "ListPriceMustBeGreaterThanZero"
      );
    });

    it("Should revert the transaction if an artist is not the owner of the token and try to list on the gold dust marketplace.", async function () {
      await expect(
        mintGoldDustSetPrice
          .connect(addr2)
          .list(1, quantityToList, mintGoldDustERC1155.address, toWei(price))
      )
        .to.revertedWithCustomError(mintGoldDustSetPrice, "AddressUnauthorized")
        .withArgs("Not owner or not has enough token quantity!");
    });
  });

  describe("\n--------------- Tests related with the update a listed NFT functionality ---------------\n", function () {
    let primaryPrice = 1;
    let newPrice = 2;
    const quantityToList = 5;
    const quantityToMint = 10;

    beforeEach(async () => {
      // MGD owner whitelist the artist
      await mgdCompany.connect(deployer).whitelist(addr1.address, true);

      const encoder = new TextEncoder();
      const bytesMEMOIR = encoder.encode(MEMOIR);

      // addr1 mints a nft
      await mintGoldDustERC1155
        .connect(addr1)
        .mintNft(URI, toWei(5), quantityToMint, bytesMEMOIR);
      // Artist approve gdMarketPlace marketplace to exchange its NFT
      await mintGoldDustERC1155
        .connect(addr1)
        .setApprovalForAll(mintGoldDustSetPrice.address, true);

      await mintGoldDustSetPrice
        .connect(addr1)
        .list(
          1,
          quantityToList,
          mintGoldDustERC1155.address,
          toWei(primaryPrice)
        );
    });

    it("Should revert with a MustBeERC721OrERC1155 error if the contract address trying to list is neither a ERC721 nor a ERC1155.", async function () {
      await expect(
        mintGoldDustSetPrice
          .connect(addr1)
          .updateListedNft(
            1,
            toWei(newPrice),
            mgdCompany.address,
            addr1.address
          )
      ).to.be.revertedWithCustomError(
        mintGoldDustSetPrice,
        "MustBeERC721OrERC1155"
      );

      await expect(
        mintGoldDustSetPrice
          .connect(addr1)
          .updateListedNft(1, toWei(newPrice), addr1.address, addr1.address)
      ).to.be.revertedWithCustomError(
        mintGoldDustSetPrice,
        "MustBeERC721OrERC1155"
      );
    });

    it("Should track if a listed item was correctly updated and emit the MintGoldDustNftListedItemUpdated event. We should remember that in this moment the owner of the NFT is the marketplace.", async function () {
      console.log(
        "\t ARTIST BALANCE BEFORE UPDATE A LISTED ITEM (ETH): ",
        parseFloat(fromWei(await addr1.getBalance()))
      );
      let artistBalanceBefore = await addr1.getBalance();

      // Get item from items mapping then check fields to ensure they are correct before update
      let marketItem =
        await mintGoldDustSetPrice.idMarketItemsByContractByOwner(
          mintGoldDustERC1155.address,
          1,
          addr1.address
        );
      expect(marketItem.price).to.equal(toWei(primaryPrice));

      // Update the listed NFT
      await expect(
        mintGoldDustSetPrice
          .connect(addr1)
          .updateListedNft(
            1,
            toWei(newPrice),
            mintGoldDustERC1155.address,
            addr1.address
          )
      )
        .to.emit(mintGoldDustSetPrice, "MintGoldDustNftListedItemUpdated")
        .withArgs(
          1,
          addr1.address,
          toWei(newPrice),
          mintGoldDustERC1155.address
        );

      console.log(
        "\t ARTIST BALANCE AFTER UPDATE A LISTED ITEM (ETH): ",
        parseFloat(fromWei(await addr1.getBalance()))
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

      // Get item from items mapping then check fields to ensure they are correct
      marketItem = await mintGoldDustSetPrice.idMarketItemsByContractByOwner(
        mintGoldDustERC1155.address,
        1,
        addr1.address
      );

      // Get item from items mapping then check fields to ensure they are correct before update
      expect(marketItem.price).to.equal(toWei(newPrice));

      // Just confirm that the owner is the marketplace
      expect(
        await mintGoldDustERC1155.balanceOf(mintGoldDustSetPrice.address, 1)
      ).to.equal(quantityToList);
    });

    it("Should revert the transaction with InvalidInput error if the marketplace owner tries to update some listed nft with price less than or equal zero.", async function () {
      // try to list with price less than zero
      await expect(
        mintGoldDustSetPrice
          .connect(addr1)
          .updateListedNft(
            1,
            toWei(0),
            mintGoldDustERC1155.address,
            addr1.address
          )
      ).to.be.revertedWithCustomError(
        mintGoldDustSetPrice,
        "ListPriceMustBeGreaterThanZero"
      );
    });

    it("Should revert the transaction with an MGDMarketplaceUnauthorized error if some address that is not the seller try to update the NFT listed.", async function () {
      // try to list with price less than zero
      await expect(
        mintGoldDustSetPrice
          .connect(addr2)
          .updateListedNft(
            1,
            toWei(newPrice),
            mintGoldDustERC1155.address,
            addr1.address
          )
      )
        .to.be.revertedWithCustomError(
          mintGoldDustSetPrice,
          "AddressUnauthorized"
        )
        .withArgs("Not seller!");
    });

    it("Should revert the transaction with an MGDMarketplaceItemIsNotListed error if some user tries to update an item that is not on sale.", async function () {
      let totalAmount = primaryPrice * quantityToList;
      totalAmount = totalAmount + (totalAmount * 3) / 100; // 3 ETH for each token

      await mintGoldDustSetPrice.connect(addr2).purchaseNft(
        {
          tokenId: 1,
          amount: quantityToList,
          nft: mintGoldDustERC1155.address,
          seller: addr1.address,
        },
        {
          value: toWei(totalAmount),
        }
      );
      await expect(
        mintGoldDustSetPrice
          .connect(addr2)
          .updateListedNft(
            1,
            toWei(newPrice),
            mintGoldDustERC1155.address,
            addr2.address
          )
      )
        .to.be.revertedWithCustomError(
          mintGoldDustSetPrice,
          "ItemIsNotListedBySeller"
        )
        .withArgs(
          1,
          mintGoldDustSetPrice.address,
          mintGoldDustERC1155.address,
          addr2.address,
          addr2.address
        );
    });
  });

  describe("\n--------------- Tests related with delist NFT functionality ---------------", function () {
    let primaryPrice = 1;
    const quantityToList = 5;
    const quantityToMint = 10;

    beforeEach(async () => {
      // MGD owner whitelist the artist
      await mgdCompany.connect(deployer).whitelist(addr1.address, true);

      const encoder = new TextEncoder();
      const bytesMEMOIR = encoder.encode(MEMOIR);

      // addr1 mints a nft
      await mintGoldDustERC1155
        .connect(addr1)
        .mintNft(URI, toWei(5), quantityToMint, bytesMEMOIR);
      // Artist approve gdMarketPlace marketplace to exchange its NFT
      await mintGoldDustERC1155
        .connect(addr1)
        .setApprovalForAll(mintGoldDustSetPrice.address, true);

      await mintGoldDustSetPrice
        .connect(addr1)
        .list(
          1,
          quantityToList,
          mintGoldDustERC1155.address,
          toWei(primaryPrice)
        );
    });

    it("Should delist a NFT from the marketplace and emit the NftQuantityDelisted event.", async function () {
      console.log(
        "\t ARTIST BALANCE BEFORE DELIST (ETH): ",
        parseFloat(fromWei(await addr1.getBalance()))
      );
      let artistBalanceBefore = await addr1.getBalance();

      expect(
        (
          await mintGoldDustSetPrice
            .connect(addr1)
            .idMarketItemsByContractByOwner(
              mintGoldDustERC1155.address,
              1,
              addr1.address
            )
        ).tokenAmount
      ).to.be.equal(quantityToList);
      // addr2 relist a purchased NFT
      await expect(
        mintGoldDustSetPrice.connect(addr1).delistNft({
          tokenId: 1,
          amount: quantityToList,
          nft: mintGoldDustERC1155.address,
        })
      )
        .to.emit(mintGoldDustSetPrice, "NftQuantityDelisted")
        .withArgs(
          1,
          quantityToList,
          addr1.address,
          mintGoldDustERC1155.address
        );
      // the market item tokenAmount listed should be zero
      expect(
        (
          await mintGoldDustSetPrice
            .connect(addr1)
            .idMarketItemsByContractByOwner(
              mintGoldDustERC1155.address,
              1,
              addr1.address
            )
        ).tokenAmount
      ).to.be.equal(0);

      console.log(
        "\t ARTIST BALANCE AFTER DELIST (ETH): ",
        parseFloat(fromWei(await addr1.getBalance()))
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
    });

    it("Should revert with a ItemIsNotListedBySeller error if some address that is not the item seller try to delist its NFT from marketplace.", async function () {
      // the market item should be not sold
      expect(
        (
          await mintGoldDustSetPrice
            .connect(addr1)
            .idMarketItemsByContractByOwner(
              mintGoldDustERC1155.address,
              1,
              addr1.address
            )
        ).tokenAmount
      ).to.be.equal(quantityToList);
      // addr2 relist a purchased NFT
      await expect(
        mintGoldDustSetPrice.connect(addr2).delistNft({
          tokenId: 1,
          amount: quantityToList,
          nft: mintGoldDustERC1155.address,
        })
      ).to.be.revertedWithCustomError(
        mintGoldDustSetPrice,
        "ItemIsNotListedBySeller"
      );
      // the market item should still be not sold
      expect(
        (
          await mintGoldDustSetPrice
            .connect(addr1)
            .idMarketItemsByContractByOwner(
              mintGoldDustERC1155.address,
              1,
              addr1.address
            )
        ).tokenAmount
      ).to.be.equal(quantityToList);
    });
  });

  describe("\n--------------- Purchase NFT on primary market ---------------\n", function () {
    // Calculate the fee and balance values based on the price
    let fee: number;
    let balance: number;
    let collFee: number;
    let primarySaleFee: number;
    let amountToMint = 10;
    let amountToList = 5;
    let amountToBuy = 3;
    let priceToList = 20;
    let priceToBuy = priceToList * amountToBuy;

    beforeEach(async () => {
      // MGD owner whitelist the artist
      await mgdCompany.connect(deployer).whitelist(addr1.address, true);

      const encoder = new TextEncoder();
      const bytesMEMOIR = encoder.encode(MEMOIR);

      // addr1 mints a nft
      await mintGoldDustERC1155
        .connect(addr1)
        .mintNft(URI, toWei(5), amountToMint, bytesMEMOIR);
      // Artist approve gdMarketPlace marketplace to exchange its NFT
      await mintGoldDustERC1155
        .connect(addr1)
        .setApprovalForAll(mintGoldDustSetPrice.address, true);

      await mintGoldDustSetPrice
        .connect(addr1)
        .list(1, amountToList, mintGoldDustERC1155.address, toWei(priceToList));

      fee = (priceToBuy * primary_sale_fee_percent) / 100;
      collFee = (priceToBuy * collector_fee) / 100;
      primarySaleFee = fee;
      balance = priceToBuy - primarySaleFee;
    });

    it("Shoud revert with a LessItemsListedThanTheRequiredAmount error if some collector tries to buy an amount greater than the number of tokens listed for an ERC1155.", async () => {
      await expect(
        mintGoldDustSetPrice.connect(addr2).purchaseNft(
          {
            tokenId: 1,
            amount: amountToList + 1,
            nft: mintGoldDustERC1155.address,
            seller: addr1.address,
          },
          {
            value: toWei(priceToBuy),
          }
        )
      ).to.be.revertedWithCustomError(
        mintGoldDustSetPrice,
        "LessItemsListedThanTheRequiredAmount"
      );
    });

    it("Should:\n \t - Simulate a primary sale that transfer an NFT to the buyer;\n \t - Verify if the item changed status for sale;\n \t - Verify if the seller balance increases;\n \t - Verify if the marketplace's owner receives the fee;\n \t - Verify if the isSecondarySale attribute was set to true;\n \t - Verify if the buyer balance was deacresed exactly the gas fee + the token price;", async function () {
      // get the balances for the seller and the owner of the marketplace.
      const sellerInitalEthBal = await addr1.getBalance();
      const feeAccountInitialEthBal = await deployer.getBalance();
      const feeAccountAfterEthBalShouldBe = ethers.BigNumber.from(
        feeAccountInitialEthBal
      ).add(toWei(primarySaleFee + collFee));

      // verify if the flag for secondary is false
      expect(
        (
          await mintGoldDustSetPrice
            .connect(addr1)
            .getManagePrimarySale(mintGoldDustERC1155.address, 1)
        ).soldout
      ).to.be.equal(false);

      let gasPrice = await mintGoldDustSetPrice.signer.getGasPrice();
      let gasLimit = await mintGoldDustSetPrice.estimateGas.purchaseNft(
        {
          tokenId: 1,
          amount: amountToBuy,
          nft: mintGoldDustERC1155.address,
          seller: addr1.address,
        },
        {
          value: toWei(priceToBuy + (priceToBuy * 3) / 100),
        }
      );

      console.log("\t GAS PRICE: ", gasPrice);
      console.log("\t GAS LIMIT: ", gasLimit);

      console.log(
        "\t\t TOTAL GAS ESTIMATION (USD): ",
        (+ethers.BigNumber.from(gasPrice).mul(gasLimit) / (100 * 10 ** 18)) *
          2500
      );

      console.log("\n\t\t ITEM PRICE: ", priceToList);
      console.log("\t\t Primary Market fee: ", fee);
      console.log("\t\t Collector fee: ", collFee);
      console.log("\t\t Marketplace owner fee: ", primarySaleFee);
      console.log("\t\t Balance to seller: ", balance);

      let addr2BalanceBefore = await addr2.getBalance();
      // execute the buyNft function
      await expect(
        mintGoldDustSetPrice.connect(addr2).purchaseNft(
          {
            tokenId: 1,
            amount: amountToBuy,
            nft: mintGoldDustERC1155.address,
            seller: addr1.address,
          },
          {
            value: toWei(priceToBuy + (priceToBuy * 3) / 100),
          }
        )
      )
        .to.emit(mintGoldDustSetPrice, "MintGoldDustNftPurchasedPrimaryMarket")
        .withArgs(
          1,
          1,
          addr1.address,
          addr2.address,
          toWei(priceToBuy),
          toWei(balance),
          toWei(fee),
          toWei(collFee),
          amountToBuy,
          false,
          false
        );

      console.log(
        "\n\t\t MARKETPLACE OWNER BALANCE BEFORE SALE: ",
        parseFloat(fromWei(feeAccountInitialEthBal))
      );

      console.log(
        "\t\t MARKETPLACE OWNER BALANCE AFTER SALE: ",
        parseFloat(fromWei(await deployer.getBalance()))
      );

      let addr2ShouldBeAfter = ethers.BigNumber.from(addr2BalanceBefore)
        .sub(toWei(priceToBuy + (priceToBuy * 3) / 100))
        .sub(ethers.BigNumber.from(gasPrice).mul(gasLimit));

      expect(
        parseFloat(
          (parseFloat(fromWei(await addr2.getBalance())) * 2500).toFixed(5)
        )
      ).to.be.closeTo(
        parseFloat((parseFloat(fromWei(addr2ShouldBeAfter)) * 2500).toFixed(5)),
        1
      );

      // verify if the owner of the NFT changed for the buyer
      expect(await mintGoldDustERC1155.balanceOf(addr2.address, 1)).to.equal(
        amountToBuy
      );

      // verify if the amount is the difference of the list and buy
      expect(
        (
          await mintGoldDustSetPrice
            .connect(addr2)
            .getManagePrimarySale(mintGoldDustERC1155.address, 1)
        ).amount
      ).to.be.equal(amountToMint - amountToBuy);

      // verify if the marketplace owner's balance increased the fee
      expect(await deployer.getBalance()).to.be.equal(
        feeAccountAfterEthBalShouldBe
      );
      // verify if the seller received the balance
      expect(await addr1.getBalance()).to.be.equal(
        ethers.BigNumber.from(sellerInitalEthBal).add(toWei(balance))
      );

      // expect item sold to be true
      expect(
        (
          await mintGoldDustSetPrice.idMarketItemsByContractByOwner(
            mintGoldDustERC1155.address,
            1,
            addr2.address
          )
        ).tokenAmount
      ).to.be.equal(0);

      // expect item sold to be true
      expect(await mintGoldDustSetPrice.itemsSold()).to.be.equal(1);

      console.log(
        "\t\t SELLER BALANCE BEFORE SALE: ",
        parseFloat(fromWei(sellerInitalEthBal))
      );

      console.log(
        "\t\t SELLER BALANCE AFTER SALE: ",
        parseFloat(fromWei(await addr1.getBalance()))
      );

      console.log(
        "\t\t BUYER BALANCE BEFORE SALE: ",
        parseFloat(fromWei(addr2BalanceBefore))
      );

      console.log(
        "\t\t BUYER BALANCE AFTER SALE: ",
        parseFloat(fromWei(await addr2.getBalance()))
      );
    });

    it("Should revert with ItemIsNotListed error if the user tries to buy a MintGoldDustERC1155 that was already sold.", async () => {
      let totalAmount = priceToList * amountToList;
      totalAmount = totalAmount + (totalAmount * 3) / 100; // 3 ETH for each token
      await mintGoldDustSetPrice.connect(addr2).purchaseNft(
        {
          tokenId: 1,
          amount: amountToList,
          nft: mintGoldDustERC1155.address,
          seller: addr1.address,
        },
        {
          value: toWei(totalAmount),
        }
      );
      await expect(
        mintGoldDustSetPrice.connect(addr3).purchaseNft(
          {
            tokenId: 1,
            amount: amountToBuy,
            nft: mintGoldDustERC1155.address,
            seller: addr2.address,
          },
          {
            value: toWei(priceToBuy),
          }
        )
      ).to.be.revertedWithCustomError(
        mintGoldDustSetPrice,
        "ItemIsNotListedBySeller"
      );
    });

    it("Should revert with InvalidAmountForThisPurchase if the user tries to buy an itemId with an amount greater than the item's price.", async () => {
      await expect(
        mintGoldDustSetPrice.connect(addr3).purchaseNft(
          {
            tokenId: 1,
            amount: amountToBuy,
            nft: mintGoldDustERC1155.address,
            seller: addr1.address,
          },
          {
            value: toWei(priceToBuy + 10),
          }
        )
      ).to.be.revertedWithCustomError(
        mintGoldDustSetPrice,
        "InvalidAmountForThisPurchase"
      );
    });

    it("Should revert with InvalidAmountForThisPurchase if the user tries to buy an itemId with an amount less than the item's price.", async () => {
      await expect(
        mintGoldDustSetPrice.connect(addr3).purchaseNft(
          {
            tokenId: 1,
            amount: amountToBuy,
            nft: mintGoldDustERC1155.address,
            seller: addr1.address,
          },
          {
            value: toWei(priceToBuy - 10),
          }
        )
      ).to.be.revertedWithCustomError(
        mintGoldDustSetPrice,
        "InvalidAmountForThisPurchase"
      );
    });

    it("Should revert with a LessItemsListedThanTheRequiredAmount error if the amount requested for purchase is more than the amount listed on the contract for ERC1155.", async () => {
      await expect(
        mintGoldDustSetPrice.connect(addr2).purchaseNft(
          {
            tokenId: 1,
            amount: amountToList + 1,
            nft: mintGoldDustERC1155.address,
            seller: addr1.address,
          },
          {
            value: toWei(priceToBuy),
          }
        )
      ).to.be.revertedWithCustomError(
        mintGoldDustSetPrice,
        "LessItemsListedThanTheRequiredAmount"
      );
    });

    it("Should revert with a LessItemsListedThanTheRequiredAmount error if the amount requested for purchase is more than the amount available in the idMarketItemsByContractByOwner mapping for ERC1155.", async () => {
      await expect(
        mintGoldDustSetPrice.connect(addr2).purchaseNft(
          {
            tokenId: 1,
            amount: amountToList + 1,
            nft: mintGoldDustERC1155.address,
            seller: addr1.address,
          },
          {
            value: toWei(priceToBuy),
          }
        )
      ).to.be.revertedWithCustomError(
        mintGoldDustSetPrice,
        "LessItemsListedThanTheRequiredAmount"
      );
    });

    it("Should verify that the amount of managePrimarySale is equal to the balance in ERC1155, and the sold status is false and the address is the artist's address", async () => {
      expect(
        (
          await mintGoldDustSetPrice
            .connect(addr1)
            .getManagePrimarySale(mintGoldDustERC1155.address, 1)
        ).amount
      ).to.be.equal(amountToMint);

      expect(
        (
          await mintGoldDustSetPrice
            .connect(addr1)
            .getManagePrimarySale(mintGoldDustERC1155.address, 1)
        ).soldout
      ).to.be.equal(false);
    });

    it("Should decrease the amount correctly after part of the listed items are sold, and sold status should remain false", async () => {
      let totalAmount = priceToList * amountToBuy;
      totalAmount = totalAmount + (totalAmount * 3) / 100; // 3 ETH for each token
      await mintGoldDustSetPrice.connect(addr2).purchaseNft(
        {
          tokenId: 1,
          amount: amountToBuy,
          nft: mintGoldDustERC1155.address,
          seller: addr1.address,
        },
        {
          value: toWei(totalAmount),
        }
      );

      expect(
        (
          await mintGoldDustSetPrice
            .connect(addr1)
            .getManagePrimarySale(mintGoldDustERC1155.address, 1)
        ).amount
      ).to.be.equal(amountToMint - amountToBuy);

      expect(
        (
          await mintGoldDustSetPrice
            .connect(addr1)
            .getManagePrimarySale(mintGoldDustERC1155.address, 1)
        ).soldout
      ).to.be.equal(false);
    });

    it("Should set amount to zero, sold status to true and delete the mapping for the idMarketItem when all the listed items are sold", async () => {
      await mintGoldDustSetPrice.connect(addr1).delistNft({
        tokenId: 1,
        amount: amountToList,
        nft: mintGoldDustERC1155.address,
      });

      await mintGoldDustSetPrice
        .connect(addr1)
        .list(1, amountToMint, mintGoldDustERC1155.address, toWei(priceToList));

      let totalAmount = priceToList * amountToMint;
      totalAmount = totalAmount + (totalAmount * 3) / 100; // 3 ETH for each token

      await mintGoldDustSetPrice.connect(addr2).purchaseNft(
        {
          tokenId: 1,
          amount: amountToMint,
          nft: mintGoldDustERC1155.address,
          seller: addr1.address,
        },
        {
          value: toWei(totalAmount),
        }
      );

      expect(
        (
          await mintGoldDustSetPrice
            .connect(addr1)
            .getManagePrimarySale(mintGoldDustERC1155.address, 1)
        ).amount
      ).to.be.equal(0);

      expect(
        (
          await mintGoldDustSetPrice
            .connect(addr1)
            .getManagePrimarySale(mintGoldDustERC1155.address, 1)
        ).soldout
      ).to.be.equal(true);
    });

    it("Mint 10 - List 5 - Sell 5 - Then buy 3 more of those 5 - Then sell 5 more - Verify that the amount zeroed correctly, sold true, and mapping deleted", async () => {
      let totalAmount = priceToList * 5;
      totalAmount = totalAmount + (totalAmount * 3) / 100; // 3 ETH for each token
      await mintGoldDustSetPrice.connect(addr2).purchaseNft(
        {
          tokenId: 1,
          amount: 5,
          nft: mintGoldDustERC1155.address,
          seller: addr1.address,
        },
        {
          value: toWei(totalAmount),
        }
      );
      console.log("1");
      await mintGoldDustERC1155
        .connect(addr2)
        .setApprovalForAll(mintGoldDustSetPrice.address, true);

      await mintGoldDustSetPrice
        .connect(addr2)
        .list(1, 5, mintGoldDustERC1155.address, toWei(priceToList));
      console.log("1");

      await mintGoldDustSetPrice.connect(addr1).purchaseNft(
        {
          tokenId: 1,
          amount: 5,
          nft: mintGoldDustERC1155.address,
          seller: addr2.address,
        },
        {
          value: toWei(priceToList * 5),
        }
      );

      await mintGoldDustSetPrice
        .connect(addr1)
        .list(1, 5, mintGoldDustERC1155.address, toWei(priceToList));

      await mintGoldDustSetPrice.connect(addr2).purchaseNft(
        {
          tokenId: 1,
          amount: 5,
          nft: mintGoldDustERC1155.address,
          seller: addr1.address,
        },
        {
          value: toWei(totalAmount),
        }
      );

      expect(
        (
          await mintGoldDustSetPrice
            .connect(addr1)
            .getManagePrimarySale(mintGoldDustERC1155.address, 1)
        ).amount
      ).to.be.equal(0);

      expect(
        (
          await mintGoldDustSetPrice
            .connect(addr1)
            .getManagePrimarySale(mintGoldDustERC1155.address, 1)
        ).soldout
      ).to.be.equal(true);
    });

    it("Mint 10 - List 5 - Sell 5 - Buy 5 - Sell 3 - Check if the amount is 2, sold false still and the mapping is not deleted", async () => {
      let totalAmount = priceToList * 5;
      totalAmount = totalAmount + (totalAmount * 3) / 100; // 3 ETH for each token
      await mintGoldDustSetPrice.connect(addr2).purchaseNft(
        {
          tokenId: 1,
          amount: 5,
          nft: mintGoldDustERC1155.address,
          seller: addr1.address,
        },
        {
          value: toWei(totalAmount),
        }
      );

      await mintGoldDustERC1155
        .connect(addr2)
        .setApprovalForAll(mintGoldDustSetPrice.address, true);

      await mintGoldDustSetPrice
        .connect(addr2)
        .list(1, 5, mintGoldDustERC1155.address, toWei(priceToList));

      await mintGoldDustSetPrice.connect(addr1).purchaseNft(
        {
          tokenId: 1,
          amount: 5,
          nft: mintGoldDustERC1155.address,
          seller: addr2.address,
        },
        {
          value: toWei(priceToList * 5),
        }
      );

      await mintGoldDustSetPrice
        .connect(addr1)
        .list(1, 5, mintGoldDustERC1155.address, toWei(priceToList));

      totalAmount = priceToList * 3;
      totalAmount = totalAmount + (totalAmount * 3) / 100; // 3 ETH for each token

      await mintGoldDustSetPrice.connect(addr2).purchaseNft(
        {
          tokenId: 1,
          amount: 3,
          nft: mintGoldDustERC1155.address,
          seller: addr1.address,
        },
        {
          value: toWei(totalAmount),
        }
      );

      expect(
        (
          await mintGoldDustSetPrice
            .connect(addr1)
            .getManagePrimarySale(mintGoldDustERC1155.address, 1)
        ).amount
      ).to.be.equal(2);

      expect(
        (
          await mintGoldDustSetPrice
            .connect(addr1)
            .getManagePrimarySale(mintGoldDustERC1155.address, 1)
        ).soldout
      ).to.be.equal(false);
    });

    it("Mint 10 - List 5 - Sell 5 - Buy the 5 again - List 10 - Sell 6 - Check if the amount zeroed, sold is true and mapping is not deleted", async () => {
      let totalAmount = priceToList * 5;
      totalAmount = totalAmount + (totalAmount * 3) / 100; // 3 ETH for each token
      await mintGoldDustSetPrice.connect(addr2).purchaseNft(
        {
          tokenId: 1,
          amount: 5,
          nft: mintGoldDustERC1155.address,
          seller: addr1.address,
        },
        {
          value: toWei(totalAmount),
        }
      );

      await mintGoldDustERC1155
        .connect(addr2)
        .setApprovalForAll(mintGoldDustSetPrice.address, true);

      await mintGoldDustSetPrice
        .connect(addr2)
        .list(1, 5, mintGoldDustERC1155.address, toWei(priceToList));

      await mintGoldDustSetPrice.connect(addr1).purchaseNft(
        {
          tokenId: 1,
          amount: 5,
          nft: mintGoldDustERC1155.address,
          seller: addr2.address,
        },
        {
          value: toWei(priceToList * 5),
        }
      );

      await expect(
        mintGoldDustSetPrice
          .connect(addr1)
          .list(1, 10, mintGoldDustERC1155.address, toWei(priceToList))
      ).to.be.revertedWith("Invalid amount for primary sale");
    });
  });

  describe("\n--------------- Purchase NFT on secondary market ---------------\n", function () {
    let royaltyFee: number;
    let secondarySaleFee: number;

    // Calculate the fee and balance values based on the price
    let fee: number;
    let balance: number;
    let collFee: number;
    let primarySaleFee: number;
    let amountToMint = 10;
    let amountToList = 10;
    let amountToBuy = 10;
    let priceToList = 20;
    let priceToBuy = priceToList * amountToBuy;

    let amountToListForSecondary = 3;
    let amountToBuyForSecondary = 2;
    let priceToListForSecondary = 30;
    let priceToBuyForSecondary =
      priceToListForSecondary * amountToBuyForSecondary;

    beforeEach(async () => {
      // MGD owner whitelist the artist
      await mgdCompany.connect(deployer).whitelist(addr1.address, true);

      const encoder = new TextEncoder();
      const bytesMEMOIR = encoder.encode(MEMOIR);

      // addr1 mints a nft
      await mintGoldDustERC1155
        .connect(addr1)
        .mintNft(URI, toWei(5), amountToMint, bytesMEMOIR);
      // Artist approve gdMarketPlace marketplace to exchange its NFT
      await mintGoldDustERC1155
        .connect(addr1)
        .setApprovalForAll(mintGoldDustSetPrice.address, true);

      expect(await mintGoldDustERC1155.balanceOf(addr1.address, 1)).to.equal(
        amountToMint
      );

      await mintGoldDustSetPrice
        .connect(addr1)
        .list(1, amountToList, mintGoldDustERC1155.address, toWei(priceToList));

      expect(
        await mintGoldDustERC1155.balanceOf(mintGoldDustSetPrice.address, 1)
      ).to.equal(amountToList);

      let totalAmount = priceToList * amountToBuy;
      totalAmount = totalAmount + (totalAmount * 3) / 100; // 3 ETH for each token

      await mintGoldDustSetPrice.connect(addr2).purchaseNft(
        {
          tokenId: 1,
          amount: amountToBuy,
          nft: mintGoldDustERC1155.address,
          seller: addr1.address,
        },
        {
          value: toWei(totalAmount),
        }
      );

      expect(
        await mintGoldDustERC1155.balanceOf(mintGoldDustSetPrice.address, 1)
      ).to.equal(amountToMint - amountToBuy);

      expect(await mintGoldDustERC1155.balanceOf(addr2.address, 1)).to.equal(
        amountToBuy
      );

      // Artist approve gdMarketPlace marketplace to exchange its NFT
      await mintGoldDustERC1155
        .connect(addr2)
        .setApprovalForAll(mintGoldDustSetPrice.address, true);

      await mintGoldDustSetPrice
        .connect(addr2)
        .list(
          1,
          amountToListForSecondary,
          mintGoldDustERC1155.address,
          toWei(priceToListForSecondary)
        );

      secondarySaleFee =
        (priceToBuyForSecondary * secondary_sale_fee_percent) / 100;
      royaltyFee = (priceToBuyForSecondary * royalty) / 100;
      balance = priceToBuyForSecondary - (secondarySaleFee + royaltyFee);
    });

    it("Should simulate a secondary sale that transfer an NFT to the buyer, verify if the item changed status for sale, verify if the seller balance increases and also if the marketplace's owner receives the fee and verify if the artist creator have received the royalty.", async function () {
      // verify if the isSecondarySale sale attribute is true
      expect(
        (
          await mintGoldDustSetPrice.getManagePrimarySale(
            mintGoldDustERC1155.address,
            1
          )
        ).soldout
      ).to.be.equal(true);
      // get the balances for the seller and the owner of the marketplace.
      const feeAccountInitialEthBal = await deployer.getBalance();
      let addr3BalanceBefore = await addr3.getBalance();
      // get the NFT's artist creator balance
      const provider = ethers.provider;
      const artistCreatorAddress = await mintGoldDustERC1155.tokenIdArtist(1);
      const artistCreatorInitialBal = await provider.getBalance(
        artistCreatorAddress
      );

      // get the addr2 buyer initial balance
      const artistSellerInitialBal = await addr2.getBalance();
      let gasPrice = await mintGoldDustSetPrice.signer.getGasPrice();
      let gasLimit = await mintGoldDustSetPrice.estimateGas.purchaseNft(
        {
          tokenId: 1,
          amount: amountToBuyForSecondary,
          nft: mintGoldDustERC1155.address,
          seller: addr2.address,
        },
        {
          value: toWei(priceToBuyForSecondary),
        }
      );
      console.log("\t GAS PRICE: ", gasPrice);
      console.log("\t GAS LIMIT: ", gasLimit);
      console.log(
        "\t\t TOTAL GAS ESTIMATION (USD): ",
        (+ethers.BigNumber.from(gasPrice).mul(gasLimit) / (100 * 10 ** 18)) *
          2500
      );
      // execute the buyNft function
      await expect(
        mintGoldDustSetPrice.connect(addr3).purchaseNft(
          {
            tokenId: 1,
            amount: amountToBuyForSecondary,
            nft: mintGoldDustERC1155.address,
            seller: addr2.address,
          },
          {
            value: toWei(priceToBuyForSecondary),
          }
        )
      )
        .to.emit(
          mintGoldDustSetPrice,
          "MintGoldDustNftPurchasedSecondaryMarket"
        )
        .withArgs(
          2,
          1,
          addr2.address,
          addr3.address,
          toWei(priceToBuyForSecondary),
          toWei(balance),
          toWei(royalty),
          toWei(royaltyFee),
          artistCreatorAddress,
          toWei(secondarySaleFee),
          amountToBuyForSecondary,
          false,
          false
        );
      // prepare the future balance that the owner should have after the transaction
      const feeAccountAfterEthBalShouldBe = ethers.BigNumber.from(
        feeAccountInitialEthBal
      ).add(toWei(secondarySaleFee));
      // verify if the owner of the NFT changed for the buyer
      //expect(await mintGoldDustERC1155.ownerOf(1)).to.equal(addr3.address);
      console.log("\n\t\t ITEM PRICE: ", priceToBuyForSecondary);
      console.log("\t\t Secondary Market fee: ", secondarySaleFee);
      console.log("\t\t Royalty fee: ", royaltyFee);
      console.log("\t\t Balance to seller: ", balance);
      console.log(
        "\n\t\t MARKETPLACE OWNER BALANCE BEFORE SALE: ",
        parseFloat(fromWei(feeAccountInitialEthBal))
      );
      console.log(
        "\t\t MARKETPLACE OWNER BALANCE AFTER SALE: ",
        parseFloat(fromWei(await deployer.getBalance()))
      );
      // verify if the marketplace owner's balance increased the fee
      expect(await deployer.getBalance()).to.be.equal(
        feeAccountAfterEthBalShouldBe
      );
      // verify if the seller received the balance
      expect(await addr2.getBalance()).to.be.equal(
        ethers.BigNumber.from(artistSellerInitialBal).add(toWei(balance))
      );
      console.log(
        "\t\t SELLER BALANCE BEFORE SALE: ",
        parseFloat(fromWei(artistSellerInitialBal))
      );
      console.log(
        "\t\t SELLER BALANCE AFTER SALE: ",
        parseFloat(fromWei(await addr2.getBalance()))
      );
      const artistCreatorAfterBal = await addr1.getBalance();
      console.log(
        "\t\t ARTIST BALANCE BEFORE: ",
        parseFloat(fromWei(artistCreatorInitialBal))
      );
      console.log(
        "\t\t ARTIST BALANCE AFTER ROYALTY: ",
        parseFloat(fromWei(artistCreatorAfterBal))
      );
      console.log(
        "\t\t BUYER BALANCE BEFORE SALE: ",
        parseFloat(fromWei(addr3BalanceBefore))
      );
      console.log(
        "\t\t BUYER BALANCE AFTER SALE: ",
        parseFloat(fromWei(await addr3.getBalance()))
      );
      // verify if the artist received the royalty
      expect(await provider.getBalance(artistCreatorAddress)).to.be.equal(
        ethers.BigNumber.from(artistCreatorInitialBal).add(toWei(royaltyFee))
      );
      let addr3ShouldBeAfter = ethers.BigNumber.from(addr3BalanceBefore)
        .sub(toWei(priceToBuyForSecondary))
        .sub(ethers.BigNumber.from(gasPrice).mul(gasLimit));
      expect(
        parseFloat(parseFloat(fromWei(await addr3.getBalance())).toFixed(3))
      ).to.be.equal(
        parseFloat(parseFloat(fromWei(addr3ShouldBeAfter)).toFixed(3))
      );
      // expect item sold to be true
      expect(
        (
          await mintGoldDustSetPrice.idMarketItemsByContractByOwner(
            mintGoldDustERC1155.address,
            1,
            addr3.address
          )
        ).tokenAmount
      ).to.be.equal(0);
    });
  });
});
