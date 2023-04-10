require("dotenv").config();
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect, use } from "chai";
import { Contract, ContractFactory } from "ethers";
import { ethers, upgrades } from "hardhat";

const toWei = (num: any) => ethers.utils.parseEther(num.toString());
const fromWei = (num: any) => ethers.utils.formatEther(num);

describe("MGDCompany.sol Smart Contract \n___________________________\n \nThis smart contract is responsible by the functionalities related with MGD Management.\n", function () {
  let MGDCompany: ContractFactory;
  let mgdCompany: Contract;

  let MGDnft: ContractFactory;
  let mgdNft: Contract;

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

  let primarySaleFeePercent = 15;
  let secondarySaleFeePercent = 5;
  let collectorFee = 3;
  let maxRoyalty = 20;

  beforeEach(async function () {
    MGDCompany = await ethers.getContractFactory("MGDCompany");
    MGDnft = await ethers.getContractFactory("MGDnft");

    [deployer, addr1, ...addrs] = await ethers.getSigners();

    mgdCompany = await MGDCompany.deploy(
      TEST_OWNER,
      primary_sale_fee_percent_initial,
      secondary_sale_fee_percent_initial,
      collector_fee_initial,
      max_royalty_initial
    );

    mgdNft = await MGDnft.deploy(mgdCompany.address);

    await mgdCompany.connect(deployer).setValidator(deployer.address, true);
  });

  describe("Tests related with the set validator functionality:", function () {
    const valueNewFee = 5;

    it("Should set a new validator if is the owner and this new validator should can whitelist or blacklist an artist.", async () => {
      // GD owner set a new validator
      expect(
        await mgdCompany.connect(deployer).setValidator(addr1.address, true)
      )
        .to.emit(mgdCompany, "ValidatorAdded")
        .withArgs(addr1.address, true);

      // The new validator should can whitelist
      expect(await mgdCompany.connect(addr1).whitelist(addr1.address, true))
        .to.emit(mgdCompany, "ArtistWhitelisted")
        .withArgs(addr1.address, true);
    });

    it("Should revert with a MGDCompanyUnauthorized error if an address that is not the owner try to set a new validator.", async () => {
      await expect(
        mgdCompany.connect(addr1).setValidator(addr1.address, true)
      ).to.be.revertedWithCustomError(mgdCompany, "MGDCompanyUnauthorized");
    });
  });

  describe("Tests related with whitelist/blacklist artist:", function () {
    it("Should whitelist an after blacklist artist.", async () => {
      // MGD owner whitelist the artist
      expect(await mgdCompany.connect(deployer).whitelist(addr1.address, true))
        .to.emit(mgdCompany, "ArtistWhitelisted")
        .withArgs(addr1.address, true);
      expect(
        await mgdCompany.connect(deployer).isArtistApproved(addr1.address)
      ).to.be.equal(true);

      // MGD owner blacklist the artist
      expect(await mgdCompany.connect(deployer).whitelist(addr1.address, false))
        .to.emit(mgdCompany, "ArtistWhitelisted")
        .withArgs(addr1.address, false);
      expect(
        await mgdCompany.connect(deployer).isArtistApproved(addr1.address)
      ).to.be.equal(false);
    });

    it("Should revert with a MGDCompanyUnauthorized error if an address that is not the owner try to whitelist or blacklist an artist.", async () => {
      // MGD owner whitelist the artist
      await expect(
        mgdCompany.connect(addr1).whitelist(addr1.address, true)
      ).to.be.revertedWithCustomError(mgdCompany, "MGDCompanyUnauthorized");
    });
  });

  describe("Tests related with the ypdate primary sale fee functionality:", function () {
    const valueNewFee = 30;

    it("Should update the fee if is the owner.", async () => {
      expect(await mgdCompany.primarySaleFeePercent()).to.be.equal(
        toWei(primarySaleFeePercent)
      );

      // GD owner update the primary fee
      await mgdCompany
        .connect(deployer)
        .updatePrimarySaleFeePercent(toWei(valueNewFee));

      expect(await mgdCompany.primarySaleFeePercent()).to.be.equal(
        toWei(valueNewFee)
      );
    });

    it("Should revert with a MGDCompanyUnauthorized error if an address that is not the owner try to update the primary sale fee.", async () => {
      // MGD owner whitelist the artist
      await expect(
        mgdCompany
          .connect(addr1)
          .updatePrimarySaleFeePercent(toWei(valueNewFee))
      ).to.be.revertedWithCustomError(mgdCompany, "MGDCompanyUnauthorized");
    });
  });

  describe("Tests related with the update secondary sale fee functionality:", function () {
    const valueNewFee = 10;

    it("Should update the secondary fee if is the owner.", async () => {
      expect(await mgdCompany.secondarySaleFeePercent()).to.be.equal(
        toWei(secondarySaleFeePercent)
      );

      // GD owner update the secondary fee
      await mgdCompany
        .connect(deployer)
        .updateSecondarySaleFeePercent(toWei(valueNewFee));

      expect(await mgdCompany.secondarySaleFeePercent()).to.be.equal(
        toWei(valueNewFee)
      );
    });

    it("Should revert with a MGDCompanyUnauthorized error if an address that is not the owner try to update the secondary sale fee.", async () => {
      await expect(
        mgdCompany
          .connect(addr1)
          .updatePrimarySaleFeePercent(toWei(valueNewFee))
      ).to.be.revertedWithCustomError(mgdCompany, "MGDCompanyUnauthorized");
    });
  });

  describe("Tests related with the update collector fee functionality:", function () {
    const valueNewFee = 5;

    it("Should update the collector fee if is the owner.", async () => {
      expect(await mgdCompany.collectorFee()).to.be.equal(toWei(collectorFee));

      // GD owner update the collector fee
      await mgdCompany.connect(deployer).updateCollectorFee(toWei(valueNewFee));

      expect(await mgdCompany.collectorFee()).to.be.equal(toWei(valueNewFee));
    });

    it("Should revert with a MGDCompanyUnauthorized error if an address that is not the owner try to update the collector fee.", async () => {
      await expect(
        mgdCompany.connect(addr1).updateCollectorFee(toWei(valueNewFee))
      ).to.be.revertedWithCustomError(mgdCompany, "MGDCompanyUnauthorized");
    });
  });

  describe("Tests related with the update max royalty fee functionality:", function () {
    const valueNewFee = 25;

    it("Should update the max_royalty_fee if is the owner.", async () => {
      expect(await mgdCompany.maxRoyalty()).to.be.equal(toWei(maxRoyalty));

      // GD owner update the max_royalty_fee
      await mgdCompany.connect(deployer).updateMaxRoyalty(toWei(valueNewFee));

      expect(await mgdCompany.maxRoyalty()).to.be.equal(toWei(valueNewFee));
    });

    it("Should revert with a MGDCompanyUnauthorized error if an address that is not the owner try to update the collector fee.", async () => {
      await expect(
        mgdCompany.connect(addr1).updateMaxRoyalty(toWei(valueNewFee))
      ).to.be.revertedWithCustomError(mgdCompany, "MGDCompanyUnauthorized");
    });

    it(`Should be possible to mint a NFT with a new maximum royalty set.`, async function () {
      // GD owner update the max_royalty_fee
      await mgdCompany.connect(deployer).updateMaxRoyalty(toWei(valueNewFee));

      await mgdCompany.connect(deployer).whitelist(addr1.address, true);

      await mgdNft.connect(addr1).mintNft(URI, toWei(valueNewFee));
    });

    it(`Should revert with a MGDnftRoyaltyInvalidPercentage error if some artist try to mint with a royalty percent greater than new max royalty that is ${valueNewFee}.`, async function () {
      // GD owner update the max_royalty_fee
      await mgdCompany.connect(deployer).updateMaxRoyalty(toWei(valueNewFee));

      await mgdCompany.connect(deployer).whitelist(addr1.address, true);

      await expect(
        mgdNft.connect(addr1).mintNft(URI, toWei(valueNewFee + 1))
      ).to.be.revertedWithCustomError(mgdNft, "MGDnftRoyaltyInvalidPercentage");
    });
  });
});