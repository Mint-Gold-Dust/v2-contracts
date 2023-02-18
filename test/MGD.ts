import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect, use } from "chai";
import { Contract, ContractFactory } from "ethers";
import { ethers } from "hardhat";

const toWei = (num: any) => ethers.utils.parseEther(num.toString());
const fromWei = (num: any) => ethers.utils.formatEther(num);

describe("MGD Smart Contract", function () {
  let Teste: ContractFactory;
  let mgd: Contract;

  let deployer: SignerWithAddress;
  let addr1: SignerWithAddress;
  let addr2: SignerWithAddress;
  let addrs: SignerWithAddress[];

  const mgdNFTName = "Mint Gold Dust NFT";
  const mgdNFTSymbol = "MGD";

  let _feePercent = 10;
  let URI = "sample URI";

  const SALE_FEE_PERCENT: any = 15;
  const OWNER = "0x46ab5D1518688f66286aF7c6C9f5552edd050d15";
  beforeEach(async function () {
    // Get the ContractFactories and Signers here.
    Teste = await ethers.getContractFactory("Teste");
    [deployer, addr1, addr2, ...addrs] = await ethers.getSigners();

    // To deploy our contracts
    mgd = await Teste.deploy();
  });

  describe("Deployment", function () {
    it("Should contract owner be equal to deployer address", async function () {
      expect(await mgd.owner()).to.equal(deployer.address);
    });

    it("Should match the feePercent value with the value passed to the constructor", async function () {
      const _SALE_FEE_PERCENT = parseInt(fromWei(await mgd.SALE_FEE_PERCENT()));
      expect(_SALE_FEE_PERCENT).to.equal(SALE_FEE_PERCENT);
    });

    it("Should track name and symbol of the mdg collection", async function () {
      expect(await mgd.name()).to.equal(mgdNFTName);
      expect(await mgd.symbol()).to.equal(mgdNFTSymbol);
    });
  });

  describe("Update Percente Fee", function () {
    it("Should update the sale fee percent if the address is the owner", async () => {
      const NEW_SALE_FEE_PERCENT = 20;
      mgd.connect(deployer).updateSaleFeePercent(toWei(NEW_SALE_FEE_PERCENT));
      const _SALE_FEE_PERCENT = parseInt(fromWei(await mgd.SALE_FEE_PERCENT()));
      expect(_SALE_FEE_PERCENT).to.equal(NEW_SALE_FEE_PERCENT);
    });

    it("Should revert if a not owner address try to update the sale fee percent", async () => {
      const NEW_SALE_FEE_PERCENT = 20;
      expect(
        mgd.connect(deployer).updateSaleFeePercent(toWei(NEW_SALE_FEE_PERCENT))
      ).to.be.revertedWithCustomError(mgd, "MDG__Unauthorized");
    });
  });

  describe("Minting NFTs", function () {
    it("Should track each minted NFT", async function () {
      // addr1 mints a nft
      await mgd.connect(deployer).whitelist(addr1.address, true);
      await mgd.connect(addr1).mintNFT(URI);
      //expect(await mgd.getTokenCount()).to.equal(1);
      expect(await mgd.artistTokenCount(addr1.address)).to.equal(1);
      expect(await mgd.tokenURI(1)).to.equal(URI);

      // addr2 mints a nft
      await mgd.connect(deployer).whitelist(addr2.address, true);
      await mgd.connect(addr2).mintNFT(URI);
      //expect(await mgd.getTokenCount()).to.equal(1);
      expect(await mgd.artistTokenCount(addr2.address)).to.equal(1);
      expect(await mgd.tokenURI(1)).to.equal(URI);
    });

    it("Should revert if the artist was not whitelisted", async function () {
      // addr1 mints a nft
      await expect(
        mgd.connect(addr1).mintNFT(URI)
      ).to.be.revertedWithCustomError(mgd, "MDG__Unauthorized");
    });
  });

  describe("Listing a NFT", function () {
    let price = 1;

    beforeEach(async () => {
      // MGD owner whitelist the artist
      await mgd.connect(deployer).whitelist(addr1.address, true);
      // addr1 mints a nft
      await mgd.connect(addr1).mintNFT(URI);
      // Artist approve mgd marketplace to exchange its NFT
      await mgd.connect(addr1).setApprovalForAll(mgd.address, true);
    });
    it("Should track newly listed item, transfer NFT from seller to MGD marketplace and emmit the Listed event", async function () {
      // addr1 mints an mgd
      expect(mgd.connect(addr1).listNFT(mgd.address, 1, toWei(price)))
        .to.emit(mgd, "Listed")
        .withArgs(1, 1, mgd.address, toWei(price), addr1.address);

      // owner should be the marketplace
      expect(await mgd.ownerOf(1)).to.equal(mgd.address);

      // Get item from items mapping then check fields to ensure they are correct
      const item = await mgd.idMarketItem(1);
      // expect(item.itemId).to.equal(1);
      // expect(item.nft).to.equal(mgd.address);
      // expect(item.tokenId).to.equal(1);
      // expect(item.price).to.equal(toWei(price));
      // expect(item.sold).to.equal(false);
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
//       await gdnft.connect(addr1).setApprovalForAll(mgd.address, true);
//       // addr1 makes their gdnft a mgd item.
//       await mgd.connect(addr1)._listItem(gdnft.address, 1, toWei(price));
//     });
//     it("Should update item as sold, pay seller, transfer gdnft to buyer, charge fees and emit a Bought event", async function () {
//       const sellerInitalEthBal = await addr1.getBalance();
//       const feeAccountInitialEthBal = await deployer.getBalance();
//       // fetch items total price (market fees + item price)
//       totalPriceInWei = await mgd.getTotalPrice(1);
//       console.log("TOTALPRICE: ", +fromWei(totalPriceInWei) - fee);
//       // addr 2 purchases item.
//       await expect(
//         mgd.connect(addr2).purchaseItem(1, { value: totalPriceInWei })
//       )
//         .to.emit(mgd, "Bought")
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
//       expect((await mgd.items(1)).sold).to.equal(true);
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
//         mgd.connect(addr2).purchaseItem(2, { value: totalPriceInWei })
//       ).to.be.revertedWith("item doesn't exist");
//       await expect(
//         mgd.connect(addr2).purchaseItem(0, { value: totalPriceInWei })
//       ).to.be.revertedWith("item doesn't exist");
//       // Fails when not enough ether is paid with the transaction.
//       // In this instance, fails when buyer only sends enough ether to cover the price of the gdnft
//       // not the additional market fee.
//       await expect(
//         mgd.connect(addr2).purchaseItem(1, { value: toWei(price) })
//       ).to.be.revertedWith(
//         "not enough ether to cover item price and market fee"
//       );
//       // addr2 purchases item 1
//       await mgd.connect(addr2).purchaseItem(1, { value: totalPriceInWei });
//       // addr3 tries purchasing item 1 after its been sold
//       const addr3 = addrs[0];
//       await expect(
//         mgd.connect(addr3).purchaseItem(1, { value: totalPriceInWei })
//       ).to.be.revertedWith("item already sold");
//     });
//   });
// });
