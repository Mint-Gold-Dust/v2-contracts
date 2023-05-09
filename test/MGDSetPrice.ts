require("dotenv").config();
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect, use } from "chai";
import { Contract, ContractFactory } from "ethers";
import { ethers } from "hardhat";

const toWei = (num: any) => ethers.utils.parseEther(num.toString());
const fromWei = (num: any) => ethers.utils.formatEther(num);

describe("\nMGDSetPrice.sol Smart Contract \n___________________________________________________\n \nThis smart contract is responsible by all functionalities related with the fixed price market. \n", function () {
  let MintGoldDustERC721: ContractFactory;
  let mintGoldDustERC721: Contract;

  let MGDCompany: ContractFactory;
  let mgdCompany: Contract;

  let MGDSetPrice: ContractFactory;
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

  let primary_sale_fee_percent = 15;
  let secondary_sale_fee_percent = 5;
  let collector_fee = 3;
  let max_royalty = 20;
  let royalty = 5;

  beforeEach(async function () {
    MGDCompany = await ethers.getContractFactory("MGDCompany");
    MintGoldDustERC721 = await ethers.getContractFactory("MintGoldDustERC721");
    MGDSetPrice = await ethers.getContractFactory("MGDSetPrice");

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

    mgdSetPrice = await upgrades.deployProxy(
      MGDSetPrice,
      [mgdCompany.address, mintGoldDustERC721.address],
      { initializer: "initialize" }
    );
    await mgdSetPrice.deployed();

    await mgdCompany.connect(deployer).setValidator(deployer.address, true);
  });

  describe("\n--------------- Tests related witn the list NFT functionality ---------------\n", function () {
    let price = 1;

    beforeEach(async () => {
      // MGD owner whitelist the artist
      await mgdCompany.connect(deployer).whitelist(addr1.address, true);
      // addr1 mints a nft
      await mintGoldDustERC721.connect(addr1).mintNft(URI, toWei(5));
      // Artist approve gdMarketPlace marketplace to exchange its NFT
      await mintGoldDustERC721
        .connect(addr1)
        .setApprovalForAll(mgdSetPrice.address, true);
    });

    it("Should track newly listed item, transfer NFT from seller to MGD marketplace and emit the NftListed event.", async function () {
      console.log(
        "\t ARTIST BALANCE BEFORE LIST: ",
        parseFloat(parseFloat(fromWei(await addr1.getBalance())).toFixed(5))
      );
      let artistBalanceBefore = await addr1.getBalance();
      // addr1 list the NFT with tokenID on gdMarketplace
      await expect(mgdSetPrice.connect(addr1).list(1, toWei(price)))
        .to.emit(mgdSetPrice, "NftListedToSetPrice")
        .withArgs(1, addr1.address, toWei(price));

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
      expect(await mintGoldDustERC721.ownerOf(1)).to.equal(mgdSetPrice.address);
    });

    it("Should secondary sale keep false if an artist list, delist and list again an item.", async function () {
      await mgdSetPrice.connect(addr1).list(1, toWei(price));
      await mgdSetPrice.connect(addr1).delistNft(1);
      await mgdSetPrice.connect(addr1).list(1, toWei(price));

      expect(
        (await mgdSetPrice.connect(addr1).idMarketItem(1)).isSecondarySale
      ).to.be.equal(false);
    });

    it("Should revert the transaction if an artist tries to list its nft with price less than or equal zero.", async function () {
      await expect(
        mgdSetPrice.connect(addr1).list(1, 0)
      ).to.be.revertedWithCustomError(
        mgdSetPrice,
        "MGDMarketplaceInvalidInput"
      );
    });

    it("Should revert the transaction if an artist is not the owner of the token and try to list on the gold dust marketplace.", async function () {
      expect(
        mgdSetPrice.connect(addr2).list(1, toWei(price))
      ).to.revertedWithCustomError(mgdSetPrice, "MGDMarketplaceUnauthorized");
    });
  });

  describe("\n--------------- Tests related with the update a listed NFT functionality ---------------\n", function () {
    let primaryPrice = 1;
    let newPrice = 2;

    beforeEach(async () => {
      // MGD owner whitelist the artist
      await mgdCompany.connect(deployer).whitelist(addr1.address, true);
      // addr1 mints a nft
      await mintGoldDustERC721.connect(addr1).mintNft(URI, toWei(5));
      // Artist approve gdMarketPlace marketplace to exchange its NFT
      await mintGoldDustERC721
        .connect(addr1)
        .setApprovalForAll(mgdSetPrice.address, true);
      // Artist list its NFT on MGD marketplace
      await mgdSetPrice.connect(addr1).list(1, toWei(primaryPrice));
    });

    it("Should track if a listed item was correctly updated and emit the NftListedItemUpdated event. We should remember that in this moment the owner of the NFT is the marketplace.", async function () {
      console.log(
        "\t ARTIST BALANCE BEFORE UPDATE A LISTED ITEM (ETH): ",
        parseFloat(fromWei(await addr1.getBalance()))
      );
      let artistBalanceBefore = await addr1.getBalance();

      // Get item from items mapping then check fields to ensure they are correct before update
      let marketItem = await mgdSetPrice.idMarketItem(1);
      expect(marketItem.price).to.equal(toWei(primaryPrice));
      // addr1 mints an gdMarketPlace
      expect(
        await mgdSetPrice.connect(addr1).updateListedNft(1, toWei(newPrice))
      )
        .to.emit(mgdSetPrice, "NftListedItemUpdated")
        .withArgs(1, addr1.address, toWei(newPrice));

      console.log(
        "\t ARTIST BALANCE AFTER UPDATE A LISTED ITEM (ETH): ",
        parseFloat(fromWei(await addr1.getBalance()))
      );

      console.log(
        "\t \tSo the gas estimation was more less (USD):",
        parseFloat(
          fromWei(
            ethers.BigNumber.from(artistBalanceBefore).sub(
              await addr1.getBalance()
            )
          )
        ) * 2500
      );

      // Get item from items mapping then check fields to ensure they are correct
      marketItem = await mgdSetPrice.idMarketItem(1);

      // Get item from items mapping then check fields to ensure they are correct before update
      expect(marketItem.price).to.equal(toWei(newPrice));

      // Just confirm that the owner is the marketplace
      expect(await mintGoldDustERC721.ownerOf(1)).to.equal(mgdSetPrice.address);
    });

    it("Should revert the transaction with InvalidInput error if the marketplace owner tries to update some listed nft with price less than or equal zero.", async function () {
      // try to list with price less than zero
      await expect(
        mgdSetPrice.connect(addr1).updateListedNft(1, toWei(0))
      ).to.be.revertedWithCustomError(
        mgdSetPrice,
        "MGDMarketplaceInvalidInput"
      );
    });

    it("Should revert the transaction with an GDNFTMarketplace__Unauthorized error if some address that is not the seller try to update the NFT listed.", async function () {
      // try to list with price less than zero
      await expect(
        mgdSetPrice.connect(addr2).updateListedNft(1, toWei(newPrice))
      ).to.be.revertedWithCustomError(
        mgdSetPrice,
        "MGDMarketplaceUnauthorized"
      );
    });

    it("Should revert the transaction with an MGDMarketplaceItemIsNotListed error if some user tries to update an item that is not on sale.", async function () {
      await mgdSetPrice
        .connect(addr2)
        .purchaseNft(1, { value: toWei(primaryPrice) });
      await expect(
        mgdSetPrice.connect(addr2).updateListedNft(1, toWei(newPrice))
      ).to.be.revertedWithCustomError(
        mgdSetPrice,
        "MGDMarketplaceItemIsNotListed"
      );
    });
  });

  describe("\n--------------- Tests related with delist NFT functionality ---------------", function () {
    let primaryPrice = 1;

    beforeEach(async () => {
      // MGD owner whitelist the artist
      await mgdCompany.connect(deployer).whitelist(addr1.address, true);
      // addr1 mints a nft
      await mintGoldDustERC721.connect(addr1).mintNft(URI, toWei(5));
      // Artist approve gdMarketPlace marketplace to exchange its NFT
      await mintGoldDustERC721
        .connect(addr1)
        .setApprovalForAll(mgdSetPrice.address, true);
      // Artist list its NFT on MGD marketplace
      await mgdSetPrice.connect(addr1).list(1, toWei(primaryPrice));
    });

    it("Should delist a NFT from the marketplace and emit the NFTRemovedFromMarketplace event.", async function () {
      console.log(
        "\t ARTIST BALANCE BEFORE DELIST (ETH): ",
        parseFloat(fromWei(await addr1.getBalance()))
      );
      let artistBalanceBefore = await addr1.getBalance();

      expect(
        (await mgdSetPrice.connect(addr1).idMarketItem(1)).sold
      ).to.be.equal(false);
      // addr2 relist a purchased NFT
      expect(await mgdSetPrice.connect(addr1).delistNft(1))
        .to.emit(mgdSetPrice, "NFTRemovedFromMarketplace")
        .withArgs(1, addr1.address);
      // the market item should be sold
      expect(
        (await mgdSetPrice.connect(addr1).idMarketItem(1)).sold
      ).to.be.equal(true);

      console.log(
        "\t ARTIST BALANCE AFTER DELIST (ETH): ",
        parseFloat(fromWei(await addr1.getBalance()))
      );

      console.log(
        "\t \tSo the gas estimation was more less (USD):",
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
        (await mgdSetPrice.connect(addr1).idMarketItem(1)).sold
      ).to.be.equal(false);
      // addr2 relist a purchased NFT
      await expect(
        mgdSetPrice.connect(addr2).delistNft(1)
      ).to.be.revertedWithCustomError(
        mgdSetPrice,
        "MGDMarketplaceUnauthorized"
      );
      // the market item should still be not sold
      expect(
        (await mgdSetPrice.connect(addr1).idMarketItem(1)).sold
      ).to.be.equal(false);
    });
  });

  describe("\n--------------- Purchase NFT on primary market ---------------\n", function () {
    let price = 20;
    // Calculate the fee and balance values based on the price
    let fee: number;
    let balance: number;
    let collFee: number;
    let primarySaleFee: number;

    beforeEach(async () => {
      // MGD owner whitelist the artist
      await mgdCompany.connect(deployer).whitelist(addr1.address, true);
      // addr1 mints a NFT
      await mintGoldDustERC721.connect(addr1).mintNft(URI, toWei(royalty));
      // Artist approve MGD marketplace to exchange its NFT
      await mintGoldDustERC721
        .connect(addr1)
        .setApprovalForAll(mgdSetPrice.address, true);
      // Artist list its NFT on MGD marketplace
      await mgdSetPrice.connect(addr1).list(1, toWei(price));

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

      // verify if the flag for secondary is false
      expect(
        (await mgdSetPrice.connect(addr1).idMarketItem(1)).isSecondarySale
      ).to.be.equal(false);

      let gasPrice = await mgdSetPrice.signer.getGasPrice();
      let gasLimit = await mgdSetPrice.estimateGas.purchaseNft(1, {
        value: toWei(price),
      });

      console.log("\t GAS PRICE: ", gasPrice);
      console.log("\t GAS LIMIT: ", gasLimit);

      console.log(
        "\t\t TOTAL GAS ESTIMATION (USD): ",
        (+ethers.BigNumber.from(gasPrice).mul(gasLimit) / (100 * 10 ** 18)) *
          2500
      );

      console.log("\n\t\t ITEM PRICE: ", price);
      console.log("\t\t Primary Market fee: ", fee);
      console.log("\t\t Collector fee: ", collFee);
      console.log("\t\t Marketplace owner fee: ", primarySaleFee);
      console.log("\t\t Balance to seller: ", balance);

      let addr2BalanceBefore = await addr2.getBalance();
      // execute the buyNft function
      expect(
        await mgdSetPrice.connect(addr2).purchaseNft(1, { value: toWei(price) })
      )
        .to.emit(mgdSetPrice, "NftPurchasedPrimaryMarket")
        .withArgs(
          1,
          addr1.address,
          addr2.address,
          toWei(price),
          toWei(fee),
          toWei(collector_fee),
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
        (await mgdSetPrice.connect(addr1).idMarketItem(1)).isSecondarySale
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
      expect((await mgdSetPrice.idMarketItem(1)).sold).to.be.equal(true);

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

    it("Should revert with MGDMarketplaceItemIsNotListed error if the user tries to buy a NFT that was already sold.", async () => {
      await mgdSetPrice.connect(addr2).purchaseNft(1, { value: toWei(price) });
      await expect(
        mgdSetPrice.connect(addr3).purchaseNft(1, { value: toWei(price) })
      ).to.be.revertedWithCustomError(
        mgdSetPrice,
        "MGDMarketplaceItemIsNotListed"
      );
    });

    it("Should revert with MGDMarketplaceIncorrectAmountSent if the user tries to buy an itemId with an amount greater than the item's price.", async () => {
      await expect(
        mgdSetPrice.connect(addr3).purchaseNft(1, { value: toWei(price + 10) })
      ).to.be.revertedWithCustomError(
        mgdSetPrice,
        "MGDMarketplaceIncorrectAmountSent"
      );
    });

    it("Should revert with MGDMarketplaceIncorrectAmountSent if the user tries to buy an itemId with an amount less than the item's price.", async () => {
      await expect(
        mgdSetPrice.connect(addr3).purchaseNft(1, { value: toWei(price - 10) })
      ).to.be.revertedWithCustomError(
        mgdSetPrice,
        "MGDMarketplaceIncorrectAmountSent"
      );
    });
  });

  describe("\n--------------- Purchase NFT on secondary market ---------------\n", function () {
    let price = 20;

    let royaltyFee: number;
    let balance: number;
    let secondarySaleFee: number;

    beforeEach(async () => {
      // MGD owner whitelist the artist
      await mgdCompany.connect(deployer).whitelist(addr1.address, true);
      // addr1 mints a NFT
      await mintGoldDustERC721.connect(addr1).mintNft(URI, toWei(royalty));
      // Artist approve MGD marketplace to exchange its NFT
      await mintGoldDustERC721
        .connect(addr1)
        .setApprovalForAll(mgdSetPrice.address, true);
      // Artist list its NFT on MGD marketplace
      await mgdSetPrice.connect(addr1).list(1, toWei(price));

      await mgdSetPrice.connect(addr2).purchaseNft(1, { value: toWei(price) });

      await mgdSetPrice.connect(addr2).list(1, toWei(price));

      secondarySaleFee = (price * secondary_sale_fee_percent) / 100;
      royaltyFee = (price * royalty) / 100;
      balance = price - (secondarySaleFee + royaltyFee);
    });

    it("Should simulate a secondary sale that transfer an NFT to the buyer, verify if the item changed status for sale, verify if the seller balance increases and also if the marketplace's owner receives the fee and verify if the artist creator have received the royalty.", async function () {
      // verify if the isSecondarySale sale attribute is true
      expect((await mgdSetPrice.idMarketItem(1)).isSecondarySale).to.equal(
        true
      );

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

      let gasPrice = await mgdSetPrice.signer.getGasPrice();
      let gasLimit = await mgdSetPrice.estimateGas.purchaseNft(1, {
        value: toWei(price),
      });

      console.log("\t GAS PRICE: ", gasPrice);
      console.log("\t GAS LIMIT: ", gasLimit);

      console.log(
        "\t\t TOTAL GAS ESTIMATION (USD): ",
        (+ethers.BigNumber.from(gasPrice).mul(gasLimit) / (100 * 10 ** 18)) *
          2500
      );

      // execute the buyNft function
      expect(
        await mgdSetPrice.connect(addr3).purchaseNft(1, { value: toWei(price) })
      )
        .to.emit(mgdSetPrice, "NftPurchased")
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
        .sub(toWei(price))
        .sub(ethers.BigNumber.from(gasPrice).mul(gasLimit));

      expect(
        parseFloat(parseFloat(fromWei(await addr3.getBalance())).toFixed(3))
      ).to.be.equal(
        parseFloat(parseFloat(fromWei(addr3ShouldBeAfter)).toFixed(3))
      );

      // expect item sold to be true
      expect((await mgdSetPrice.idMarketItem(1)).sold).to.be.equal(true);
    });
  });
});
