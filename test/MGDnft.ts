require("dotenv").config();
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect, use } from "chai";
import { Contract, ContractFactory } from "ethers";
import { ethers, upgrades } from "hardhat";

const toWei = (num: any) => ethers.utils.parseEther(num.toString());
const fromWei = (num: any) => ethers.utils.formatEther(num);

describe("\nMGDnft.sol Smart Contract \n___________________________\n \nThis smart contract is responsible by mint new MGD Nfts. Actually this contract is an ERC721. \n", function () {
  let MGDMarketplace: ContractFactory;
  let mgdMarketplace: Contract;

  let deployer: SignerWithAddress;
  let addr1: SignerWithAddress;
  let addr2: SignerWithAddress;
  let addrs: SignerWithAddress[];

  let URI = "sample URI";
  let max_royalty = 20;

  //const REAL_OWNER = "0x46ab5D1518688f66286aF7c6C9f5552edd050d15";
  const TEST_OWNER = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266";
  const primary_sale_fee_percent_initial = 15000000000000000000n;
  const secondary_sale_fee_percent_initial = 5000000000000000000n;
  const collector_fee_initial = 3000000000000000000n;
  const max_royalty_initial = 20000000000000000000n;

  beforeEach(async function () {
    MGDMarketplace = await ethers.getContractFactory("MGDMarketplace");
    [deployer, addr1, addr2, ...addrs] = await ethers.getSigners();

    mgdMarketplace = await MGDMarketplace.deploy(
      TEST_OWNER,
      primary_sale_fee_percent_initial,
      secondary_sale_fee_percent_initial,
      collector_fee_initial,
      max_royalty_initial
    );

    await mgdMarketplace.connect(deployer).setValidator(deployer.address, true);
  });

  describe("Teste related with the mint NFT functionality:", function () {
    it("Should track each minted NFT. This is verifying if: \n \t - The tokenURI was set correctly. \n \t - The tokenId was bound with the artist for future royalties payments. \n \t - The artist is the owner of the token. \n \t - The royalty percentage was set correctly. \n \t - The balanceOf the artists that mint an NFT was increased.", async function () {
      // addr1 mints a nft
      await mgdMarketplace.connect(deployer).whitelist(addr1.address, true);
      await expect(mgdMarketplace.connect(addr1).mintNft(URI, toWei(5)))
        .to.emit(mgdMarketplace, "NftMinted")
        .withArgs(1, addr1.address, URI, toWei(5));
      expect(await mgdMarketplace.tokenURI(1)).to.equal(URI);
      expect(await mgdMarketplace.tokenIdArtist(1)).to.equal(addr1.address);
      expect(await mgdMarketplace.ownerOf(1)).to.equal(addr1.address);
      expect(await mgdMarketplace.ownerOf(1)).to.equal(addr1.address);

      // addr2 mints a nft
      await mgdMarketplace.connect(deployer).whitelist(addr2.address, true);
      await expect(mgdMarketplace.connect(addr2).mintNft(URI, toWei(5)))
        .to.emit(mgdMarketplace, "NftMinted")
        .withArgs(2, addr2.address, URI, toWei(5));
      expect(await mgdMarketplace.tokenURI(2)).to.equal(URI);
      expect(await mgdMarketplace.tokenIdArtist(2)).to.equal(addr2.address);
      expect(await mgdMarketplace.ownerOf(2)).to.equal(addr2.address);

      // addr1 mints another nft
      await expect(mgdMarketplace.connect(addr1).mintNft(URI, toWei(5)))
        .to.emit(mgdMarketplace, "NftMinted")
        .withArgs(3, addr1.address, URI, toWei(5));
      expect(await mgdMarketplace.tokenURI(3)).to.equal(URI);
      expect(await mgdMarketplace.tokenIdArtist(3)).to.equal(addr1.address);
      expect(await mgdMarketplace.ownerOf(3)).to.equal(addr1.address);

      expect(await mgdMarketplace.balanceOf(addr1.address)).to.be.equal(2);
      expect(await mgdMarketplace.balanceOf(addr2.address)).to.be.equal(1);

      expect(
        await mgdMarketplace.connect(addr1).tokenIdRoyaltyPercent(1)
      ).to.be.equal(toWei(5));
      expect(
        await mgdMarketplace.connect(addr1).tokenIdRoyaltyPercent(2)
      ).to.be.equal(toWei(5));
      expect(
        await mgdMarketplace.connect(addr1).tokenIdRoyaltyPercent(3)
      ).to.be.equal(toWei(5));
    });

    it(`Should revert with a MGDnftRoyaltyInvalidPercentage error if some artist try to mint with a royalty percent greater than ${max_royalty}.`, async function () {
      await mgdMarketplace.connect(deployer).whitelist(addr1.address, true);
      await expect(
        mgdMarketplace.connect(addr1).mintNft(URI, toWei(max_royalty + 1))
      ).to.be.revertedWithCustomError(
        mgdMarketplace,
        "MGDnftRoyaltyInvalidPercentage"
      );
    });

    it("Should revert with a MGDnftUnauthorized error if some not whitelisted artist try to mint a NFT.", async function () {
      // addr1 try to mint a NFT without be whitelisted
      await expect(
        mgdMarketplace.connect(addr1).mintNft(URI, toWei(5))
      ).to.be.revertedWithCustomError(mgdMarketplace, "MGDnftUnauthorized");
    });
  });
});
