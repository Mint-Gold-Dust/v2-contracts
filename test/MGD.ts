import { expect } from "chai";
import { ethers } from "hardhat";

const toWei = (num: any) => ethers.utils.parseEther(num.toString());
const fromWei = (num: any) => ethers.utils.formatEther(num);

describe("NFTMarketplace", function () {
  let ERC721: any;
  let nft: any;
  let MGD: any;
  let mgd: any;
  let deployer: any;
  let addr1: any;
  let addr2: any;
  let addrs: any;
  let feePercent = 1;
  let URI = "sample URI";

  beforeEach(async function () {
    // Get the ContractFactories and Signers here.
    ERC721 = await ethers.getContractFactory("ERC721");
    MGD = await ethers.getContractFactory("MGD");
    [deployer, addr1, addr2, ...addrs] = await ethers.getSigners();

    // To deploy our contracts
    nft = await ERC721.deploy();
    mgd = await MGD.deploy(feePercent);
  });

  describe("Deployment", function () {
    it("Should track name and symbol of the nft collection", async function () {
      // This test expects the owner variable stored in the contract to be equal
      // to our Signer's owner.
      const nftName = "Mint Gold Dust";
      const nftSymbol = "MGD";
      expect(await nft.name()).to.equal(nftName);
      expect(await nft.symbol()).to.equal(nftSymbol);
    });

    it("Should track feeAccount and feePercent of the mgd", async function () {
      expect(await mgd.feeAccount()).to.equal(deployer.address);
      expect(await mgd.feePercent()).to.equal(feePercent);
    });
  });

  describe("Minting NFTs", function () {
    it("Should track each minted NFT", async function () {
      // addr1 mints an nft
      await nft.connect(addr1).mint(URI);
      expect(await nft.tokenCount()).to.equal(1);
      expect(await nft.balanceOf(addr1.address)).to.equal(1);
      expect(await nft.tokenURI(1)).to.equal(URI);
      // addr2 mints an nft
      await nft.connect(addr2).mint(URI);
      expect(await nft.tokenCount()).to.equal(2);
      expect(await nft.balanceOf(addr2.address)).to.equal(1);
      expect(await nft.tokenURI(2)).to.equal(URI);
    });
  });

  describe("Making mgd items", function () {
    let price = 1;
    let result;
    beforeEach(async function () {
      // addr1 mints an nft
      await nft.connect(addr1).mint(URI);
      // addr1 approves mgd to spend nft
      await nft.connect(addr1).setApprovalForAll(mgd.address, true);
    });

    it("Should track newly created item, transfer NFT from seller to mgd and emit Offered event", async function () {
      // addr1 offers their nft at a price of 1 ether
      // await expect(
      //   mgd.connect(addr1).makeItem(nft.address, 1, toWei(price))
      // )
      //   .to.emit(mgd, "Offered")
      //   .withArgs(1, nft.address, 1, toWei(price), addr1.address);
      // Owner of NFT should now be the mgd
      expect(await nft.ownerOf(1)).to.equal(mgd.address);
      // Item count should now equal 1
      expect(await mgd.itemCount()).to.equal(1);
      // Get item from items mapping then check fields to ensure they are correct
      const item = await mgd.items(1);
      expect(item.itemId).to.equal(1);
      expect(item.nft).to.equal(nft.address);
      expect(item.tokenId).to.equal(1);
      expect(item.price).to.equal(toWei(price));
      expect(item.sold).to.equal(false);
    });

    // it("Should fail if price is set to zero", async function () {
    //   await expect(
    //     mgd.connect(addr1).makeItem(nft.address, 1, 0)
    //   ).to.be.revertedWith("Price must be greater than zero");
    // });
  });
});
