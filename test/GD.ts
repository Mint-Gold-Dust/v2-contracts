require("dotenv").config();
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect, use } from "chai";
import { Contract, ContractFactory } from "ethers";
import { ethers } from "hardhat";

const toWei = (num: any) => ethers.utils.parseEther(num.toString());
const fromWei = (num: any) => ethers.utils.formatEther(num);

const getTotalPrice = async (price: number, feePercent: number) => {
  let totalPrice = price + (price * feePercent) / 100;
  return totalPrice;
};

describe("MGD Smart Contract", function () {
  let GDMarketplace: ContractFactory;
  let gdMarketPlace: Contract;

  let deployer: SignerWithAddress;
  let addr1: SignerWithAddress;
  let addr2: SignerWithAddress;
  let addr3: SignerWithAddress;
  let addrs: SignerWithAddress[];

  let _feePercent = 15;
  let URI = "sample URI";

  let SALE_FEE_PERCENT: number;
  const OWNER = "0x46ab5D1518688f66286aF7c6C9f5552edd050d15";

  beforeEach(async function () {
    // Get the ContractFactories and Signers here.
    GDMarketplace = await ethers.getContractFactory("GDMarketplace");
    [deployer, addr1, addr2, addr3, ...addrs] = await ethers.getSigners();

    // To deploy our contracts
    gdMarketPlace = await GDMarketplace.deploy();

    SALE_FEE_PERCENT = parseFloat(
      fromWei(await gdMarketPlace.connect(deployer).SALE_FEE_PERCENT())
    );
  });

  describe("Deployment", function () {
    it("Should match the feePercent value with the value passed to the constructor.", async function () {
      expect(
        parseInt(fromWei((await gdMarketPlace.SALE_FEE_PERCENT()).toString()))
      ).to.equal(SALE_FEE_PERCENT);
    });
  });

  describe("Update Percente Fee", function () {
    it("Should update the sale fee percent if the address is the owner.", async () => {
      const NEW_SALE_FEE_PERCENT = 20;
      gdMarketPlace
        .connect(deployer)
        .updateSaleFeePercent(toWei(NEW_SALE_FEE_PERCENT));
      const _SALE_FEE_PERCENT = parseInt(
        fromWei(await gdMarketPlace.SALE_FEE_PERCENT())
      );
      expect(_SALE_FEE_PERCENT).to.equal(NEW_SALE_FEE_PERCENT);
    });
    it("Should revert if a not owner address try to update the sale fee percent.", async () => {
      const NEW_SALE_FEE_PERCENT = 20;
      await expect(
        gdMarketPlace
          .connect(addr1)
          .updateSaleFeePercent(toWei(NEW_SALE_FEE_PERCENT))
      ).to.be.revertedWithCustomError(
        gdMarketPlace,
        "MGD_NFTMarketplace__Unauthorized"
      );
    });
  });

  describe("Minting NFTs", function () {
    it("Should track each minted NFT.", async function () {
      // addr1 mints a nft
      await gdMarketPlace.connect(deployer).whitelist(addr1.address, true);
      await gdMarketPlace.connect(addr1).mintNFT(URI);
      expect(await gdMarketPlace.tokenURI(1)).to.equal(URI);
      expect(await gdMarketPlace.tokenID_Artist(1)).to.equal(addr1.address);

      // addr2 mints a nft
      await gdMarketPlace.connect(deployer).whitelist(addr2.address, true);
      await gdMarketPlace.connect(addr2).mintNFT(URI);
      expect(await gdMarketPlace.tokenURI(2)).to.equal(URI);
      expect(await gdMarketPlace.tokenID_Artist(2)).to.not.equal(addr1.address);

      // addr1 mints another nft
      await gdMarketPlace.connect(deployer).whitelist(addr1.address, true);
      await gdMarketPlace.connect(addr1).mintNFT(URI);
      expect(await gdMarketPlace.tokenURI(3)).to.equal(URI);
      expect(await gdMarketPlace.tokenID_Artist(3)).to.equal(addr1.address);

      expect(await gdMarketPlace.balanceOf(addr1.address)).to.be.equal(2);
      expect(await gdMarketPlace.balanceOf(addr2.address)).to.be.equal(1);
    });

    it("Should revert with a MGD_NFTMarketplace__Unauthorized error if some not whitelisted artist try to mint a NFT.", async function () {
      // addr1 try to mint a NFT without be whitelisted
      await expect(
        gdMarketPlace.connect(addr1).mintNFT(URI)
      ).to.be.revertedWithCustomError(
        gdMarketPlace,
        "MGD_NFTMarketplace__Unauthorized"
      );
    });
  });

  describe("Listing a NFT", function () {
    let price = 1;

    beforeEach(async () => {
      // MGD owner whitelist the artist
      await gdMarketPlace.connect(deployer).whitelist(addr1.address, true);
      // addr1 mints a nft
      await gdMarketPlace.connect(addr1).mintNFT(URI);
      // Artist approve gdMarketPlace marketplace to exchange its NFT
      await gdMarketPlace
        .connect(addr1)
        .setApprovalForAll(gdMarketPlace.address, true);
    });

    it("Should track newly listed item, transfer NFT from seller to MGD marketplace and emmit the NFT_Listed event.", async function () {
      // addr1 list the NFT with tokenID on gdMarketplace
      await expect(gdMarketPlace.connect(addr1).listNFT(1, toWei(price)))
        .to.emit(gdMarketPlace, "NFT_Listed")
        .withArgs(1, addr1.address, toWei(price));

      // owner should be the marketplace
      expect(await gdMarketPlace.ownerOf(1)).to.equal(gdMarketPlace.address);

      // Get item from items mapping then check fields to ensure they are correct
      const userNFTs = await gdMarketPlace.fetchUserNFTs(addr1.address);
      expect(userNFTs[0].tokenId).to.equal(1);
      expect(userNFTs[0].price).to.equal(toWei(price));
      expect(userNFTs[0].sold).to.equal(false);
    });

    it("Should revert the transaction if an artist try to list its nft with price less than or equal zero.", async function () {
      await expect(
        gdMarketPlace.connect(addr1).listNFT(1, 0)
      ).to.be.revertedWithCustomError(
        gdMarketPlace,
        "MGD_NFTMarketplace__InvalidInput"
      );
    });

    it("Should revert the transaction if an artist not the owner of the token and try to list on the gold dust marketplace.", async function () {
      expect(
        gdMarketPlace.connect(addr2).listNFT(1, toWei(price))
      ).to.revertedWithCustomError(
        gdMarketPlace,
        "MGD_NFTMarketplace__Unauthorized"
      );
    });
  });

  describe("Update a listed NFT", function () {
    let primaryPrice = 1;
    let newPrice = 2;

    beforeEach(async () => {
      // MGD owner whitelist the artist
      await gdMarketPlace.connect(deployer).whitelist(addr1.address, true);
      // addr1 mints a NFT
      await gdMarketPlace.connect(addr1).mintNFT(URI);
      // Artist approve MGD marketplace to exchange its NFT
      await gdMarketPlace
        .connect(addr1)
        .setApprovalForAll(gdMarketPlace.address, true);
      // Artist list its NFT on MGD marketplace
      await gdMarketPlace.connect(addr1).listNFT(1, toWei(primaryPrice));
    });

    it("Should track if a listed item was correct updated and emmit the NFT_ListedItemUpdated event. We should remember that in this moment the owner of the NFT is the marketplace.", async function () {
      // Get item from items mapping then check fields to ensure they are correct before update
      let userNFTs = await gdMarketPlace.fetchUserNFTs(addr1.address);
      expect(userNFTs[0].price).to.equal(toWei(primaryPrice));
      // addr1 mints an gdMarketPlace
      expect(
        await gdMarketPlace.connect(addr1).updateListedNFT(1, toWei(newPrice))
      )
        .to.emit(gdMarketPlace, "NFT_ListedItemUpdated")
        .withArgs(1, addr1.address, toWei(newPrice));

      // Get item from items mapping then check fields to ensure they are correct
      userNFTs = await gdMarketPlace.fetchUserNFTs(addr1.address);
      // Get item from items mapping then check fields to ensure they are correct before update
      expect(userNFTs[0].price).to.equal(toWei(newPrice));
    });

    it("Should revert the transaction with InvalidInput error if the marketplace owner try to update some listed nft with price less than or equal zero.", async function () {
      // try to list with price less than zero
      await expect(
        gdMarketPlace.connect(addr1).updateListedNFT(1, toWei(0))
      ).to.be.revertedWithCustomError(
        gdMarketPlace,
        "MGD_NFTMarketplace__InvalidInput"
      );
    });

    it("Should revert the transaction with an InexistItem error if the marketplace owner try to update an item that doesn't exists.", async function () {
      // try to list with price less than zero
      await expect(
        gdMarketPlace.connect(addr1).updateListedNFT(2, toWei(2))
      ).to.be.revertedWithCustomError(gdMarketPlace, "InexistentItem");
    });

    it("Should revert the transaction with an MGD_NFTMarketplace__Unauthorized error if some address that is not the seller try to update the NFT listed.", async function () {
      // addr1 mints another NFT
      await gdMarketPlace.connect(addr1).mintNFT(URI);

      // try to list with price less than zero
      await expect(
        gdMarketPlace.connect(addr2).updateListedNFT(1, toWei(newPrice))
      ).to.be.revertedWithCustomError(
        gdMarketPlace,
        "MGD_NFTMarketplace__Unauthorized"
      );
    });

    it("Should revert the transaction with an NFTNotListedForSale error if some user try to update an item that its not on sale.", async function () {
      // addr2 buy the NFT listed
      await expect(
        gdMarketPlace.connect(addr2).buyNFT(1, { value: toWei(primaryPrice) })
      )
        .to.emit(gdMarketPlace, "NFT_Purchased")
        .withArgs(1, addr1.address, addr2.address, toWei(primaryPrice));

      await expect(
        gdMarketPlace.connect(addr1).updateListedNFT(1, toWei(newPrice))
      ).to.be.revertedWithCustomError(gdMarketPlace, "NFTNotListedForSale");
    });
  });

  describe("Relist NFT", function () {
    let primaryPrice = 1;
    let newPrice = 2;

    beforeEach(async () => {
      // MGD owner whitelist the artist
      await gdMarketPlace.connect(deployer).whitelist(addr1.address, true);
      // addr1 mints a NFT
      await gdMarketPlace.connect(addr1).mintNFT(URI);
      // Artist approve MGD marketplace to exchange its NFT
      await gdMarketPlace
        .connect(addr1)
        .setApprovalForAll(gdMarketPlace.address, true);
      // Artist list its NFT on MGD marketplace
      await gdMarketPlace.connect(addr1).listNFT(1, toWei(primaryPrice));

      // Addr2 buy the NFT listed by the addr1
      await expect(
        gdMarketPlace.connect(addr2).buyNFT(1, { value: toWei(primaryPrice) })
      )
        .to.emit(gdMarketPlace, "NFT_Purchased")
        .withArgs(1, addr1.address, addr2.address, toWei(primaryPrice));
    });

    it("Should track a relist of some purchased NFT and emmit the NFT_Relisted event.", async function () {
      // addr2 relist a purchased NFT
      expect(await gdMarketPlace.connect(addr2).reListNFT(1, toWei(newPrice)))
        .to.emit(gdMarketPlace, "NFT_Relisted")
        .withArgs(1, addr1.address, toWei(newPrice));
    });

    it("Should revert with a MGD_NFTMarketplace__Unauthorized error if an address that is not the NFT's owner try to relist it on the marketplace.", async function () {
      // addr2 relist a purchased NFT
      await expect(
        gdMarketPlace.connect(addr1).reListNFT(1, toWei(newPrice))
      ).to.be.revertedWithCustomError(
        gdMarketPlace,
        "MGD_NFTMarketplace__Unauthorized"
      );
    });

    it("Should revert the transaction if an artist try to list its nft with price less than or equal zero.", async function () {
      await expect(
        gdMarketPlace.connect(addr2).reListNFT(1, toWei(0))
      ).to.be.revertedWithCustomError(
        gdMarketPlace,
        "MGD_NFTMarketplace__InvalidInput"
      );
    });
  });

  describe("Delist NFT", function () {
    let primaryPrice = 1;

    beforeEach(async () => {
      // MGD owner whitelist the artist
      await gdMarketPlace.connect(deployer).whitelist(addr1.address, true);
      // addr1 mints a NFT
      await gdMarketPlace.connect(addr1).mintNFT(URI);
      // Artist approve MGD marketplace to exchange its NFT
      await gdMarketPlace
        .connect(addr1)
        .setApprovalForAll(gdMarketPlace.address, true);
      // Artist list its NFT on MGD marketplace
      await gdMarketPlace.connect(addr1).listNFT(1, toWei(primaryPrice));
    });

    it("Should delist a NFT from marketplace and emmit the NFT_RemovedFromMarketplace event.", async function () {
      // the market item should be not sold
      expect(
        (await gdMarketPlace.connect(addr1).id_marketItem(1)).sold
      ).to.be.equal(false);
      // addr2 relist a purchased NFT
      expect(await gdMarketPlace.connect(addr1).delistNFT(1))
        .to.emit(gdMarketPlace, "NFT_RemovedFromMarketplace")
        .withArgs(1, addr1.address);
      // the market item should be sold
      expect(
        (await gdMarketPlace.connect(addr1).id_marketItem(1)).sold
      ).to.be.equal(true);
    });

    it("Should revert with a MGD_NFTMarketplace__Unauthorized error if some address that is not the item seller try to delist its NFT from marketplace.", async function () {
      // the market item should be not sold
      expect(
        (await gdMarketPlace.connect(addr1).id_marketItem(1)).sold
      ).to.be.equal(false);
      // addr2 relist a purchased NFT
      await expect(
        gdMarketPlace.connect(addr2).delistNFT(1)
      ).to.be.revertedWithCustomError(
        gdMarketPlace,
        "MGD_NFTMarketplace__Unauthorized"
      );
      // the market item should still be not sold
      expect(
        (await gdMarketPlace.connect(addr1).id_marketItem(1)).sold
      ).to.be.equal(false);
    });
  });

  describe("Purchase NFT", function () {
    let price = 20;

    beforeEach(async () => {
      // MGD owner whitelist the artist
      await gdMarketPlace.connect(deployer).whitelist(addr1.address, true);
      // addr1 mints a NFT
      await gdMarketPlace.connect(addr1).mintNFT(URI);
      // Artist approve MGD marketplace to exchange its NFT
      await gdMarketPlace
        .connect(addr1)
        .setApprovalForAll(gdMarketPlace.address, true);
      // Artist list its NFT on MGD marketplace
      await gdMarketPlace.connect(addr1).listNFT(1, toWei(price));
    });

    it("Should buy a NFT and change the ownership of the token, verify if the item chage status for sold, verify if the seller balance increase and also if the marketplace's owner receive the fee.", async function () {
      const sellerInitalEthBal = await addr1.getBalance();
      const feeAccountInitialEthBal = await deployer.getBalance();

      await expect(
        gdMarketPlace.connect(addr2).buyNFT(1, { value: toWei(price) })
      )
        .to.emit(gdMarketPlace, "NFT_Purchased")
        .withArgs(1, addr1.address, addr2.address, toWei(price));

      const item = await gdMarketPlace.id_marketItem(1);
      expect(item.sold).to.equal(true);
      // Seller should receive payment for the price of the gdnft sold.
      expect(+fromWei(await addr1.getBalance())).to.equal(
        +price + +fromWei(sellerInitalEthBal) - (price * SALE_FEE_PERCENT) / 100
      );
      // The feeAccount should receive fee
      expect(+fromWei(await deployer.getBalance())).to.equal(
        (price * SALE_FEE_PERCENT) / 100 + +fromWei(feeAccountInitialEthBal)
      );
      // The buyer should now own the NFT
      expect(await gdMarketPlace.ownerOf(1)).to.equal(addr2.address);
    });

    it("Should revert with NFTNotListedForSale error if the user try to buy a NFT that was already sold.", async () => {
      await expect(
        gdMarketPlace.connect(addr2).buyNFT(1, { value: toWei(price) })
      )
        .to.emit(gdMarketPlace, "NFT_Purchased")
        .withArgs(1, addr1.address, addr2.address, toWei(price));

      await expect(
        gdMarketPlace.connect(addr3).buyNFT(1, { value: toWei(price) })
      ).to.be.revertedWithCustomError(gdMarketPlace, "NFTNotListedForSale");
    });

    it("Should revert with an InexistentItem error if the user try to buy an itemId that doesn't exists on the marketplace.", async () => {
      await expect(
        gdMarketPlace.connect(addr3).buyNFT(2, { value: toWei(price) })
      ).to.be.revertedWithCustomError(gdMarketPlace, "InexistentItem");
    });

    it("Should revert with MGD_NFTMarketplace__IncorrectAmountSent if the user try to buy an itemId with an amount greater than the item's price.", async () => {
      await expect(
        gdMarketPlace.connect(addr3).buyNFT(1, { value: toWei(price + 10) })
      ).to.be.revertedWithCustomError(
        gdMarketPlace,
        "MGD_NFTMarketplace__IncorrectAmountSent"
      );
    });

    it("Should revert with MGD_NFTMarketplace__IncorrectAmountSent if the user try to buy an itemId with an amount less than the item's price.", async () => {
      await expect(
        gdMarketPlace.connect(addr3).buyNFT(1, { value: toWei(price - 10) })
      ).to.be.revertedWithCustomError(
        gdMarketPlace,
        "MGD_NFTMarketplace__IncorrectAmountSent"
      );
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
