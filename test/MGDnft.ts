require("dotenv").config();
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect, use } from "chai";
import { Contract, ContractFactory } from "ethers";
import { ethers } from "hardhat";

const toWei = (num: any) => ethers.utils.parseEther(num.toString());
const fromWei = (num: any) => ethers.utils.formatEther(num);

describe("\nMGDnft.sol Smart Contract \n______________________________________________\n \nThis smart contract is responsible by mint new MGD Nfts. Actually this contract is an ERC721. \n", function () {
  let MintGoldDustERC721: ContractFactory;
  let mintGoldDustERC721: Contract;

  let MGDCompany: ContractFactory;
  let mgdCompany: Contract;

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
    MGDCompany = await ethers.getContractFactory("MGDCompany");
    MintGoldDustERC721 = await ethers.getContractFactory("MintGoldDustERC721");

    [deployer, addr1, addr2, ...addrs] = await ethers.getSigners();

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

    await mgdCompany.connect(deployer).setValidator(deployer.address, true);
  });

  describe("\n--------------- Test related with the mint NFT functionality ---------------\n", function () {
    it("Should track each minted NFT. This is verifying if: \n \t - The tokenURI was set correctly. \n \t - The tokenId was bound with the artist for future royalties payments. \n \t - The artist is the owner of the token. \n \t - The royalty percentage was set correctly. \n \t - The balanceOf the artists that mint an NFT was increased.", async function () {
      console.log(
        "\t ARTIST BALANCE BEFORE MINT: ",
        parseFloat(parseFloat(fromWei(await addr1.getBalance())).toFixed(5))
      );
      let artistBalanceBefore = await addr1.getBalance();

      // addr1 mints a nft
      await mgdCompany.connect(deployer).whitelist(addr1.address, true);
      await expect(mintGoldDustERC721.connect(addr1).mintNft(URI, toWei(5)))
        .to.emit(mintGoldDustERC721, "NftMinted")
        .withArgs(1, addr1.address, URI, toWei(5));
      expect(await mintGoldDustERC721.tokenURI(1)).to.equal(URI);
      expect(await mintGoldDustERC721.tokenIdArtist(1)).to.equal(addr1.address);
      expect(await mintGoldDustERC721.ownerOf(1)).to.equal(addr1.address);
      expect(await mintGoldDustERC721.ownerOf(1)).to.equal(addr1.address);

      console.log(
        "\t ARTIST BALANCE AFTER MINT: ",
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

      // addr2 mints a nft
      await mgdCompany.connect(deployer).whitelist(addr2.address, true);
      await expect(mintGoldDustERC721.connect(addr2).mintNft(URI, toWei(5)))
        .to.emit(mintGoldDustERC721, "NftMinted")
        .withArgs(2, addr2.address, URI, toWei(5));
      expect(await mintGoldDustERC721.tokenURI(2)).to.equal(URI);
      expect(await mintGoldDustERC721.tokenIdArtist(2)).to.equal(addr2.address);
      expect(await mintGoldDustERC721.ownerOf(2)).to.equal(addr2.address);

      // addr1 mints another nft
      await expect(mintGoldDustERC721.connect(addr1).mintNft(URI, toWei(5)))
        .to.emit(mintGoldDustERC721, "NftMinted")
        .withArgs(3, addr1.address, URI, toWei(5));
      expect(await mintGoldDustERC721.tokenURI(3)).to.equal(URI);
      expect(await mintGoldDustERC721.tokenIdArtist(3)).to.equal(addr1.address);
      expect(await mintGoldDustERC721.ownerOf(3)).to.equal(addr1.address);

      expect(await mintGoldDustERC721.balanceOf(addr1.address)).to.be.equal(2);
      expect(await mintGoldDustERC721.balanceOf(addr2.address)).to.be.equal(1);

      expect(
        await mintGoldDustERC721.connect(addr1).tokenIdRoyaltyPercent(1)
      ).to.be.equal(toWei(5));
      expect(
        await mintGoldDustERC721.connect(addr1).tokenIdRoyaltyPercent(2)
      ).to.be.equal(toWei(5));
      expect(
        await mintGoldDustERC721.connect(addr1).tokenIdRoyaltyPercent(3)
      ).to.be.equal(toWei(5));
    });

    it(`Should revert with a MGDnftRoyaltyInvalidPercentage error if some artist try to mint with a royalty percent greater than ${max_royalty}.`, async function () {
      await mgdCompany.connect(deployer).whitelist(addr1.address, true);
      await expect(
        mintGoldDustERC721.connect(addr1).mintNft(URI, toWei(max_royalty + 1))
      ).to.be.revertedWithCustomError(
        mintGoldDustERC721,
        "MGDnftRoyaltyInvalidPercentage"
      );
    });

    it("Should revert with a MGDnftUnauthorized error if some not whitelisted artist try to mint a NFT.", async function () {
      // addr1 try to mint a NFT without be whitelisted
      await expect(
        mintGoldDustERC721.connect(addr1).mintNft(URI, toWei(5))
      ).to.be.revertedWithCustomError(mintGoldDustERC721, "MGDnftUnauthorized");
    });
  });
});
