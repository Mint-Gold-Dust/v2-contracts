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

  let saleFeePercent: number;
  const OWNER = "0x46ab5D1518688f66286aF7c6C9f5552edd050d15";

  beforeEach(async function () {
    // Get the ContractFactories and Signers here.
    GDMarketplace = await ethers.getContractFactory("GDMarketplace");
    [deployer, addr1, addr2, addr3, ...addrs] = await ethers.getSigners();

    // To deploy our contracts
    gdMarketPlace = await GDMarketplace.deploy();

    saleFeePercent = parseFloat(
      fromWei(await gdMarketPlace.connect(deployer).saleFeePercent())
    );
  });

  describe("Deployment", function () {
    it("Should match the feePercent value with the value passed to the constructor.", async function () {
      expect(
        parseInt(fromWei((await gdMarketPlace.saleFeePercent()).toString()))
      ).to.equal(saleFeePercent);
    });
  });

  describe("Update Percent Fee", function () {
    it("Should update the sale fee percent if the address is the owner.", async () => {
      const NEW_saleFeePercent = 20;
      gdMarketPlace
        .connect(deployer)
        .updateSaleFeePercent(toWei(NEW_saleFeePercent));
      const _saleFeePercent = parseInt(
        fromWei(await gdMarketPlace.saleFeePercent())
      );
      expect(_saleFeePercent).to.equal(NEW_saleFeePercent);
    });
    it("Should revert if a not owner address try to update the sale fee percent.", async () => {
      const NEW_saleFeePercent = 20;
      await expect(
        gdMarketPlace
          .connect(addr1)
          .updateSaleFeePercent(toWei(NEW_saleFeePercent))
      ).to.be.revertedWithCustomError(
        gdMarketPlace,
        "GDNFTMarketplaceUnauthorized"
      );
    });
  });

  describe("Minting NFTs", function () {
    it("Should track each minted NFT.", async function () {
      // addr1 mints a nft
      await gdMarketPlace.connect(deployer).whitelist(addr1.address, true);
      expect(await gdMarketPlace.connect(addr1).mintNFT(URI))
        .to.emit(gdMarketPlace, "NFTMinted")
        .withArgs(1, addr1.address);
      expect(await gdMarketPlace.tokenURI(1)).to.equal(URI);
      expect(await gdMarketPlace.tokenIdArtist(1)).to.equal(addr1.address);

      // addr2 mints a nft
      await gdMarketPlace.connect(deployer).whitelist(addr2.address, true);
      expect(await gdMarketPlace.connect(addr2).mintNFT(URI))
        .to.emit(gdMarketPlace, "NFTMinted")
        .withArgs(1, addr1.address);
      expect(await gdMarketPlace.tokenURI(2)).to.equal(URI);
      expect(await gdMarketPlace.tokenIdArtist(2)).to.not.equal(addr1.address);

      // addr1 mints another nft
      await gdMarketPlace.connect(deployer).whitelist(addr1.address, true);
      expect(await gdMarketPlace.connect(addr1).mintNFT(URI))
        .to.emit(gdMarketPlace, "NFTMinted")
        .withArgs(1, addr1.address);
      expect(await gdMarketPlace.tokenURI(3)).to.equal(URI);
      expect(await gdMarketPlace.tokenIdArtist(3)).to.equal(addr1.address);

      expect(await gdMarketPlace.balanceOf(addr1.address)).to.be.equal(2);
      expect(await gdMarketPlace.balanceOf(addr2.address)).to.be.equal(1);
    });

    it("Should revert with a GDNFTMarketplaceUnauthorized error if some not whitelisted artist try to mint a NFT.", async function () {
      // addr1 try to mint a NFT without be whitelisted
      await expect(
        gdMarketPlace.connect(addr1).mintNFT(URI)
      ).to.be.revertedWithCustomError(
        gdMarketPlace,
        "GDNFTMarketplaceUnauthorized"
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

    it("Should track newly listed item, transfer NFT from seller to MGD marketplace and emit the NFTListed event.", async function () {
      // addr1 list the NFT with tokenID on gdMarketplace
      await expect(gdMarketPlace.connect(addr1).listNFT(1, toWei(price)))
        .to.emit(gdMarketPlace, "NFTListed")
        .withArgs(1, addr1.address, toWei(price));

      // owner should be the marketplace
      expect(await gdMarketPlace.ownerOf(1)).to.equal(gdMarketPlace.address);

      // Get item from items mapping then check fields to ensure they are correct
      const userNFTs = await gdMarketPlace.fetchUserListedNFTs(addr1.address);
      expect(userNFTs[0].tokenId).to.equal(1);
      expect(userNFTs[0].price).to.equal(toWei(price));
      expect(userNFTs[0].sold).to.equal(false);
    });

    it("Should revert the transaction if an artist tries to list its nft with price less than or equal zero.", async function () {
      await expect(
        gdMarketPlace.connect(addr1).listNFT(1, 0)
      ).to.be.revertedWithCustomError(
        gdMarketPlace,
        "GDNFTMarketplaceInvalidInput"
      );
    });

    it("Should revert the transaction if an artist is not the owner of the token and try to list on the gold dust marketplace.", async function () {
      expect(
        gdMarketPlace.connect(addr2).listNFT(1, toWei(price))
      ).to.revertedWithCustomError(
        gdMarketPlace,
        "GDNFTMarketplaceUnauthorized"
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

    it("Should track if a listed item was correctly updated and emit the NFTListedItemUpdated event. We should remember that in this moment the owner of the NFT is the marketplace.", async function () {
      // Get item from items mapping then check fields to ensure they are correct before update
      let userNFTs = await gdMarketPlace.fetchUserListedNFTs(addr1.address);
      expect(userNFTs[0].price).to.equal(toWei(primaryPrice));
      // addr1 mints an gdMarketPlace
      expect(
        await gdMarketPlace.connect(addr1).updateListedNFT(1, toWei(newPrice))
      )
        .to.emit(gdMarketPlace, "NFTListedItemUpdated")
        .withArgs(1, addr1.address, toWei(newPrice));

      // Get item from items mapping then check fields to ensure they are correct
      userNFTs = await gdMarketPlace.fetchUserListedNFTs(addr1.address);
      // Get item from items mapping then check fields to ensure they are correct before update
      expect(userNFTs[0].price).to.equal(toWei(newPrice));
    });

    it("Should revert the transaction with InvalidInput error if the marketplace owner tries to update some listed nft with price less than or equal zero.", async function () {
      // try to list with price less than zero
      await expect(
        gdMarketPlace.connect(addr1).updateListedNFT(1, toWei(0))
      ).to.be.revertedWithCustomError(
        gdMarketPlace,
        "GDNFTMarketplaceInvalidInput"
      );
    });

    it("Should revert the transaction with an InexistItem error if the marketplace owner tries to update an item that doesn't exists.", async function () {
      // try to list with price less than zero
      await expect(
        gdMarketPlace.connect(addr1).updateListedNFT(2, toWei(2))
      ).to.be.revertedWithCustomError(
        gdMarketPlace,
        "GDNFTMarketplaceInexistentItem"
      );
    });

    it("Should revert the transaction with an GDNFTMarketplaceUnauthorized error if some address that is not the seller try to update the NFT listed.", async function () {
      // addr1 mints another NFT
      await gdMarketPlace.connect(addr1).mintNFT(URI);

      // try to list with price less than zero
      await expect(
        gdMarketPlace.connect(addr2).updateListedNFT(1, toWei(newPrice))
      ).to.be.revertedWithCustomError(
        gdMarketPlace,
        "GDNFTMarketplaceUnauthorized"
      );
    });

    it("Should revert the transaction with an NFTNotListedForSale error if some user tries to update an item that is not on sale.", async function () {
      // addr2 buy the NFT listed
      await expect(
        gdMarketPlace.connect(addr2).buyNFT(1, { value: toWei(primaryPrice) })
      )
        .to.emit(gdMarketPlace, "NFTPurchased")
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
        .to.emit(gdMarketPlace, "NFTPurchased")
        .withArgs(1, addr1.address, addr2.address, toWei(primaryPrice));
    });

    it("Should track a relist of some purchased NFT and emit the NFTRelisted event.", async function () {
      // addr2 relist a purchased NFT
      expect(await gdMarketPlace.connect(addr2).reListNFT(1, toWei(newPrice)))
        .to.emit(gdMarketPlace, "NFTRelisted")
        .withArgs(1, addr1.address, toWei(newPrice));
    });

    it("Should revert with a GDNFTMarketplaceUnauthorized error if an address that is not the NFT's owner try to relist it on the marketplace.", async function () {
      // addr2 relist a purchased NFT
      await expect(
        gdMarketPlace.connect(addr1).reListNFT(1, toWei(newPrice))
      ).to.be.revertedWithCustomError(
        gdMarketPlace,
        "GDNFTMarketplaceUnauthorized"
      );
    });

    it("Should revert the transaction if an artist tries to list its nft with price less than or equal zero.", async function () {
      await expect(
        gdMarketPlace.connect(addr2).reListNFT(1, toWei(0))
      ).to.be.revertedWithCustomError(
        gdMarketPlace,
        "GDNFTMarketplaceInvalidInput"
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

    it("Should delist a NFT from the marketplace and emit the NFTRemovedFromMarketplace event.", async function () {
      // the market item should be not sold
      expect(
        (await gdMarketPlace.connect(addr1).idMarketItem(1)).sold
      ).to.be.equal(false);
      // addr2 relist a purchased NFT
      expect(await gdMarketPlace.connect(addr1).delistNFT(1))
        .to.emit(gdMarketPlace, "NFTRemovedFromMarketplace")
        .withArgs(1, addr1.address);
      // the market item should be sold
      expect(
        (await gdMarketPlace.connect(addr1).idMarketItem(1)).sold
      ).to.be.equal(true);
    });

    it("Should revert with a GDNFTMarketplaceUnauthorized error if some address that is not the item seller try to delist its NFT from marketplace.", async function () {
      // the market item should be not sold
      expect(
        (await gdMarketPlace.connect(addr1).idMarketItem(1)).sold
      ).to.be.equal(false);
      // addr2 relist a purchased NFT
      await expect(
        gdMarketPlace.connect(addr2).delistNFT(1)
      ).to.be.revertedWithCustomError(
        gdMarketPlace,
        "GDNFTMarketplaceUnauthorized"
      );
      // the market item should still be not sold
      expect(
        (await gdMarketPlace.connect(addr1).idMarketItem(1)).sold
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

    it("Should buy a NFT and change the ownership of the token, verify if the item changed status for sale, verify if the seller balance increases and also if the marketplace's owner receives the fee.", async function () {
      const sellerInitalEthBal = await addr1.getBalance();
      const feeAccountInitialEthBal = await deployer.getBalance();

      await expect(
        gdMarketPlace.connect(addr2).buyNFT(1, { value: toWei(price) })
      )
        .to.emit(gdMarketPlace, "NFTPurchased")
        .withArgs(1, addr1.address, addr2.address, toWei(price));

      const item = await gdMarketPlace.idMarketItem(1);
      expect(item.sold).to.equal(true);
      // Seller should receive payment for the price of the gdnft sold.
      expect(+fromWei(await addr1.getBalance())).to.equal(
        +price + +fromWei(sellerInitalEthBal) - (price * saleFeePercent) / 100
      );
      // The feeAccount should receive fee
      expect(+fromWei(await deployer.getBalance())).to.equal(
        (price * saleFeePercent) / 100 + +fromWei(feeAccountInitialEthBal)
      );
      // The buyer should now own the NFT
      expect(await gdMarketPlace.ownerOf(1)).to.equal(addr2.address);
    });

    it("Should revert with NFTNotListedForSale error if the user tries to buy a NFT that was already sold.", async () => {
      await expect(
        gdMarketPlace.connect(addr2).buyNFT(1, { value: toWei(price) })
      )
        .to.emit(gdMarketPlace, "NFTPurchased")
        .withArgs(1, addr1.address, addr2.address, toWei(price));

      await expect(
        gdMarketPlace.connect(addr3).buyNFT(1, { value: toWei(price) })
      ).to.be.revertedWithCustomError(gdMarketPlace, "NFTNotListedForSale");
    });

    it("Should revert with an GDNFTMarketplaceInexistentItem error if the user tries to buy an itemId that doesn't exists on the marketplace.", async () => {
      await expect(
        gdMarketPlace.connect(addr3).buyNFT(2, { value: toWei(price) })
      ).to.be.revertedWithCustomError(
        gdMarketPlace,
        "GDNFTMarketplaceInexistentItem"
      );
    });

    it("Should revert with GDNFTMarketplaceIncorrectAmountSent if the user tries to buy an itemId with an amount greater than the item's price.", async () => {
      await expect(
        gdMarketPlace.connect(addr3).buyNFT(1, { value: toWei(price + 10) })
      ).to.be.revertedWithCustomError(
        gdMarketPlace,
        "GDNFTMarketplaceIncorrectAmountSent"
      );
    });

    it("Should revert with GDNFTMarketplaceIncorrectAmountSent if the user tries to buy an itemId with an amount less than the item's price.", async () => {
      await expect(
        gdMarketPlace.connect(addr3).buyNFT(1, { value: toWei(price - 10) })
      ).to.be.revertedWithCustomError(
        gdMarketPlace,
        "GDNFTMarketplaceIncorrectAmountSent"
      );
    });
  });

  describe("Whitelist/Blacklist artist", function () {
    it("Should whitelist an after blacklist artist.", async () => {
      // MGD owner whitelist the artist
      await gdMarketPlace.connect(deployer).whitelist(addr1.address, true);
      expect(
        await gdMarketPlace.connect(deployer).isArtistApproved(addr1.address)
      ).to.be.equal(true);

      // MGD owner blacklist the artist
      await gdMarketPlace.connect(deployer).whitelist(addr1.address, false);
      expect(
        await gdMarketPlace.connect(deployer).isArtistApproved(addr1.address)
      ).to.be.equal(false);
    });

    it("Should revert with a GDNFTMarketplaceUnauthorized error if an address that is not the owner try to whitelist or blacklist an artist.", async () => {
      // MGD owner whitelist the artist
      await expect(
        gdMarketPlace.connect(addr1).whitelist(addr1.address, true)
      ).to.be.revertedWithCustomError(
        gdMarketPlace,
        "GDNFTMarketplaceUnauthorized"
      );
    });
  });
});
