import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect, use } from "chai";
import { Contract, ContractFactory } from "ethers";
import { ethers } from "hardhat";

const toWei = (num: any) => ethers.utils.parseEther(num.toString());
const fromWei = (num: any) => ethers.utils.formatEther(num);

describe("MGD Smart Contract", function () {
  let GDMarketplace: ContractFactory;
  let gdMarketplace: Contract;

  let deployer: SignerWithAddress;
  let addr1: SignerWithAddress;
  let addr2: SignerWithAddress;
  let addrs: SignerWithAddress[];

  const gdNFTName = "Gold Dust NFT";
  const gdNFTSymbol = "GOLDUST";

  let _feePercent = 15;
  let URI = "sample URI";

  const SALE_FEE_PERCENT: any = 15;
  const OWNER = "0x46ab5D1518688f66286aF7c6C9f5552edd050d15";
  beforeEach(async function () {
    // Get the ContractFactories and Signers here.
    GDMarketplace = await ethers.getContractFactory("GDMarketplace");
    [deployer, addr1, addr2, ...addrs] = await ethers.getSigners();

    // To deploy our contracts
    gdMarketplace = await GDMarketplace.deploy();
  });

  describe("Deployment", function () {
    it("Should contract owner be equal to deployer address", async function () {
      expect(await gdMarketplace.owner()).to.equal(deployer.address);
    });

    it("Should match the feePercent value with the value passed to the constructor", async function () {
      const _SALE_FEE_PERCENT = parseInt(
        await gdMarketplace.SALE_FEE_PERCENT()
      );
      expect(_SALE_FEE_PERCENT).to.equal(SALE_FEE_PERCENT);
    });

    it("Should track name and symbol of the gold dust collection", async function () {
      expect(await gdMarketplace.name()).to.equal(gdNFTName);
      expect(await gdMarketplace.symbol()).to.equal(gdNFTSymbol);
    });
  });

  describe("Update Percente Fee", function () {
    it("Should update the sale fee percent if the address is the owner", async () => {
      const NEW_SALE_FEE_PERCENT = 20;
      gdMarketplace
        .connect(deployer)
        .updateSaleFeePercent(toWei(NEW_SALE_FEE_PERCENT));
      const _SALE_FEE_PERCENT = parseInt(
        fromWei(await gdMarketplace.SALE_FEE_PERCENT())
      );
      expect(_SALE_FEE_PERCENT).to.equal(NEW_SALE_FEE_PERCENT);
    });

    it("Should revert if a not owner address try to update the sale fee percent", async () => {
      const NEW_SALE_FEE_PERCENT = 20;
      await expect(
        gdMarketplace
          .connect(addr1)
          .updateSaleFeePercent(toWei(NEW_SALE_FEE_PERCENT))
      ).to.be.revertedWithCustomError(gdMarketplace, "Unauthorized");
    });
  });

  describe("Minting NFTs", function () {
    it("Should track each minted NFT", async function () {
      // @info
      // Here we're not verifying if the artist was correctly whitelisted because this attribute is
      // private. It'll be tested on the mint functionality tests

      // addr1 mints a nft
      await gdMarketplace.connect(deployer).whitelist(addr1.address, true);
      await gdMarketplace.connect(addr1).mintNFT(URI);
      expect(await gdMarketplace.artistTokenCount(addr1.address)).to.equal(1);
      expect(await gdMarketplace.tokenURI(1)).to.equal(URI);
      expect(await gdMarketplace.tokenIdArtist(1)).to.equal(addr1.address);

      // addr2 mints a nft
      await gdMarketplace.connect(deployer).whitelist(addr2.address, true);
      await gdMarketplace.connect(addr2).mintNFT(URI);
      expect(await gdMarketplace.artistTokenCount(addr2.address)).to.equal(1);
      expect(await gdMarketplace.tokenURI(2)).to.equal(URI);
      expect(await gdMarketplace.tokenIdArtist(2)).to.not.equal(addr1.address);
      expect(await gdMarketplace.tokenIdArtist(2)).to.equal(addr2.address);
    });

    it("Should revert if the artist was not whitelisted", async function () {
      // addr1 mints a nft
      await expect(
        gdMarketplace.connect(addr1).mintNFT(URI)
      ).to.be.revertedWithCustomError(gdMarketplace, "Unauthorized");
    });
  });

  describe("Listing a NFT", function () {
    let price = 1;

    beforeEach(async () => {
      // MGD owner whitelist the artist
      await gdMarketplace.connect(deployer).whitelist(addr1.address, true);
      // addr1 mints a nft
      await gdMarketplace.connect(addr1).mintNFT(URI);
      // Artist approve gdMarketplace marketplace to exchange its NFT
      await gdMarketplace
        .connect(addr1)
        .setApprovalForAll(gdMarketplace.address, true);
    });

    it("Should track newly listed item, transfer NFT from seller to MGD marketplace and emmit the NFT_Listed event", async function () {
      // addr1 mints an gdMarketplace
      await expect(gdMarketplace.connect(addr1).listNFT(1, toWei(price)))
        .to.emit(gdMarketplace, "NFT_Listed")
        .withArgs(1, 1, addr1.address, toWei(price));

      // owner should be the marketplace
      expect(await gdMarketplace.ownerOf(1)).to.equal(gdMarketplace.address);

      // Get item from items mapping then check fields to ensure they are correct
      const item = await gdMarketplace.idMarketItem(1);
      expect(item.itemId).to.equal(1);
      expect(item.tokenId).to.equal(1);
      expect(item.price).to.equal(toWei(price));
      expect(item.sold).to.equal(false);
    });

    it("Should revert the transaction if an artist try to list its nft with price less than or equal zero", async function () {
      await expect(
        gdMarketplace.connect(addr1).listNFT(1, toWei(0))
      ).to.be.revertedWithCustomError(gdMarketplace, "InvalidInput");
    });

    it("Should revert the transaction if an artist not the owner of the token and try to list on the gold dust marketplace", async function () {
      expect(
        gdMarketplace.connect(addr2).listNFT(1, toWei(2))
      ).to.revertedWithCustomError(gdMarketplace, "Unauthorized");
    });
  });

  describe("Update a listed NFT", function () {
    let primaryPrice = 1;
    let newPrice = 2;

    beforeEach(async () => {
      // MGD owner whitelist the artist
      await gdMarketplace.connect(deployer).whitelist(addr1.address, true);
      // addr1 mints a NFT
      await gdMarketplace.connect(addr1).mintNFT(URI);
      // Artist approve MGD marketplace to exchange its NFT
      await gdMarketplace
        .connect(addr1)
        .setApprovalForAll(gdMarketplace.address, true);
      // Artist list its NFT on MGD marketplace
      await gdMarketplace.connect(addr1).listNFT(1, toWei(primaryPrice));
    });

    it("Should track if a listed item was correct updated and emmit the NFT_ListedItemUpdated event", async function () {
      // Get item from items mapping then check fields to ensure they are correct before update
      let item = await gdMarketplace.idMarketItem(1);
      expect(item.price).to.equal(toWei(primaryPrice));
      // addr1 mints an gdMarketplace
      expect(
        await gdMarketplace.connect(addr1).updateListedNFT(1, toWei(newPrice))
      )
        .to.emit(gdMarketplace, "NFT_ListedItemUpdated")
        .withArgs(1, 1, addr1.address, toWei(newPrice));

      // Get item from items mapping then check fields to ensure they are correct before update
      item = await gdMarketplace.idMarketItem(1);
      expect(item.price).to.equal(toWei(newPrice));
    });

    it("Should revert the transaction with InvalidInput error if an artist try to list its nft with price less than or equal zero", async function () {
      // try to list with price less than zero
      await expect(
        gdMarketplace.connect(addr1).updateListedNFT(1, toWei(0))
      ).to.be.revertedWithCustomError(gdMarketplace, "InvalidInput");
    });

    it("Should revert the transaction with an InexistItem error if an artist try to update an item that doesn't exists", async function () {
      // try to list with price less than zero
      await expect(
        gdMarketplace.connect(addr1).updateListedNFT(2, toWei(2))
      ).to.be.revertedWithCustomError(gdMarketplace, "InexistentItem");
    });

    it("Should revert the transaction with an Unauthorized error if an artist try to update an item that its not the seller", async function () {
      // try to list with price less than zero
      await expect(
        gdMarketplace.connect(addr2).updateListedNFT(1, toWei(2))
      ).to.be.revertedWithCustomError(gdMarketplace, "Unauthorized");
    });
  });

  // describe("Relist NFT", function () {
  //   let primaryPrice = 1;
  //   let newPrice = 2;

  //   beforeEach(async () => {
  //     // MGD owner whitelist the artist
  //     await gdMarketplace.connect(deployer).whitelist(addr1.address, true);
  //     // addr1 mints a NFT
  //     await gdMarketplace.connect(addr1).mintNFT(URI);
  //     // Artist approve MGD marketplace to exchange its NFT
  //     await gdMarketplace
  //       .connect(addr1)
  //       .setApprovalForAll(gdMarketplace.address, true);
  //     // Artist list its NFT on MGD marketplace
  //     await gdMarketplace.connect(addr1).listNFT(1, toWei(primaryPrice));
  //   });

  //   it("Should track newly updated item and emmit the NFT_ListedItemUpdated event", async function () {
  //     // Get item from items mapping then check fields to ensure they are correct before update
  //     let item = await gdMarketplace.idMarketItem(1);
  //     expect(item.price).to.equal(toWei(primaryPrice));
  //     // addr1 mints an gdMarketplace
  //     expect(
  //       await gdMarketplace.connect(addr1).updateListedNFT(1, toWei(newPrice))
  //     )
  //       .to.emit(gdMarketplace, "NFT_ListedItemUpdated")
  //       .withArgs(1, 1, addr1.address, toWei(newPrice));

  //     // Get item from items mapping then check fields to ensure they are correct before update
  //     item = await gdMarketplace.idMarketItem(1);
  //     expect(item.price).to.equal(toWei(newPrice));
  //   });

  //   it("Should revert the transaction if an artist try to update some of its listed nfts with price less than zero", async function () {
  //     await expect(
  //       gdMarketplace.connect(addr1).updateListedNFT(1, toWei(0))
  //     ).to.be.revertedWithCustomError(gdMarketplace, "InvalidInput");
  //   });
  // });

  describe("Purchase NFT", function () {
    let price = 20;
    let fee: any;

    beforeEach(async () => {
      fee = (_feePercent / 100) * price;
      // MGD owner whitelist the artist
      await gdMarketplace.connect(deployer).whitelist(addr1.address, true);
      // addr1 mints a NFT
      await gdMarketplace.connect(addr1).mintNFT(URI);
      // Artist approve MGD marketplace to exchange its NFT
      await gdMarketplace
        .connect(addr1)
        .setApprovalForAll(gdMarketplace.address, true);
      // Artist list its NFT on MGD marketplace
      await gdMarketplace.connect(addr1).listNFT(1, toWei(price));
    });

    it("Should buy a NFT and change the ownership of the token, verify if the item chage status for sold, verify if the seller balance increase and also if the marketplace's owner receive the fee", async function () {
      const sellerInitalEthBal = await addr1.getBalance();
      const feeAccountInitialEthBal = await deployer.getBalance();

      const totalPriceInWei = await gdMarketplace.getTotalPrice(1);
      await expect(
        gdMarketplace.connect(addr2).purchaseNFT(1, { value: totalPriceInWei })
      )
        .to.emit(gdMarketplace, "NFT_Purchased")
        .withArgs(1, addr1.address, addr2.address, toWei(price));

      const item = await gdMarketplace.idMarketItem(1);
      expect(item.sold).to.equal(true);
      // Seller should receive payment for the price of the gdnft sold.
      expect(+fromWei(await addr1.getBalance())).to.equal(
        +price + +fromWei(sellerInitalEthBal)
      );
      // feeAccount should receive fee
      expect(+fromWei(await deployer.getBalance())).to.equal(
        fee + +fromWei(feeAccountInitialEthBal)
      );
      // The buyer should now own the gdnft
      expect(await gdMarketplace.ownerOf(1)).to.equal(addr2.address);
    });

    it("should fail if the user try to buy a NFT that was already sold", async () => {
      const totalPriceInWei = await gdMarketplace.getTotalPrice(1);

      await gdMarketplace
        .connect(addr2)
        .purchaseNFT(1, { value: totalPriceInWei });

      await expect(
        gdMarketplace.connect(addr2).purchaseNFT(1, { value: totalPriceInWei })
      ).to.be.revertedWithCustomError(gdMarketplace, "ItemAlreadySold");
    });

    it("should fail if the user try to buy an itemId that doesn't exists on the marketplace", async () => {
      const totalPriceInWei = await gdMarketplace.getTotalPrice(1);

      await expect(
        gdMarketplace.connect(addr2).purchaseNFT(2, { value: totalPriceInWei })
      ).to.be.revertedWithCustomError(gdMarketplace, "InexistentItem");
    });

    it("should fail if the user try to buy an itemId without have enough funds", async () => {
      const totalPriceInWei = await gdMarketplace.getTotalPrice(1);

      const insuficientFunds = +fromWei(totalPriceInWei) - 1;
      await expect(
        gdMarketplace
          .connect(addr2)
          .purchaseNFT(1, { value: toWei(insuficientFunds) })
      ).to.be.revertedWithCustomError(gdMarketplace, "InsufficientFunds");
    });
  });
});

//   describe("Purchasing marketplace items", function () {
//     let price = 20;
//     let fee: any;
//     let totalPriceInWei: any;
//     beforeEach(async function () {
//       fee = (_feePercent / 100) * price;
//       // addr1 mints an nft
//       await gdnft.connect(addr1).mint(URI);
//       // addr1 approves marketplace to spend tokens
//       await gdnft.connect(addr1).setApprovalForAll(gdMarketplace.address, true);
//       // addr1 makes their gdnft a gdMarketplace item.
//       await gdMarketplace.connect(addr1)._listItem(gdnft.address, 1, toWei(price));
//     });
//     it("Should update item as sold, pay seller, transfer gdnft to buyer, charge fees and emit a Bought event", async function () {
//       const sellerInitalEthBal = await addr1.getBalance();
//       const feeAccountInitialEthBal = await deployer.getBalance();
//       // fetch items total price (market fees + item price)
//       totalPriceInWei = await gdMarketplace.getTotalPrice(1);
//       console.log("TOTALPRICE: ", +fromWei(totalPriceInWei) - fee);
//       // addr 2 purchases item.
//       await expect(
//         gdMarketplace.connect(addr2).purchaseItem(1, { value: totalPriceInWei })
//       )
//         .to.emit(gdMarketplace, "Bought")
//         .withArgs(
//           1,
//           gdnft.address,
//           1,
//           toWei(price),
//           addr1.address,
//           addr2.address
//         );
//       const sellerFinalEthBal = await addr1.getBalance();
//       const feeAccountFinalEthBal = await deployer.getBalance();
//       // Item should be marked as sold
//       expect((await gdMarketplace.items(1)).sold).to.equal(true);
//       // Seller should receive payment for the price of the gdnft sold.
//       expect(+fromWei(sellerFinalEthBal)).to.equal(
//         +price + +fromWei(sellerInitalEthBal)
//       );
//       // feeAccount should receive fee
//       expect(+fromWei(await deployer.getBalance())).to.equal(
//         fee + +fromWei(feeAccountInitialEthBal)
//       );
//       // The buyer should now own the gdnft
//       expect(await gdnft.ownerOf(1)).to.equal(addr2.address);
//     });
//     it("Should fail for invalid item ids, sold items and when not enough ether is paid", async function () {
//       // fails for invalid item ids
//       await expect(
//         gdMarketplace.connect(addr2).purchaseItem(2, { value: totalPriceInWei })
//       ).to.be.revertedWith("item doesn't exist");
//       await expect(
//         gdMarketplace.connect(addr2).purchaseItem(0, { value: totalPriceInWei })
//       ).to.be.revertedWith("item doesn't exist");
//       // Fails when not enough ether is paid with the transaction.
//       // In this instance, fails when buyer only sends enough ether to cover the price of the gdnft
//       // not the additional market fee.
//       await expect(
//         gdMarketplace.connect(addr2).purchaseItem(1, { value: toWei(price) })
//       ).to.be.revertedWith(
//         "not enough ether to cover item price and market fee"
//       );
//       // addr2 purchases item 1
//       await gdMarketplace.connect(addr2).purchaseItem(1, { value: totalPriceInWei });
//       // addr3 tries purchasing item 1 after its been sold
//       const addr3 = addrs[0];
//       await expect(
//         gdMarketplace.connect(addr3).purchaseItem(1, { value: totalPriceInWei })
//       ).to.be.revertedWith("item already sold");
//     });
//   });
// });
