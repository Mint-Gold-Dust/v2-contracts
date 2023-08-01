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

describe("MintGoldDustSetPrice.sol Smart Contract \n___________________________________________________\n \nThis smart contract is responsible by all functionalities related with the fixed price market. \n Here goes the tests related with the MintGoldDustSetPrice market and the MintGoldDustERC721 tokens. \n\n", function () {
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

    await mgdCompany.connect(deployer).setValidator(deployer.address, true);
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
      await mintGoldDustERC721
        .connect(addr1)
        .mintNft(URI, toWei(5), quantityToMint, bytesMEMOIR);
      // Artist approve gdMarketPlace marketplace to exchange its NFT
      await mintGoldDustERC721
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

    it("Should track a listing of a mintGoldDustERC721", async function () {
      // The owner of the token should be the artists before listing
      expect(await mintGoldDustERC721.ownerOf(1)).to.equal(addr1.address);

      console.log(
        "\t ARTIST BALANCE BEFORE LIST: ",
        parseFloat(parseFloat(fromWei(await addr1.getBalance())).toFixed(5))
      );
      let artistBalanceBefore = await addr1.getBalance();

      await expect(
        mintGoldDustSetPrice
          .connect(addr1)
          .list(1, quantityToList, mintGoldDustERC721.address, toWei(price))
      )
        .to.emit(mintGoldDustSetPrice, "MintGoldDustNftListedToSetPrice")
        .withArgs(
          1,
          addr1.address,
          toWei(price),
          1,
          mintGoldDustERC721.address
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
      expect(await mintGoldDustERC721.ownerOf(1)).to.equal(
        mintGoldDustSetPrice.address
      );
    });

    it("Should secondary sale keep false if an artist list, delist and list again an item.", async function () {
      await mintGoldDustSetPrice
        .connect(addr1)
        .list(1, quantityToList, mintGoldDustERC721.address, toWei(price));
      await mintGoldDustSetPrice.connect(addr1).delistNft({
        tokenId: 1,
        contractAddress: mintGoldDustERC721.address,
      });
      await mintGoldDustSetPrice
        .connect(addr1)
        .list(1, quantityToList, mintGoldDustERC721.address, toWei(price));

      expect(
        (
          await mintGoldDustSetPrice
            .connect(addr1)
            .idMarketItemsByContractByOwner(
              mintGoldDustERC721.address,
              1,
              addr1.address
            )
        ).isSecondarySale
      ).to.be.equal(false);
    });

    it("Should revert the transaction if an artist tries to list its nft with price less than or equal zero.", async function () {
      await expect(
        mintGoldDustSetPrice
          .connect(addr1)
          .list(1, quantityToList, mintGoldDustERC721.address, toWei(0))
      ).to.be.revertedWithCustomError(
        mintGoldDustSetPrice,
        "ListPriceMustBeGreaterThanZero"
      );
    });

    it("Should revert the transaction if an artist is not the owner of the token and try to list on the gold dust marketplace.", async function () {
      await expect(
        mintGoldDustSetPrice
          .connect(addr2)
          .list(1, quantityToList, mintGoldDustERC721.address, toWei(price))
      )
        .to.revertedWithCustomError(mintGoldDustSetPrice, "AddressUnauthorized")
        .withArgs("Not owner!");
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
      await mintGoldDustERC721
        .connect(addr1)
        .mintNft(URI, toWei(5), quantityToMint, bytesMEMOIR);
      // Artist approve gdMarketPlace marketplace to exchange its NFT
      await mintGoldDustERC721
        .connect(addr1)
        .setApprovalForAll(mintGoldDustSetPrice.address, true);

      await mintGoldDustSetPrice
        .connect(addr1)
        .list(
          1,
          quantityToList,
          mintGoldDustERC721.address,
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
          mintGoldDustERC721.address,
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
            mintGoldDustERC721.address,
            addr1.address
          )
      )
        .to.emit(mintGoldDustSetPrice, "MintGoldDustNftListedItemUpdated")
        .withArgs(
          1,
          addr1.address,
          toWei(newPrice),
          mintGoldDustERC721.address
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
        mintGoldDustERC721.address,
        1,
        addr1.address
      );

      // Get item from items mapping then check fields to ensure they are correct before update
      expect(marketItem.price).to.equal(toWei(newPrice));

      // Just confirm that the owner is the marketplace
      expect(await mintGoldDustERC721.ownerOf(1)).to.equal(
        mintGoldDustSetPrice.address
      );
    });

    it("Should revert the transaction with InvalidInput error if the marketplace owner tries to update some listed nft with price less than or equal zero.", async function () {
      // try to list with price less than zero
      await expect(
        mintGoldDustSetPrice
          .connect(addr1)
          .updateListedNft(
            1,
            toWei(0),
            mintGoldDustERC721.address,
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
            mintGoldDustERC721.address,
            addr2.address
          )
      )
        .to.be.revertedWithCustomError(
          mintGoldDustSetPrice,
          "AddressUnauthorized"
        )
        .withArgs("Not seller!");
    });

    it("Should revert the transaction with an MGDMarketplaceItemIsNotListed error if some user tries to update an item that is not on sale.", async function () {
      await mintGoldDustSetPrice.connect(addr2).purchaseNft(
        {
          tokenId: 1,
          amount: quantityToList,
          contractAddress: mintGoldDustERC721.address,
          seller: addr1.address,
        },
        {
          value: toWei(primaryPrice),
        }
      );

      await expect(
        mintGoldDustSetPrice
          .connect(addr2)
          .updateListedNft(
            1,
            toWei(newPrice),
            mintGoldDustERC721.address,
            addr2.address
          )
      )
        .to.be.revertedWithCustomError(mintGoldDustSetPrice, "ItemIsNotListed")
        .withArgs(mintGoldDustERC721.address);
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
      await mintGoldDustERC721
        .connect(addr1)
        .mintNft(URI, toWei(5), quantityToMint, bytesMEMOIR);
      // Artist approve gdMarketPlace marketplace to exchange its NFT
      await mintGoldDustERC721
        .connect(addr1)
        .setApprovalForAll(mintGoldDustSetPrice.address, true);

      await mintGoldDustSetPrice
        .connect(addr1)
        .list(
          1,
          quantityToList,
          mintGoldDustERC721.address,
          toWei(primaryPrice)
        );
    });

    it("Should delist a NFT from the marketplace and emit the MintGoldDustNftRemovedFromMarketplace event.", async function () {
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
              mintGoldDustERC721.address,
              1,
              addr1.address
            )
        ).sold
      ).to.be.equal(false);
      // addr2 relist a purchased NFT
      await expect(
        mintGoldDustSetPrice.connect(addr1).delistNft({
          tokenId: 1,
          contractAddress: mintGoldDustERC721.address,
        })
      )
        .to.emit(mintGoldDustSetPrice, "MintGoldDustNftRemovedFromMarketplace")
        .withArgs(1, addr1.address, mintGoldDustERC721.address);
      // the market item should be sold
      expect(
        (
          await mintGoldDustSetPrice
            .connect(addr1)
            .idMarketItemsByContractByOwner(
              mintGoldDustERC721.address,
              1,
              addr1.address
            )
        ).sold
      ).to.be.equal(true);

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

    it("Should revert with a MGDMarketplaceUnauthorized error if some address that is not the item seller try to delist its NFT from marketplace.", async function () {
      // the market item should be not sold
      expect(
        (
          await mintGoldDustSetPrice
            .connect(addr1)
            .idMarketItemsByContractByOwner(
              mintGoldDustERC721.address,
              1,
              addr1.address
            )
        ).sold
      ).to.be.equal(false);
      // addr2 relist a purchased NFT
      await expect(
        mintGoldDustSetPrice.connect(addr2).delistNft({
          tokenId: 1,
          contractAddress: mintGoldDustERC721.address,
        })
      ).to.be.revertedWithCustomError(
        mintGoldDustSetPrice,
        "AddressUnauthorized"
      );
      // the market item should still be not sold
      expect(
        (
          await mintGoldDustSetPrice
            .connect(addr1)
            .idMarketItemsByContractByOwner(
              mintGoldDustERC721.address,
              1,
              addr1.address
            )
        ).sold
      ).to.be.equal(false);
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
      await mintGoldDustERC721
        .connect(addr1)
        .mintNft(URI, toWei(5), amountToMint, bytesMEMOIR);
      // Artist approve gdMarketPlace marketplace to exchange its NFT
      await mintGoldDustERC721
        .connect(addr1)
        .setApprovalForAll(mintGoldDustSetPrice.address, true);

      await mintGoldDustSetPrice
        .connect(addr1)
        .list(1, amountToList, mintGoldDustERC721.address, toWei(priceToList));

      fee = (priceToList * primary_sale_fee_percent) / 100;
      collFee = (priceToList * collector_fee) / 100;
      primarySaleFee = fee + collFee;
      balance = priceToList - primarySaleFee;
    });

    it("Should:\n \t - Simulate a primary sale that transfer an NFT to the buyer;\n \t - Verify if the item changed status for sale;\n \t - Verify if the seller balance increases;\n \t - Verify if the marketplace's owner receives the fee;\n \t - Verify if the isSecondarySale attribute was set to true;\n \t - Verify if the buyer balance was deacresed exactly the gas fee + the token price;", async function () {
      // get the balances for the seller and the owner of the marketplace.
      const sellerInitalEthBal = await addr1.getBalance();
      const feeAccountInitialEthBal = await deployer.getBalance();
      const feeAccountAfterEthBalShouldBe = ethers.BigNumber.from(
        feeAccountInitialEthBal
      ).add(toWei(primarySaleFee));

      // verify if the flag for secondary is false
      expect(
        (
          await mintGoldDustSetPrice
            .connect(addr1)
            .idMarketItemsByContractByOwner(
              mintGoldDustERC721.address,
              1,
              addr1.address
            )
        ).isSecondarySale
      ).to.be.equal(false);

      let gasPrice = await mintGoldDustSetPrice.signer.getGasPrice();
      let gasLimit = await mintGoldDustSetPrice.estimateGas.purchaseNft(
        {
          tokenId: 1,
          amount: amountToBuy,
          contractAddress: mintGoldDustERC721.address,
          seller: addr1.address,
        },
        {
          value: toWei(priceToList),
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
            contractAddress: mintGoldDustERC721.address,
            seller: addr1.address,
          },
          {
            value: toWei(priceToList),
          }
        )
      )
        .to.emit(mintGoldDustSetPrice, "MintGoldDustNftPurchasedPrimaryMarket")
        .withArgs(
          1,
          1,
          addr1.address,
          addr2.address,
          toWei(priceToList),
          toWei(balance),
          toWei(fee),
          toWei(collFee),
          amountToBuy,
          false,
          false,
          true
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
        .sub(toWei(priceToList))
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
        (
          await mintGoldDustSetPrice
            .connect(addr2)
            .idMarketItemsByContractByOwner(
              mintGoldDustERC721.address,
              1,
              addr2.address
            )
        ).isSecondarySale
      ).to.be.equal(true);

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
            mintGoldDustERC721.address,
            1,
            addr2.address
          )
        ).sold
      ).to.be.equal(true);

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

    it("Should revert with ItemIsNotListed error if the user tries to buy a mintGoldDustERC721 that was already sold.", async () => {
      await mintGoldDustSetPrice.connect(addr2).purchaseNft(
        {
          tokenId: 1,
          amount: amountToList,
          contractAddress: mintGoldDustERC721.address,
          seller: addr1.address,
        },
        {
          value: toWei(priceToList),
        }
      );
      await expect(
        mintGoldDustSetPrice.connect(addr3).purchaseNft(
          {
            tokenId: 1,
            amount: amountToBuy,
            contractAddress: mintGoldDustERC721.address,
            seller: addr2.address,
          },
          {
            value: toWei(priceToList),
          }
        )
      ).to.be.revertedWithCustomError(mintGoldDustSetPrice, "ItemIsNotListed");
    });

    it("Should revert with InvalidAmountForThisPurchase if the user tries to buy an itemId with an amount greater than the item's price.", async () => {
      await expect(
        mintGoldDustSetPrice.connect(addr3).purchaseNft(
          {
            tokenId: 1,
            amount: amountToBuy,
            contractAddress: mintGoldDustERC721.address,
            seller: addr1.address,
          },
          {
            value: toWei(priceToList + 10),
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
            contractAddress: mintGoldDustERC721.address,
            seller: addr1.address,
          },
          {
            value: toWei(priceToList - 10),
          }
        )
      ).to.be.revertedWithCustomError(
        mintGoldDustSetPrice,
        "InvalidAmountForThisPurchase"
      );
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
    let amountToList = 5;
    let amountToBuy = 4;
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
      await mintGoldDustERC721
        .connect(addr1)
        .mintNft(URI, toWei(5), amountToMint, bytesMEMOIR);
      // Artist approve gdMarketPlace marketplace to exchange its NFT
      await mintGoldDustERC721
        .connect(addr1)
        .setApprovalForAll(mintGoldDustSetPrice.address, true);

      expect(await mintGoldDustERC721.ownerOf(1)).to.equal(addr1.address);

      await mintGoldDustSetPrice
        .connect(addr1)
        .list(1, amountToList, mintGoldDustERC721.address, toWei(priceToList));

      expect(await mintGoldDustERC721.ownerOf(1)).to.equal(
        mintGoldDustSetPrice.address
      );

      await mintGoldDustSetPrice.connect(addr2).purchaseNft(
        {
          tokenId: 1,
          amount: amountToBuy,
          contractAddress: mintGoldDustERC721.address,
          seller: addr1.address,
        },
        {
          value: toWei(priceToList),
        }
      );

      expect(await mintGoldDustERC721.ownerOf(1)).to.equal(addr2.address);

      // Artist approve gdMarketPlace marketplace to exchange its NFT
      await mintGoldDustERC721
        .connect(addr2)
        .setApprovalForAll(mintGoldDustSetPrice.address, true);

      await mintGoldDustSetPrice
        .connect(addr2)
        .list(
          1,
          amountToListForSecondary,
          mintGoldDustERC721.address,
          toWei(priceToListForSecondary)
        );

      secondarySaleFee =
        (priceToListForSecondary * secondary_sale_fee_percent) / 100;
      royaltyFee = (priceToListForSecondary * royalty) / 100;
      balance = priceToListForSecondary - (secondarySaleFee + royaltyFee);
    });

    it("Should simulate a secondary sale that transfer an NFT to the buyer, verify if the item changed status for sale, verify if the seller balance increases and also if the marketplace's owner receives the fee and verify if the artist creator have received the royalty.", async function () {
      // verify if the isSecondarySale sale attribute is true
      expect(
        (
          await mintGoldDustSetPrice.idMarketItemsByContractByOwner(
            mintGoldDustERC721.address,
            1,
            addr2.address
          )
        ).isSecondarySale
      ).to.equal(true);
      // get the balances for the seller and the owner of the marketplace.
      const feeAccountInitialEthBal = await deployer.getBalance();
      let addr3BalanceBefore = await addr3.getBalance();
      // get the NFT's artist creator balance
      const provider = ethers.provider;
      const artistCreatorAddress = await mintGoldDustERC721.tokenIdArtist(1);
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
          contractAddress: mintGoldDustERC721.address,
          seller: addr2.address,
        },
        {
          value: toWei(priceToListForSecondary),
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
            contractAddress: mintGoldDustERC721.address,
            seller: addr2.address,
          },
          {
            value: toWei(priceToListForSecondary),
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
          toWei(priceToListForSecondary),
          toWei(balance),
          toWei(royalty),
          toWei(royaltyFee),
          artistCreatorAddress,
          toWei(secondarySaleFee),
          amountToBuyForSecondary,
          false,
          false,
          true
        );
      // prepare the future balance that the owner should have after the transaction
      const feeAccountAfterEthBalShouldBe = ethers.BigNumber.from(
        feeAccountInitialEthBal
      ).add(toWei(secondarySaleFee));
      // verify if the owner of the NFT changed for the buyer
      expect(await mintGoldDustERC721.ownerOf(1)).to.equal(addr3.address);
      console.log("\n\t\t ITEM PRICE: ", priceToListForSecondary);
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
        .sub(toWei(priceToListForSecondary))
        .sub(ethers.BigNumber.from(gasPrice).mul(gasLimit));
      expect(
        parseFloat(parseFloat(fromWei(await addr3.getBalance())).toFixed(4))
      ).to.be.approximately(
        parseFloat(parseFloat(fromWei(addr3ShouldBeAfter)).toFixed(4)),
        1
      );
      // expect item sold to be true
      expect(
        (
          await mintGoldDustSetPrice.idMarketItemsByContractByOwner(
            mintGoldDustERC721.address,
            1,
            addr3.address
          )
        ).sold
      ).to.be.equal(true);
    });
  });
});