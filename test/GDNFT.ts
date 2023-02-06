import { expect, use } from "chai";
import { ethers } from "hardhat";

const toWei = (num: any) => ethers.utils.parseEther(num.toString());
const fromWei = (num: any) => ethers.utils.formatEther(num);

describe("NFTMarketplace", function () {
  let GDNFT: any;
  let gdnft: any;

  let deployer: any;
  let addr1: any;
  let addr2: any;
  let addrs: any;

  let URI = "sample URI";

  beforeEach(async function () {
    // Get the ContractFactories and Signers here.
    GDNFT = await ethers.getContractFactory("GDNFT");

    [deployer, addr1, addr2, ...addrs] = await ethers.getSigners();

    // To deploy our contracts
    gdnft = await GDNFT.deploy();
  });

  describe("Deployment", function () {
    it("Should track name and symbol of the gdnft collection", async function () {
      // This test expects the owner variable stored in the contract to be equal
      // to our Signer's owner.
      const gdnftName = "Mint Gold Dust";
      const gdnftSymbol = "MGD";
      expect(await gdnft.name()).to.equal(gdnftName);
      expect(await gdnft.symbol()).to.equal(gdnftSymbol);
    });
  });

  describe("Minting NFTs", function () {
    it("Should track each minted NFT", async function () {
      // addr1 mints an gdnft
      await gdnft.connect(addr1).mint(URI);
      expect(await gdnft.tokenCount()).to.equal(1);
      expect(await gdnft.balanceOf(addr1.address)).to.equal(1);
      expect(await gdnft.tokenURI(1)).to.equal(URI);
      // addr2 mints an gdnft
      await gdnft.connect(addr2).mint(URI);
      expect(await gdnft.tokenCount()).to.equal(2);
      expect(await gdnft.balanceOf(addr2.address)).to.equal(1);
      expect(await gdnft.tokenURI(2)).to.equal(URI);

      // addr1 mints an gdnft
      await gdnft.connect(addr1).mint(URI);
      expect(await gdnft.tokenCount()).to.equal(3);
      expect(await gdnft.balanceOf(addr1.address)).to.equal(2);
      expect(await gdnft.tokenURI(3)).to.equal(URI);
    });
  });
});
