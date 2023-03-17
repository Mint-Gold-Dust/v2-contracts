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

  let SALE_FEE_PERCENT_0: number;
  const OWNER = "0x46ab5D1518688f66286aF7c6C9f5552edd050d15";

  beforeEach(async function () {
    // Get the ContractFactories and Signers here.
    GDMarketplace = await ethers.getContractFactory("GDNFTMarketplace");
    [deployer, addr1, addr2, addr3, ...addrs] = await ethers.getSigners();

    // To deploy our contracts
    gdMarketPlace = await GDMarketplace.deploy();

    SALE_FEE_PERCENT_0 = parseFloat(
      fromWei(await gdMarketPlace.connect(deployer).SALE_FEE_PERCENT_0())
    );
  });

  describe("Deployment", function () {
    it("Should match the feePercent value with the value passed to the constructor.", async function () {
      expect(
        parseInt(fromWei((await gdMarketPlace.SALE_FEE_PERCENT_0()).toString()))
      ).to.equal(SALE_FEE_PERCENT_0);
    });
  });

  describe("Update Percent Fee", function () {
    it("Should update the sale fee percent if the address is the owner.", async () => {
      const NEW_saleFeePercent = 20;
      gdMarketPlace
        .connect(deployer)
        .updatePrimarySaleFeePercent0(toWei(NEW_saleFeePercent));
      const _saleFeePercent = parseInt(
        fromWei(await gdMarketPlace.SALE_FEE_PERCENT_0())
      );
      expect(_saleFeePercent).to.equal(NEW_saleFeePercent);
    });
    it("Should revert if a not owner address try to update the sale fee percent.", async () => {
      const NEW_saleFeePercent = 20;
      await expect(
        gdMarketPlace
          .connect(addr1)
          .updatePrimarySaleFeePercent0(toWei(NEW_saleFeePercent))
      ).to.be.revertedWithCustomError(
        gdMarketPlace,
        "GDNFTMarketplace__Unauthorized"
      );
    });
  });

  describe("Minting NFTs", function () {
    it("Should track each minted NFT.", async function () {
      // addr1 mints a nft
      await gdMarketPlace.connect(deployer).whitelist(addr1.address, true);
      await expect(gdMarketPlace.connect(addr1).mintNft(URI, toWei(5)))
        .to.emit(gdMarketPlace, "NftMinted")
        .withArgs(1, addr1.address, URI, toWei(5));
      expect(await gdMarketPlace.tokenURI(1)).to.equal(URI);
      expect(await gdMarketPlace.tokenID_Artist(1)).to.equal(addr1.address);
      expect(await gdMarketPlace.ownerOf(1)).to.equal(addr1.address);

      // addr2 mints a nft
      await gdMarketPlace.connect(deployer).whitelist(addr2.address, true);
      await expect(gdMarketPlace.connect(addr2).mintNft(URI, toWei(5)))
        .to.emit(gdMarketPlace, "NftMinted")
        .withArgs(2, addr2.address, URI, toWei(5));
      expect(await gdMarketPlace.tokenURI(2)).to.equal(URI);
      expect(await gdMarketPlace.tokenID_Artist(2)).to.equal(addr2.address);
      expect(await gdMarketPlace.ownerOf(2)).to.equal(addr2.address);

      // addr1 mints another nft
      await gdMarketPlace.connect(deployer).whitelist(addr1.address, true);
      await expect(gdMarketPlace.connect(addr1).mintNft(URI, toWei(5)))
        .to.emit(gdMarketPlace, "NftMinted")
        .withArgs(3, addr1.address, URI, toWei(5));
      expect(await gdMarketPlace.tokenURI(3)).to.equal(URI);
      expect(await gdMarketPlace.tokenID_Artist(3)).to.equal(addr1.address);
      expect(await gdMarketPlace.ownerOf(3)).to.equal(addr1.address);

      expect(await gdMarketPlace.balanceOf(addr1.address)).to.be.equal(2);
      expect(await gdMarketPlace.balanceOf(addr2.address)).to.be.equal(1);

      expect(
        await gdMarketPlace.connect(addr1).tokenID_RoyaltyPercent(1)
      ).to.be.equal(toWei(5));
      expect(
        await gdMarketPlace.connect(addr1).tokenID_RoyaltyPercent(2)
      ).to.be.equal(toWei(5));
      expect(
        await gdMarketPlace.connect(addr1).tokenID_RoyaltyPercent(3)
      ).to.be.equal(toWei(5));
    });

    it("Should revert with a GDNFTMarketplace__InvalidInput error if some artist try to mint with a royalty percent greater than 100.", async function () {
      await gdMarketPlace.connect(deployer).whitelist(addr1.address, true);
      await expect(
        gdMarketPlace.connect(addr1).mintNft(URI, toWei(101))
      ).to.be.revertedWithCustomError(gdMarketPlace, "InvalidPercentage");
    });

    it("Should revert with a GDNFTMarketplace__Unauthorized error if some not whitelisted artist try to mint a NFT.", async function () {
      // addr1 try to mint a NFT without be whitelisted
      await expect(
        gdMarketPlace.connect(addr1).mintNft(URI, toWei(5))
      ).to.be.revertedWithCustomError(
        gdMarketPlace,
        "GDNFTMarketplace__Unauthorized"
      );
    });
  });

  describe("Listing a NFT", function () {
    let price = 1;

    beforeEach(async () => {
      // MGD owner whitelist the artist
      await gdMarketPlace.connect(deployer).whitelist(addr1.address, true);
      // addr1 mints a nft
      await gdMarketPlace.connect(addr1).mintNft(URI, toWei(5));
      // Artist approve gdMarketPlace marketplace to exchange its NFT
      await gdMarketPlace
        .connect(addr1)
        .setApprovalForAll(gdMarketPlace.address, true);
    });

    it("Should track newly listed item, transfer NFT from seller to MGD marketplace and emit the NftListed event.", async function () {
      // addr1 list the NFT with tokenID on gdMarketplace
      await expect(gdMarketPlace.connect(addr1).listNft(1, toWei(price)))
        .to.emit(gdMarketPlace, "NftListed")
        .withArgs(1, addr1.address, toWei(price));

      // owner should be the marketplace
      expect(await gdMarketPlace.ownerOf(1)).to.equal(gdMarketPlace.address);

      // // Get item from items mapping then check fields to ensure they are correct
      // const userNFTs = await gdMarketPlace.fetchUserListedNFTs(addr1.address);
      // expect(userNFTs[0].tokenId).to.equal(1);
      // expect(userNFTs[0].price).to.equal(toWei(price));
      // expect(userNFTs[0].sold).to.equal(false);
    });

    it("Should revert the transaction if an artist tries to list its nft with price less than or equal zero.", async function () {
      await expect(
        gdMarketPlace.connect(addr1).listNft(1, 0)
      ).to.be.revertedWithCustomError(
        gdMarketPlace,
        "GDNFTMarketplace__InvalidInput"
      );
    });

    it("Should revert the transaction if an artist is not the owner of the token and try to list on the gold dust marketplace.", async function () {
      expect(
        gdMarketPlace.connect(addr2).listNft(1, toWei(price))
      ).to.revertedWithCustomError(
        gdMarketPlace,
        "GDNFTMarketplace__Unauthorized"
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
      await gdMarketPlace.connect(addr1).mintNft(URI, toWei(5));
      // Artist approve MGD marketplace to exchange its NFT
      await gdMarketPlace
        .connect(addr1)
        .setApprovalForAll(gdMarketPlace.address, true);
      // Artist list its NFT on MGD marketplace
      await gdMarketPlace.connect(addr1).listNft(1, toWei(primaryPrice));
    });

    it("Should track if a listed item was correctly updated and emit the NftListedItemUpdated event. We should remember that in this moment the owner of the NFT is the marketplace.", async function () {
      // Get item from items mapping then check fields to ensure they are correct before update
      let userNFT = await gdMarketPlace.id_MarketItem(1);
      expect(userNFT.price).to.equal(toWei(primaryPrice));
      // addr1 mints an gdMarketPlace
      expect(
        await gdMarketPlace.connect(addr1).updateListedNft(1, toWei(newPrice))
      )
        .to.emit(gdMarketPlace, "NftListedItemUpdated")
        .withArgs(1, addr1.address, toWei(newPrice));

      // Get item from items mapping then check fields to ensure they are correct
      userNFT = await gdMarketPlace.id_MarketItem(1);

      // Get item from items mapping then check fields to ensure they are correct before update
      expect(userNFT.price).to.equal(toWei(newPrice));

      // Just confirm that the owner is the marketplace
      expect(await gdMarketPlace.ownerOf(1)).to.equal(gdMarketPlace.address);
    });

    it("Should revert the transaction with InvalidInput error if the marketplace owner tries to update some listed nft with price less than or equal zero.", async function () {
      // try to list with price less than zero
      await expect(
        gdMarketPlace.connect(addr1).updateListedNft(1, toWei(0))
      ).to.be.revertedWithCustomError(
        gdMarketPlace,
        "GDNFTMarketplace__InvalidInput"
      );
    });

    it("Should revert the transaction with an GDNFTMarketplace__Unauthorized error if some address that is not the seller try to update the NFT listed.", async function () {
      // try to list with price less than zero
      await expect(
        gdMarketPlace.connect(addr2).updateListedNft(1, toWei(newPrice))
      ).to.be.revertedWithCustomError(
        gdMarketPlace,
        "GDNFTMarketplace__Unauthorized"
      );
    });

    it("Should revert the transaction with an NFTNotListedForSale error if some user tries to update an item that is not on sale.", async function () {
      // addr2 buy the NFT listed
      await gdMarketPlace
        .connect(addr2)
        .buyNFT(1, { value: toWei(primaryPrice) });

      await expect(
        gdMarketPlace.connect(addr1).updateListedNft(1, toWei(newPrice))
      ).to.be.revertedWithCustomError(
        gdMarketPlace,
        "GDNFTMarketplace__NotAListedItem"
      );
    });
  });

  describe("Relist NFT", function () {
    let primaryPrice = 1;
    let newPrice = 2;

    beforeEach(async () => {
      // MGD owner whitelist the artist
      await gdMarketPlace.connect(deployer).whitelist(addr1.address, true);
      // addr1 mints a NFT
      await gdMarketPlace.connect(addr1).mintNft(URI, toWei(5));
      // Artist approve MGD marketplace to exchange its NFT
      await gdMarketPlace
        .connect(addr1)
        .setApprovalForAll(gdMarketPlace.address, true);
      // Artist list its NFT on MGD marketplace
      await gdMarketPlace.connect(addr1).listNft(1, toWei(primaryPrice));

      // Addr2 buy the NFT listed by the addr1
      await gdMarketPlace
        .connect(addr2)
        .buyNFT(1, { value: toWei(primaryPrice) });
    });

    it("Should track a relist of some purchased NFT and emit the NFTRelisted event.", async function () {
      // addr2 relist a purchased NFT
      expect(await gdMarketPlace.connect(addr2).reListNft(1, toWei(newPrice)))
        .to.emit(gdMarketPlace, "NFTRelisted")
        .withArgs(1, addr1.address, toWei(newPrice));

      expect((await gdMarketPlace.id_MarketItem(1)).sold).to.be.equal(false);
    });

    it("Should revert with a GDNFTMarketplace__Unauthorized error if an address that is not the NFT's owner try to relist it on the marketplace.", async function () {
      // addr2 relist a purchased NFT
      await expect(
        gdMarketPlace.connect(addr1).reListNft(1, toWei(newPrice))
      ).to.be.revertedWithCustomError(
        gdMarketPlace,
        "GDNFTMarketplace__Unauthorized"
      );
    });

    it("Should revert the transaction if an artist tries to list its nft with price less than or equal zero.", async function () {
      await expect(
        gdMarketPlace.connect(addr2).reListNft(1, toWei(0))
      ).to.be.revertedWithCustomError(
        gdMarketPlace,
        "GDNFTMarketplace__InvalidInput"
      );
    });
  });

  describe("Delist NFT", function () {
    let primaryPrice = 1;

    beforeEach(async () => {
      // MGD owner whitelist the artist
      await gdMarketPlace.connect(deployer).whitelist(addr1.address, true);
      // addr1 mints a NFT
      await gdMarketPlace.connect(addr1).mintNft(URI, toWei(5));
      // Artist approve MGD marketplace to exchange its NFT
      await gdMarketPlace
        .connect(addr1)
        .setApprovalForAll(gdMarketPlace.address, true);
      // Artist list its NFT on MGD marketplace
      await gdMarketPlace.connect(addr1).listNft(1, toWei(primaryPrice));
    });

    it("Should delist a NFT from the marketplace and emit the NFTRemovedFromMarketplace event.", async function () {
      // the market item should be not sold
      expect(
        (await gdMarketPlace.connect(addr1).id_MarketItem(1)).sold
      ).to.be.equal(false);
      // addr2 relist a purchased NFT
      expect(await gdMarketPlace.connect(addr1).delistNft(1))
        .to.emit(gdMarketPlace, "NFTRemovedFromMarketplace")
        .withArgs(1, addr1.address);
      // the market item should be sold
      expect(
        (await gdMarketPlace.connect(addr1).id_MarketItem(1)).sold
      ).to.be.equal(true);
    });

    it("Should revert with a GDNFTMarketplace__Unauthorized error if some address that is not the item seller try to delist its NFT from marketplace.", async function () {
      // the market item should be not sold
      expect(
        (await gdMarketPlace.connect(addr1).id_MarketItem(1)).sold
      ).to.be.equal(false);
      // addr2 relist a purchased NFT
      await expect(
        gdMarketPlace.connect(addr2).delistNft(1)
      ).to.be.revertedWithCustomError(
        gdMarketPlace,
        "GDNFTMarketplace__Unauthorized"
      );
      // the market item should still be not sold
      expect(
        (await gdMarketPlace.connect(addr1).id_MarketItem(1)).sold
      ).to.be.equal(false);
    });
  });

  describe("Purchase NFT", function () {
    let price = 20;
    let royalty = 5;
    // Calculate the fee and balance values based on the price
    let fee: number;
    let balance: number;

    beforeEach(async () => {
      // MGD owner whitelist the artist
      await gdMarketPlace.connect(deployer).whitelist(addr1.address, true);
      // addr1 mints a NFT
      await gdMarketPlace.connect(addr1).mintNft(URI, toWei(royalty));
      // Artist approve MGD marketplace to exchange its NFT
      await gdMarketPlace
        .connect(addr1)
        .setApprovalForAll(gdMarketPlace.address, true);
      // Artist list its NFT on MGD marketplace
      await gdMarketPlace.connect(addr1).listNft(1, toWei(price));

      fee = (price * SALE_FEE_PERCENT_0) / 100;
      balance = price - fee;
    });

    it("Should simulate a primary sale that transfer an NFT to the buyer, verify if the item changed status for sale, verify if the seller balance increases and also if the marketplace's owner receives the fee and verify if the flag to secondary sale was set to true.", async function () {
      // get the balances for the seller and the owner of the marketplace.
      const sellerInitalEthBal = await addr1.getBalance();
      const feeAccountInitialEthBal = await deployer.getBalance();

      // execute the buyNft function
      await expect(
        gdMarketPlace.connect(addr2).buyNFT(1, { value: toWei(price) })
      )
        .to.emit(gdMarketPlace, "NftPurchased")
        .withArgs(
          1,
          addr1.address,
          addr2.address,
          toWei(price),
          toWei(royalty),
          0,
          addr1.address,
          toWei(fee)
        );

      // verify if the owner of the NFT changed for the buyer
      expect(await gdMarketPlace.ownerOf(1)).to.equal(addr2.address);

      // verify if the flag for secondary market changed for true
      expect(await gdMarketPlace.tokenID_SecondarySale(1)).to.equal(true);

      // verify if the marketplace owner's balance increased the fee
      expect(await deployer.getBalance()).to.be.equal(
        ethers.BigNumber.from(feeAccountInitialEthBal).add(toWei(fee))
      );
      // verify if the seller received the balance
      expect(await addr1.getBalance()).to.be.equal(
        ethers.BigNumber.from(sellerInitalEthBal).add(toWei(balance))
      );

      // expect item sold to be true
      expect((await gdMarketPlace.id_MarketItem(1)).sold).to.be.equal(true);
    });

    it("Should revert with GDNFTMarketplace__NotAListedItem error if the user tries to buy a NFT that was already sold.", async () => {
      await expect(
        gdMarketPlace.connect(addr2).buyNFT(1, { value: toWei(price) })
      )
        .to.emit(gdMarketPlace, "NftPurchased")
        .withArgs(
          1,
          addr1.address,
          addr2.address,
          toWei(price),
          toWei(royalty),
          0,
          addr1.address,
          toWei(fee)
        );

      await expect(
        gdMarketPlace.connect(addr3).buyNFT(1, { value: toWei(price) })
      ).to.be.revertedWithCustomError(
        gdMarketPlace,
        "GDNFTMarketplace__NotAListedItem"
      );
    });

    it("Should revert with GDNFTMarketplace__IncorrectAmountSent if the user tries to buy an itemId with an amount greater than the item's price.", async () => {
      await expect(
        gdMarketPlace.connect(addr3).buyNFT(1, { value: toWei(price + 10) })
      ).to.be.revertedWithCustomError(
        gdMarketPlace,
        "GDNFTMarketplace__IncorrectAmountSent"
      );
    });

    it("Should revert with GDNFTMarketplace__IncorrectAmountSent if the user tries to buy an itemId with an amount less than the item's price.", async () => {
      await expect(
        gdMarketPlace.connect(addr3).buyNFT(1, { value: toWei(price - 10) })
      ).to.be.revertedWithCustomError(
        gdMarketPlace,
        "GDNFTMarketplace__IncorrectAmountSent"
      );
    });
  });

  // describe("Purchase NFT on secondary market", function () {
  //   let price = 20;
  //   let royaltyPercent = 5;
  //   // Calculate the fee and balance values based on the price
  //   let fee: number;
  //   let balance: number;
  //   let royalty: number;

  //   beforeEach(async () => {
  //     // MGD owner whitelist the artist
  //     await gdMarketPlace.connect(deployer).whitelist(addr1.address, true);
  //     // addr1 mints a NFT
  //     await gdMarketPlace.connect(addr1).mintNft(URI, toWei(royaltyPercent));
  //     // Artist approve MGD marketplace to exchange its NFT
  //     await gdMarketPlace
  //       .connect(addr1)
  //       .setApprovalForAll(gdMarketPlace.address, true);
  //     // Artist list its NFT on MGD marketplace
  //     await gdMarketPlace.connect(addr1).listNft(1, toWei(price));

  //     // addr2 buy the NFT
  //     await gdMarketPlace.connect(addr2).buyNFT(1, { value: toWei(price) });

  //     // addr2 relist a purchased NFT
  //     await gdMarketPlace.connect(addr2).reListNft(1, toWei(price));

  //     fee = (price * SALE_FEE_PERCENT_0) / 100;
  //     royalty = (price * royaltyPercent) / 100;
  //     balance = price - fee - royalty;
  //   });

  //   it("Should simulate a secondary sale that transfer an NFT to the buyer, verify if the item changed status for sale, verify if the seller balance increases and also if the marketplace's owner receives the fee and verify if the flag to secondary sale was set to true.", async function () {
  //     // get the balances for the seller and the owner of the marketplace.
  //     const sellerInitalEthBal = await addr1.getBalance();
  //     const feeAccountInitialEthBal = await deployer.getBalance();
  //     const provider = new ethers.providers.JsonRpcProvider(
  //       "http://localhost:8545"
  //     ); // Replace with your Ethereum node URL

  //     const artistAddress = await gdMarketPlace.tokenID_Artist(1);
  //     const artistInitialBal = await provider.getBalance(artistAddress);
  //     console.log("ARTIST BALANCE: ", artistInitialBal);
  //     // execute the buyNft function
  //     await expect(
  //       gdMarketPlace.connect(addr3).buyNFT(1, { value: toWei(price) })
  //     )
  //       .to.emit(gdMarketPlace, "NftPurchased")
  //       .withArgs(
  //         1,
  //         addr2.address,
  //         addr3.address,
  //         toWei(price),
  //         toWei(royaltyPercent),
  //         royalty,
  //         addr1.address,
  //         toWei(fee)
  //       );

  //     const artistAddress2 = await gdMarketPlace.tokenID_Artist(1);
  //     const artistInitialBal2 = await provider.getBalance(artistAddress2);
  //     console.log("ARTIST BALANCE AFTERRRRRRRRRR: ", artistInitialBal2);

  //     // // verify if the owner of the NFT changed for the buyer
  //     // expect(await gdMarketPlace.ownerOf(1)).to.equal(addr2.address);

  //     // // verify if the flag for secondary market changed for true
  //     // expect(await gdMarketPlace.tokenID_SecondarySale(1)).to.equal(true);

  //     // // verify if the marketplace owner's balance increased the fee
  //     // expect(await deployer.getBalance()).to.be.equal(
  //     //   ethers.BigNumber.from(feeAccountInitialEthBal).add(toWei(fee))
  //     // );
  //     // // verify if the seller received the balance
  //     // expect(await addr1.getBalance()).to.be.equal(
  //     //   ethers.BigNumber.from(sellerInitalEthBal).add(toWei(balance))
  //     // );

  //     // // expect item sold to be true
  //     // expect((await gdMarketPlace.id_MarketItem(1)).sold).to.be.equal(true);
  //   });
  // });

  describe("Whitelist/Blacklist artist", function () {
    it("Should whitelist an after blacklist artist.", async () => {
      // MGD owner whitelist the artist
      await gdMarketPlace.connect(deployer).whitelist(addr1.address, true);
      expect(
        await gdMarketPlace.connect(deployer).artist_IsApproved(addr1.address)
      ).to.be.equal(true);

      // MGD owner blacklist the artist
      await gdMarketPlace.connect(deployer).whitelist(addr1.address, false);
      expect(
        await gdMarketPlace.connect(deployer).artist_IsApproved(addr1.address)
      ).to.be.equal(false);
    });

    it("Should revert with a GDNFTMarketplace__Unauthorized error if an address that is not the owner try to whitelist or blacklist an artist.", async () => {
      // MGD owner whitelist the artist
      await expect(
        gdMarketPlace.connect(addr1).whitelist(addr1.address, true)
      ).to.be.revertedWithCustomError(
        gdMarketPlace,
        "GDNFTMarketplace__Unauthorized"
      );
    });
  });
});
