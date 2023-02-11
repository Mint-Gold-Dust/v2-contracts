import { expect, use } from "chai";
import { ethers } from "hardhat";

const toWei = (num: number) => ethers.utils.parseEther(num.toString());
const fromWei = (num: any) => ethers.utils.formatEther(num);

describe("MGD Smart Contract", function () {
  let MGD: any;
  let mgd: any;

  let GDNFT: any;
  let gdnft: any;

  let deployer: any;
  let addr1: any;
  let addr2: any;
  let addrs: any;

  let _feePercent: number;
  let URI = "sample URI";

  beforeEach(async function () {
    // Get the ContractFactories and Signers here.
    MGD = await ethers.getContractFactory("MGD");
    GDNFT = await ethers.getContractFactory("GDNFT");
    [deployer, addr1, addr2, ...addrs] = await ethers.getSigners();

    _feePercent = 10;

    // To deploy our contracts
    mgd = await MGD.deploy(_feePercent);
    gdnft = await GDNFT.deploy();
  });

  describe("Deployment", function () {
    it("Should contract owner be equal to deployer address", async function () {
      expect(await mgd.owner()).to.equal(deployer.address);
    });

    it("Should match the feePercent value with the value passed to the constructor", async function () {
      expect(await mgd._getFeePercent()).to.equal(_feePercent);
    });
  });

  describe("Listing a NFT", function () {
    let price = 1;

    beforeEach(async () => {
      await gdnft.connect(addr1).mint(URI);

      await gdnft.connect(addr1).setApprovalForAll(mgd.address, true);
    });
    it("Should track newly listed item, transfer NFT from seller to MGD marketplace and emmit the Listed event", async function () {
      // addr1 mints an mgd
      expect(mgd.connect(addr1)._listItem(gdnft.address, 1, toWei(price)))
        .to.emit(mgd, "Listed")
        .withArgs(1, gdnft.address, 1, toWei(price), addr1.address);

      // owner should be the marketplace
      expect(await gdnft.ownerOf(1)).to.equal(mgd.address);

      // Item count should now equal 1
      expect(await mgd._getTokenCount()).to.equal(1);

      // Get item from items mapping then check fields to ensure they are correct
      const item = await mgd.items(1);
      expect(item.itemId).to.equal(1);
      expect(item.nft).to.equal(gdnft.address);
      expect(item.tokenId).to.equal(1);
      expect(item.price).to.equal(toWei(price));
      expect(item.sold).to.equal(false);
    });
  });

  describe("Purchasing marketplace items", function () {
    let price = 2;
    let fee = (_feePercent / 100) * price;
    let totalPriceInWei: any;
    beforeEach(async function () {
      // addr1 mints an nft
      await gdnft.connect(addr1).mint(URI);
      // addr1 approves marketplace to spend tokens
      await gdnft.connect(addr1).setApprovalForAll(mgd.address, true);
      // addr1 makes their gdnft a mgd item.
      await mgd.connect(addr1)._listItem(gdnft.address, 1, toWei(price));
    });
    it("Should update item as sold, pay seller, transfer gdnft to buyer, charge fees and emit a Bought event", async function () {
      const sellerInitalEthBal = await addr1.getBalance();
      const feeAccountInitialEthBal = await deployer.getBalance();
      // fetch items total price (market fees + item price)
      totalPriceInWei = await mgd.getTotalPrice(1);
      // addr 2 purchases item.
      await expect(
        mgd.connect(addr2).purchaseItem(1, { value: totalPriceInWei })
      )
        .to.emit(mgd, "Bought")
        .withArgs(
          1,
          gdnft.address,
          1,
          toWei(price),
          addr1.address,
          addr2.address
        );
      const sellerFinalEthBal = await addr1.getBalance();
      const feeAccountFinalEthBal = await deployer.getBalance();
      // Item should be marked as sold
      expect((await mgd.items(1)).sold).to.equal(true);
      // Seller should receive payment for the price of the gdnft sold.
      expect(+fromWei(sellerFinalEthBal)).to.equal(
        +price + +fromWei(sellerInitalEthBal)
      );
      // feeAccount should receive fee
      expect(+fromWei(feeAccountFinalEthBal)).to.equal(
        +fee + +fromWei(feeAccountInitialEthBal)
      );
      // The buyer should now own the gdnft
      expect(await gdnft.ownerOf(1)).to.equal(addr2.address);
    });
    it("Should fail for invalid item ids, sold items and when not enough ether is paid", async function () {
      // fails for invalid item ids
      await expect(
        mgd.connect(addr2).purchaseItem(2, { value: totalPriceInWei })
      ).to.be.revertedWith("item doesn't exist");
      await expect(
        mgd.connect(addr2).purchaseItem(0, { value: totalPriceInWei })
      ).to.be.revertedWith("item doesn't exist");
      // Fails when not enough ether is paid with the transaction.
      // In this instance, fails when buyer only sends enough ether to cover the price of the gdnft
      // not the additional market fee.
      await expect(
        mgd.connect(addr2).purchaseItem(1, { value: toWei(price) })
      ).to.be.revertedWith(
        "not enough ether to cover item price and market fee"
      );
      // addr2 purchases item 1
      await mgd.connect(addr2).purchaseItem(1, { value: totalPriceInWei });
      // addr3 tries purchasing item 1 after its been sold
      const addr3 = addrs[0];
      await expect(
        mgd.connect(addr3).purchaseItem(1, { value: totalPriceInWei })
      ).to.be.revertedWith("item already sold");
    });
  });
});
