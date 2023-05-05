require("dotenv").config();
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect, use } from "chai";
import { Contract, ContractFactory } from "ethers";
import { ethers } from "hardhat";

const toWei = (num: any) => ethers.utils.parseEther(num.toString());
const fromWei = (num: any) => ethers.utils.formatEther(num);

describe("\nMGDnft.sol Smart Contract \n______________________________________________\n \nThis smart contract is responsible by mint new MGD Nfts. Actually this contract is an ERC721. \n", function () {
  let MGDnft: ContractFactory;
  let mgdNft: Contract;

  let MGDCompany: ContractFactory;
  let mgdCompany: Contract;

  let MGDSplitPayment: ContractFactory;
  let mgdSplitPayment: Contract;

  let deployer: SignerWithAddress;
  let addr1: SignerWithAddress;
  let addr2: SignerWithAddress;
  let addr3: SignerWithAddress;
  let addr4: SignerWithAddress;
  let addr5: SignerWithAddress;
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
    MGDnft = await ethers.getContractFactory("MGDnft");

    [deployer, addr1, addr2, addr3, addr4, addr5, ...addrs] =
      await ethers.getSigners();

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

    mgdNft = await upgrades.deployProxy(MGDnft, [mgdCompany.address], {
      initializer: "initialize",
    });
    await mgdNft.deployed();

    await mgdCompany.connect(deployer).setValidator(deployer.address, true);
  });

  describe("\n--------------- Test related with the mint a splitted NFT functionality ---------------\n", function () {
    it("Should revert with a NumberOfCollaboratorsAndPercentagesNotMatch if the number of collaborators plus one is different of the number of percentages.", async function () {
      await mgdCompany.connect(deployer).whitelist(addr1.address, true);
      await expect(
        mgdNft
          .connect(addr1)
          .splitPayment(
            URI,
            toWei(5),
            [addr2.address, addr3.address],
            [toWei(20), toWei(20)]
          )
      ).to.be.revertedWithCustomError(
        mgdNft,
        "NumberOfCollaboratorsAndPercentagesNotMatch"
      );
    });

    it("Should revert with a TheTotalPercentageCantBeGreaterThan100 if total percentage passed to the spliPayment function surpass 100.", async function () {
      await mgdCompany.connect(deployer).whitelist(addr1.address, true);
      await expect(
        mgdNft
          .connect(addr1)
          .splitPayment(
            URI,
            toWei(5),
            [addr2.address, addr3.address, addr4.address, addr5.address],
            [toWei(20), toWei(20), toWei(20), toWei(20), toWei(21)]
          )
      ).to.be.revertedWithCustomError(
        mgdNft,
        "TheTotalPercentageCantBeGreaterThan100"
      );
    });

    it("Should revert with a TheTotalPercentageCantBeGreaterThan100 if total percentage passed to the spliPayment function is less than 100.", async function () {
      await mgdCompany.connect(deployer).whitelist(addr1.address, true);
      await expect(
        mgdNft
          .connect(addr1)
          .splitPayment(
            URI,
            toWei(5),
            [addr2.address, addr3.address, addr4.address, addr5.address],
            [toWei(20), toWei(20), toWei(20), toWei(20), toWei(19)]
          )
      ).to.be.revertedWithCustomError(
        mgdNft,
        "TheTotalPercentageCantBeGreaterThan100"
      );
    });

    it(`Should call the split payments function correctly.`, async function () {
      await mgdCompany.connect(deployer).whitelist(addr1.address, true);

      let transaction = await mgdNft
        .connect(addr1)
        .splitPayment(
          URI,
          toWei(5),
          [addr2.address, addr3.address, addr4.address, addr5.address],
          [toWei(15), toWei(25), toWei(25), toWei(20), toWei(15)]
        );

      // Wait for the transaction to be finalized
      const receipt = await transaction.wait();
      const tokenId = receipt.events[0].args[2];

      expect(receipt.events[0].event).to.be.equal("Transfer");
      expect(receipt.events[0].args[0]).to.be.equal(
        "0x0000000000000000000000000000000000000000"
      );
      expect(receipt.events[0].args[1]).to.be.equal(addr1.address);
      expect(receipt.events[0].args[2]).to.be.equal(tokenId);

      expect(receipt.events[1].event).to.be.equal("NftMinted");
      expect(receipt.events[1].args[0]).to.be.equal(tokenId);
      expect(receipt.events[1].args[1]).to.be.equal(addr1.address);
      expect(receipt.events[1].args[2]).to.be.equal(URI);
      expect(receipt.events[1].args[3]).to.be.equal(toWei(5));

      expect(receipt.events[2].event).to.be.equal("NftSplitted");
      expect(receipt.events[2].args[0]).to.be.equal(tokenId);
      expect(receipt.events[2].args[1]).to.be.equal(addr1.address);
      expect(JSON.stringify(receipt.events[2].args[2])).to.be.equal(
        JSON.stringify([
          addr2.address,
          addr3.address,
          addr4.address,
          addr5.address,
        ])
      );

      expect(+tokenId).to.be.equal(1);
      expect(await mgdNft.tokenURI(+tokenId)).to.equal(URI);
      expect(await mgdNft.tokenIdArtist(+tokenId)).to.equal(addr1.address);
      expect(await mgdNft.hasTokenCollaborators(+tokenId)).to.equal(true);

      // OWNER
      expect(await mgdNft.ownerOf(+tokenId)).to.equal(addr1.address);

      // COLLABORATORS
      expect(await mgdNft.tokenCollaborators(+tokenId, 0)).to.equal(
        addr2.address
      );
      expect(await mgdNft.tokenCollaborators(+tokenId, 1)).to.equal(
        addr3.address
      );
      expect(await mgdNft.tokenCollaborators(+tokenId, 2)).to.equal(
        addr4.address
      );
      expect(await mgdNft.tokenCollaborators(+tokenId, 3)).to.equal(
        addr5.address
      );

      expect(await mgdNft.tokenIdCollaboratorsPercentage(+tokenId, 0)).to.equal(
        toWei(15)
      );
      expect(await mgdNft.tokenIdCollaboratorsPercentage(+tokenId, 1)).to.equal(
        toWei(25)
      );
      expect(await mgdNft.tokenIdCollaboratorsPercentage(+tokenId, 2)).to.equal(
        toWei(25)
      );
      expect(await mgdNft.tokenIdCollaboratorsPercentage(+tokenId, 3)).to.equal(
        toWei(20)
      );
      expect(await mgdNft.tokenIdCollaboratorsPercentage(+tokenId, 4)).to.equal(
        toWei(15)
      );
    });

    it("Should revert with a MGDnftUnauthorized error if some not whitelisted artist try to mint a NFT.", async function () {
      // addr1 try to mint a NFT without be whitelisted
      await expect(
        mgdNft
          .connect(addr1)
          .splitPayment(
            URI,
            toWei(5),
            [addr2.address, addr3.address, addr4.address, addr5.address],
            [toWei(20), toWei(20), toWei(20), toWei(20), toWei(19)]
          )
      ).to.be.revertedWithCustomError(mgdNft, "MGDnftUnauthorized");
    });
  });
});
