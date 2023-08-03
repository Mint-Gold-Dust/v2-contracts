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

describe("\nMGDSetPrice.sol Smart Contract \n****\*\*****\*\*\*\*****\*\*****\_\_\_****\*\*****\*\*\*\*****\*\*****\n \nThis smart contract is responsible by all functionalities related with the fixed price market. \n Here goes the tests related with the MintGoldDustSetPrice market and the MintGoldDustERC1155 tokens. \n\n", function () {
let MintGoldDustERC721: ContractFactory;
let mintGoldDustERC721: Contract;

let MintGoldDustERC1155: ContractFactory;
let mintGoldDustERC1155: Contract;

let MintGoldDustCompany: ContractFactory;
let mgdCompany: Contract;

let MintGoldDustSetPrice: ContractFactory;
let mgdSetPrice: Contract;

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
const max_royalty_initial = 20000000000000000000n; const auction_duration = 5;
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

    [deployer, addr1, addr2, addr3, ...addrs] = await ethers.getSigners();

    mgdCompany = await upgrades.deployProxy(
      MintGoldDustCompany,
      [
        TEST_OWNER,
        primary_sale_fee_percent_initial,
        secondary_sale_fee_percent_initial,
        collector_fee_initial,
        max_royalty_initial, auction_duration, auction_extension_duration
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

    mgdSetPrice = await upgrades.deployProxy(
      MintGoldDustSetPrice,
      [
        mgdCompany.address,
        mintGoldDustERC721.address,
        mintGoldDustERC1155.address,
      ],
      { initializer: "initializeChild" }
    );
    await mgdSetPrice.deployed();

    await mgdCompany.connect(deployer).setValidator(deployer.address, true);

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
let priceToBuy = priceToList \* amountToBuy;

    beforeEach(async () => {
      // MGD owner whitelist the artist
      await mgdCompany.connect(deployer).whitelist(addr1.address, true);
      // addr1 mints a nft
      await mintGoldDustERC1155
        .connect(addr1)
        .mintNft(URI, toWei(5), amountToMint);
      // Artist approve gdMarketPlace marketplace to exchange its NFT
      await mintGoldDustERC1155
        .connect(addr1)
        .setApprovalForAll(mgdSetPrice.address, true);

      await mgdSetPrice
        .connect(addr1)
        .list(1, toWei(priceToList), amountToList, mintGoldDustERC1155.address);

      fee = (priceToBuy * primary_sale_fee_percent) / 100;
      collFee = (priceToBuy * collector_fee) / 100;
      primarySaleFee = fee + collFee;
      balance = priceToBuy - primarySaleFee;
    });

    it("Shoud revert with a LessItemsListedThanTheRequiredAmount error if some collector tries to buy an amount greater than the number of tokens listed for an ERC1155.", async () => {
      await expect(
        mgdSetPrice
          .connect(addr2)
          .purchaseNft(1, amountToList + 1, mintGoldDustERC1155.address, {
            value: toWei(priceToBuy),
          })
      ).to.be.revertedWithCustomError(
        mgdSetPrice,
        "LessItemsListedThanTheRequiredAmount"
      );
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
          await mgdSetPrice
            .connect(addr1)
            .idMarketItemsByContractByOwner(mintGoldDustERC1155.address, 1)
        ).isSecondarySale
      ).to.be.equal(false);

      let gasPrice = await mgdSetPrice.signer.getGasPrice();
      let gasLimit = await mgdSetPrice.estimateGas.purchaseNft(
        1,
        amountToBuy,
        mintGoldDustERC1155.address,
        {
          value: toWei(priceToBuy),
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
        mgdSetPrice
          .connect(addr2)
          .purchaseNft(1, amountToBuy, mintGoldDustERC1155.address, {
            value: toWei(priceToBuy),
          })
      )
        .to.emit(mgdSetPrice, "NftPurchasedPrimaryMarket")
        .withArgs(
          1,
          addr1.address,
          addr2.address,
          toWei(priceToList),
          toWei(fee),
          toWei(collFee),
          false,
          false,
          amountToBuy
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
        .sub(toWei(priceToBuy))
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
      expect(await mintGoldDustERC1155.balanceOf(addr2.address, 1)).to.equal(
        amountToBuy
      );

      // verify if the flag for secondary market changed for true
      expect(
        (
          await mgdSetPrice
            .connect(addr1)
            .idMarketItemsByContractByOwner(mintGoldDustERC1155.address, 1)
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
          await mgdSetPrice.idMarketItemsByContractByOwner(
            mintGoldDustERC1155.address,
            1
          )
        ).sold
      ).to.be.equal(true);

      // expect item sold to be true
      expect(await mgdSetPrice.itemsSold()).to.be.equal(1);

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

    it("Should revert with LessItemsListedThanTheRequiredAmount error if the user tries to buy a MintGoldDustERC1155 that was already sold.", async () => {
      await mgdSetPrice
        .connect(addr2)
        .purchaseNft(1, amountToList, mintGoldDustERC1155.address, {
          value: toWei(priceToList * amountToList),
        });
      await expect(
        mgdSetPrice
          .connect(addr3)
          .purchaseNft(1, amountToBuy, mintGoldDustERC1155.address, {
            value: toWei(priceToBuy),
          })
      ).to.be.revertedWithCustomError(
        mgdSetPrice,
        "LessItemsListedThanTheRequiredAmount"
      );
    });

    it("Should revert with InvalidAmountForThisPurchase if the user tries to buy an itemId with an amount greater than the item's price.", async () => {
      await expect(
        mgdSetPrice
          .connect(addr3)
          .purchaseNft(1, amountToBuy, mintGoldDustERC1155.address, {
            value: toWei(priceToBuy + 10),
          })
      ).to.be.revertedWithCustomError(
        mgdSetPrice,
        "InvalidAmountForThisPurchase"
      );
    });

    it("Should revert with InvalidAmountForThisPurchase if the user tries to buy an itemId with an amount less than the item's price.", async () => {
      await expect(
        mgdSetPrice
          .connect(addr3)
          .purchaseNft(1, amountToBuy, mintGoldDustERC1155.address, {
            value: toWei(priceToBuy - 10),
          })
      ).to.be.revertedWithCustomError(
        mgdSetPrice,
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
      // addr1 mints a nft
      await mintGoldDustERC1155
        .connect(addr1)
        .mintNft(URI, toWei(5), amountToMint);
      // Artist approve gdMarketPlace marketplace to exchange its NFT
      await mintGoldDustERC1155
        .connect(addr1)
        .setApprovalForAll(mgdSetPrice.address, true);

      expect(await mintGoldDustERC1155.balanceOf(addr1.address, 1)).to.equal(
        amountToMint
      );

      await mgdSetPrice
        .connect(addr1)
        .list(1, toWei(priceToList), amountToList, mintGoldDustERC1155.address);

      expect(
        await mintGoldDustERC1155.balanceOf(mgdSetPrice.address, 1)
      ).to.equal(amountToList);

      await mgdSetPrice
        .connect(addr2)
        .purchaseNft(1, amountToBuy, mintGoldDustERC1155.address, {
          value: toWei(priceToBuy),
        });

      expect(
        await mintGoldDustERC1155.balanceOf(mgdSetPrice.address, 1)
      ).to.equal(amountToList - amountToBuy);

      expect(await mintGoldDustERC1155.balanceOf(addr2.address, 1)).to.equal(
        amountToBuy
      );

      // Artist approve gdMarketPlace marketplace to exchange its NFT
      await mintGoldDustERC1155
        .connect(addr2)
        .setApprovalForAll(mgdSetPrice.address, true);

      await mgdSetPrice
        .connect(addr2)
        .list(
          1,
          toWei(priceToListForSecondary),
          amountToListForSecondary,
          mintGoldDustERC1155.address
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
          await mgdSetPrice.idMarketItemsByContractByOwner(
            mintGoldDustERC1155.address,
            1
          )
        ).isSecondarySale
      ).to.equal(true);
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
      let gasPrice = await mgdSetPrice.signer.getGasPrice();
      let gasLimit = await mgdSetPrice.estimateGas.purchaseNft(
        1,
        amountToBuyForSecondary,
        mintGoldDustERC1155.address,
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
      expect(
        await mgdSetPrice
          .connect(addr3)
          .purchaseNft(
            1,
            amountToBuyForSecondary,
            mintGoldDustERC1155.address,
            {
              value: toWei(priceToBuyForSecondary),
            }
          )
      )
        .to.emit(mgdSetPrice, "NftPurchased")
        .withArgs(
          1,
          addr2.address,
          addr3.address,
          toWei(priceToBuyForSecondary),
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
          await mgdSetPrice.idMarketItemsByContractByOwner(
            mintGoldDustERC1155.address,
            1
          )
        ).sold
      ).to.be.equal(true);

      console.log(
        "VERIFICA: ",
        await mgdSetPrice.idMarketItemsByContractByOwner(
          mintGoldDustERC1155.address,
          1
        )
      );
    });

});
});
