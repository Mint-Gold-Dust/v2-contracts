require("dotenv").config();
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect, use } from "chai";
import { Contract, ContractFactory } from "ethers";
import { ethers } from "hardhat";

const toWei = (num: any) => ethers.utils.parseEther(num.toString());
const fromWei = (num: any) => ethers.utils.formatEther(num);

describe("MintGoldDustERC1155.sol Smart Contract \n______________________________________________\n \nThis smart contract is responsible by mint new Mint Gold Dust ERC1155 tokens. Actually this contract is an ERC1155. \n", function () {
  let MintGoldDustERC1155: ContractFactory;
  let mintGoldDustERC1155: Contract;

  let MintGoldDustCompany: ContractFactory;
  let mgdCompany: Contract;

  let MintGoldDustMemoir: ContractFactory;
  let mintGoldDustMemoir: Contract;

  let deployer: SignerWithAddress;
  let addr1: SignerWithAddress;
  let addr2: SignerWithAddress;
  let addrs: SignerWithAddress[];

  let baseURI = "https://example.com/{id}.json";
  let max_royalty = 20;

  const MEMOIR = "This is a great moment of my life!";

  // const REAL_OWNER = "0x46ab5D1518688f66286aF7c6C9f5552edd050d15";
  const TEST_OWNER = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266";
  const primary_sale_fee_percent_initial = 15000000000000000000n;
  const secondary_sale_fee_percent_initial = 5000000000000000000n;
  const collector_fee_initial = 3000000000000000000n;
  const max_royalty_initial = 20000000000000000000n;
  const auction_duration = 5;
  const auction_extension_duration = 1;

  beforeEach(async function () {
    MintGoldDustCompany = await ethers.getContractFactory(
      "MintGoldDustCompany"
    );
    MintGoldDustERC1155 = await ethers.getContractFactory(
      "MintGoldDustERC1155"
    );
    MintGoldDustMemoir = await ethers.getContractFactory("MintGoldDustMemoir");

    mintGoldDustMemoir = await MintGoldDustMemoir.deploy();
    await mintGoldDustMemoir.deployed();

    [deployer, addr1, addr2, ...addrs] = await ethers.getSigners();

    mgdCompany = await upgrades.deployProxy(
      MintGoldDustCompany,
      [
        TEST_OWNER,
      ],
      { initializer: "initialize" }
    );
    await mgdCompany.deployed();

    mintGoldDustERC1155 = await upgrades.deployProxy(
      MintGoldDustERC1155,
      [mgdCompany.address, baseURI],
      {
        initializer: "initializeChild",
      }
    );
    await mintGoldDustERC1155.deployed();

    await mgdCompany.connect(deployer).setValidator(deployer.address, true);
  });

  describe("\n--------------- Test related with the constructor ---------------\n", function () {
    it("Should return the correct baseUri", async function () {
      expect(await mintGoldDustERC1155.uri(1)).to.equal(baseURI);
    });
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

      const encoder = new TextEncoder();
      const bytesMemoir = encoder.encode(MEMOIR);

      await expect(
        mintGoldDustERC1155
          .connect(addr1)
          .mintNft("", toWei(5), 10, bytesMemoir)
      )
        .to.emit(mintGoldDustERC1155, "MintGoldDustNFTMinted")
        .withArgs(1, "", addr1.address, toWei(5), 10, false, 0, bytesMemoir);
      expect(await mintGoldDustERC1155.tokenIdArtist(1)).to.equal(
        addr1.address
      );
      expect(await mintGoldDustERC1155.balanceOf(addr1.address, 1)).to.equal(
        10
      );

      let decoder = new TextDecoder();
      let byteArray = ethers.utils.arrayify(
        await mintGoldDustERC1155.tokenIdMemoir(1)
      );

      let memoirStringReturned = decoder.decode(byteArray);

      expect(memoirStringReturned).to.be.equal(MEMOIR);

      console.log(
        "\t ARTIST BALANCE AFTER MINT: ",
        parseFloat(parseFloat(fromWei(await addr1.getBalance())).toFixed(5))
      );

      console.log(
        "\t \tSo the gas estimation was more less in USD:",
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

      await expect(
        mintGoldDustERC1155.connect(addr2).mintNft("", toWei(5), 5, bytesMemoir)
      )
        .to.emit(mintGoldDustERC1155, "MintGoldDustNFTMinted")
        .withArgs(2, "", addr2.address, toWei(5), 5, false, 0, bytesMemoir);
      expect(await mintGoldDustERC1155.tokenIdArtist(2)).to.equal(
        addr2.address
      );
      expect(await mintGoldDustERC1155.balanceOf(addr2.address, 2)).to.equal(5);

      decoder = new TextDecoder();
      byteArray = ethers.utils.arrayify(
        await mintGoldDustERC1155.tokenIdMemoir(2)
      );

      memoirStringReturned = decoder.decode(byteArray);

      expect(memoirStringReturned).to.be.equal(MEMOIR);

      expect(
        await mintGoldDustERC1155.connect(addr1).tokenIdRoyaltyPercent(1)
      ).to.be.equal(toWei(5));
      expect(
        await mintGoldDustERC1155.connect(addr1).tokenIdRoyaltyPercent(2)
      ).to.be.equal(toWei(5));
    });

    it(`Should revert with a RoyaltyInvalidPercentage error if some artist try to mint with a royalty percent greater than ${max_royalty}.`, async function () {
      await mgdCompany.connect(deployer).whitelist(addr1.address, true);

      const encoder = new TextEncoder();
      const bytesMemoir = encoder.encode(MEMOIR);

      await expect(
        mintGoldDustERC1155
          .connect(addr1)
          .mintNft("", toWei(max_royalty + 1), 5, bytesMemoir)
      ).to.be.revertedWithCustomError(
        mintGoldDustERC1155,
        "RoyaltyInvalidPercentage"
      );
    });

    it("Should revert with a UnauthorizedOnNFT error if some not whitelisted artist try to mint a NFT.", async function () {
      // addr1 try to mint a NFT without be whitelisted

      const encoder = new TextEncoder();
      const bytesMemoir = encoder.encode(MEMOIR);

      await expect(
        mintGoldDustERC1155.connect(addr1).mintNft("", toWei(5), 5, bytesMemoir)
      )
        .to.be.revertedWithCustomError(mintGoldDustERC1155, "UnauthorizedOnNFT")
        .withArgs("ARTIST");
    });

    it("Should revert when non-owner tries to pause the contract", async function () {
      await expect(mintGoldDustERC1155.connect(addr1).pauseContract())
        .to.be.revertedWithCustomError(mintGoldDustERC1155, "UnauthorizedOnNFT")
        .withArgs("OWNER");
    });

    it("Owner should be able to pause the contract", async function () {
      await mintGoldDustERC1155.connect(deployer).pauseContract();

      await expect(await mintGoldDustERC1155.paused()).to.equal(true);
    });

    it("Should revert when non-owner tries to unpause the contract", async function () {
      await mintGoldDustERC1155.connect(deployer).pauseContract();
      await expect(mintGoldDustERC1155.connect(addr1).unpauseContract())
        .to.be.revertedWithCustomError(mintGoldDustERC1155, "UnauthorizedOnNFT")
        .withArgs("OWNER");
    });

    it("Owner should be able to unpause the contract", async function () {
      await mintGoldDustERC1155.connect(deployer).pauseContract();
      await mintGoldDustERC1155.connect(deployer).unpauseContract();

      await expect(await mintGoldDustERC1155.paused()).to.equal(false);
    });

    it("Should revert when trying to mint a NFT while the contract is paused", async function () {
      // Assuming addr1 is a whitelisted artist
      await mgdCompany.connect(deployer).whitelist(addr1.address, true);

      const encoder = new TextEncoder();
      const bytesMemoir = encoder.encode(MEMOIR);

      // Pause the contract
      await mintGoldDustERC1155.connect(deployer).pauseContract();

      await expect(
        mintGoldDustERC1155.connect(addr1).mintNft("", toWei(5), 5, bytesMemoir)
      ).to.be.reverted; // Assuming that your mintNft function reverts the transaction when the contract is paused
    });
  });
});
