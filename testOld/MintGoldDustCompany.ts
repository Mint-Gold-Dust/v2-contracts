require("dotenv").config();
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect, use } from "chai";
import { Contract, ContractFactory } from "ethers";
import { ethers } from "hardhat";

const toWei = (num: any) => ethers.utils.parseEther(num.toString());
const fromWei = (num: any) => ethers.utils.formatEther(num);

describe("\nMGDCompany.sol Smart Contract \n_________________________________________\n \nThis smart contract is responsible by the functionalities related with MGD Management.\n", function () {
  let MintGoldDustCompany: ContractFactory;
  let mgdCompany: Contract;

  let MintGoldDustERC721: ContractFactory;
  let mintGoldDustERC721: Contract;

  let deployer: SignerWithAddress;
  let addr1: SignerWithAddress;
  let addrs: SignerWithAddress[];

  let URI = "sample URI";

  //const REAL_OWNER = "0x46ab5D1518688f66286aF7c6C9f5552edd050d15";
  const TEST_OWNER = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266";
  const primary_sale_fee_percent_initial = 15000000000000000000n;
  const secondary_sale_fee_percent_initial = 5000000000000000000n;
  const collector_fee_initial = 3000000000000000000n;
  const max_royalty_initial = 20000000000000000000n;
  const auction_duration = 5;
  const auction_extension_duration = 1;

  let primarySaleFeePercent = 15;
  let secondarySaleFeePercent = 5;
  let collectorFee = 3;
  let maxRoyalty = 20;

  const MEMOIR = "This is a great moment of my life!";

  beforeEach(async function () {
    MintGoldDustCompany = await ethers.getContractFactory(
      "MintGoldDustCompany"
    );
    MintGoldDustERC721 = await ethers.getContractFactory("MintGoldDustERC721");

    [deployer, addr1, ...addrs] = await ethers.getSigners();

    mgdCompany = await upgrades.deployProxy(
      MintGoldDustCompany,
      [
        TEST_OWNER,
      ],
      { initializer: "initialize" }
    );
    await mgdCompany.deployed();

    mintGoldDustERC721 = await upgrades.deployProxy(
      MintGoldDustERC721,
      [mgdCompany.address],
      {
        initializer: "initializeChild",
      }
    );
    await mintGoldDustERC721.deployed();

    await mgdCompany.connect(deployer).setValidator(deployer.address, true);
  });

  describe("\n--------------- Tests related with the set validator functionality ---------------\n", function () {
    const valueNewFee = 5;

    it("Should set a new validator if is the owner and this new validator should can whitelist or blacklist an artist.", async () => {
      let gasPrice = await mgdCompany.signer.getGasPrice();
      let gasLimit = await mgdCompany.estimateGas.setValidator(
        addr1.address,
        true
      );

      console.log("\t GAS PRICE: ", gasPrice);
      console.log("\t GAS LIMIT: ", gasLimit);

      console.log(
        "\t\t TOTAL GAS ESTIMATION (USD): ",
        (+ethers.BigNumber.from(gasPrice).mul(gasLimit) / (100 * 10 ** 18)) *
          2500
      );
      // GD owner set a new validator
      await expect(
        mgdCompany.connect(deployer).setValidator(addr1.address, true)
      )
        .to.emit(mgdCompany, "ValidatorAdded")
        .withArgs(addr1.address, true);

      // The new validator should can whitelist
      await expect(mgdCompany.connect(addr1).whitelist(addr1.address, true))
        .to.emit(mgdCompany, "ArtistWhitelisted")
        .withArgs(addr1.address, true);
    });

    it("Should revert with an Ownable error if an address that is not the owner try to set a new validator.", async () => {
      await expect(
        mgdCompany.connect(addr1).setValidator(addr1.address, true)
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });
  });

  describe("\n--------------- Tests related with whitelist/blacklist artist ---------------\n", function () {
    it("Should whitelist an after blacklist artist.", async () => {
      let gasPrice = await mgdCompany.signer.getGasPrice();
      let gasLimit = await mgdCompany.estimateGas.whitelist(
        addr1.address,
        true
      );

      console.log("\t GAS PRICE: ", gasPrice);
      console.log("\t GAS LIMIT: ", gasLimit);

      console.log(
        "\t\t TOTAL GAS ESTIMATION (USD): ",
        (+ethers.BigNumber.from(gasPrice).mul(gasLimit) / (100 * 10 ** 18)) *
          2500
      );
      // MGD owner whitelist the artist
      await expect(mgdCompany.connect(deployer).whitelist(addr1.address, true))
        .to.emit(mgdCompany, "ArtistWhitelisted")
        .withArgs(addr1.address, true);
      await expect(
        await mgdCompany.connect(deployer).isArtistApproved(addr1.address)
      ).to.be.equal(true);

      // MGD owner blacklist the artist
      await expect(mgdCompany.connect(deployer).whitelist(addr1.address, false))
        .to.emit(mgdCompany, "ArtistWhitelisted")
        .withArgs(addr1.address, false);
      expect(
        await mgdCompany.connect(deployer).isArtistApproved(addr1.address)
      ).to.be.equal(false);
    });

    it("Should revert with a Unauthorized error if an address that is not the owner try to whitelist or blacklist an artist.", async () => {
      // MGD owner whitelist the artist
      await expect(
        mgdCompany.connect(addr1).whitelist(addr1.address, true)
      ).to.be.revertedWithCustomError(mgdCompany, "Unauthorized");
    });
  });
});