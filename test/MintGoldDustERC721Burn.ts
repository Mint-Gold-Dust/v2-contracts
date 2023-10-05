require("dotenv").config();
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect, use } from "chai";
import { Contract, ContractFactory } from "ethers";
import { ethers, upgrades } from "hardhat";
import chai from "chai";
import chaiAsPromised from "chai-as-promised";

chai.use(chaiAsPromised);

const toWei = (num: any) => ethers.utils.parseEther(num.toString());
const fromWei = (num: any) => ethers.utils.formatEther(num);

describe("MintGoldDustSetPrice.sol Smart Contract \n___________________________________________________\n \nThis smart contract is responsible by all functionalities related with the fixed price market. \n Here goes the tests related with the MintGoldDustSetPrice market and the MintGoldDustERC721 tokens. \n\n", function () {
  let MintGoldDustERC721: ContractFactory;
  let mintGoldDustERC721: Contract;

  let MintGoldDustERC1155: ContractFactory;
  let mintGoldDustERC1155: Contract;

  let MintGoldDustCompany: ContractFactory;
  let mgdCompany: Contract;

  let MintGoldDustSetPrice: ContractFactory;
  let mintGoldDustSetPrice: Contract;

  let MintGoldDustMemoir: ContractFactory;
  let mintGoldDustMemoir: Contract;

  let MintGoldDustMarketplaceAuction: ContractFactory;
  let mintGoldDustMarketplaceAuction: Contract;

  let deployer: SignerWithAddress;
  let addr1: SignerWithAddress;
  let addr2: SignerWithAddress;
  let addr3: SignerWithAddress;
  let addrs: SignerWithAddress[];

  let URI = "sample URI";
  let baseURI = "https://example.com/{id}.json";

  const MEMOIR = "This is a great moment of my life!";

  //const REAL_OWNER = "0x46ab5D1518688f66286aF7c6C9f5552edd050d15";
  const TEST_OWNER = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266";
  const primary_sale_fee_percent_initial = 15000000000000000000n;
  const secondary_sale_fee_percent_initial = 5000000000000000000n;
  const collector_fee_initial = 3000000000000000000n;
  const max_royalty_initial = 20000000000000000000n;
  const auction_duration = 5;
  const auction_extension_duration = 1;

  let primary_sale_fee_percent = 15;
  let secondary_sale_fee_percent = 5;
  let collector_fee = 3;
  let max_royalty = 20;
  let royalty = 5;

  beforeEach(async function () {
    MintGoldDustCompany = await ethers.getContractFactory(
      "MintGoldDustCompany"
    );

    MintGoldDustMarketplaceAuction = await ethers.getContractFactory(
      "MintGoldDustMarketplaceAuction"
    );

    MintGoldDustERC721 = await ethers.getContractFactory("MintGoldDustERC721");

    MintGoldDustSetPrice = await ethers.getContractFactory(
      "MintGoldDustSetPrice"
    );

    MintGoldDustERC1155 = await ethers.getContractFactory(
      "MintGoldDustERC1155"
    );

    MintGoldDustMemoir = await ethers.getContractFactory("MintGoldDustMemoir");

    mintGoldDustMemoir = await MintGoldDustMemoir.deploy();
    await mintGoldDustMemoir.deployed();

    [deployer, addr1, addr2, addr3, ...addrs] = await ethers.getSigners();

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

    mintGoldDustERC1155 = await upgrades.deployProxy(
      MintGoldDustERC1155,
      [mgdCompany.address, baseURI],
      {
        initializer: "initializeChild",
      }
    );
    await mintGoldDustERC1155.deployed();

    mintGoldDustSetPrice = await upgrades.deployProxy(
      MintGoldDustSetPrice,
      [
        mgdCompany.address,
        mintGoldDustERC721.address,
        mintGoldDustERC1155.address,
      ],
      { initializer: "initializeChild" }
    );
    await mintGoldDustSetPrice.deployed();

    mintGoldDustMarketplaceAuction = await upgrades.deployProxy(
      MintGoldDustMarketplaceAuction,
      [
        mgdCompany.address,
        mintGoldDustERC721.address,
        mintGoldDustERC1155.address,
      ],
      { initializer: "initializeChild" }
    );
    await mintGoldDustMarketplaceAuction.deployed();

    await mgdCompany.connect(deployer).setValidator(deployer.address, true);

    await mintGoldDustERC1155
      .connect(deployer)
      .setMintGoldDustSetPriceAddress(mintGoldDustSetPrice.address);

    await mintGoldDustERC721
      .connect(deployer)
      .setMintGoldDustSetPriceAddress(mintGoldDustSetPrice.address);

    await mintGoldDustERC1155
      .connect(deployer)
      .setMintGoldDustMarketplaceAuctionAddress(
        mintGoldDustMarketplaceAuction.address
      );

    await mintGoldDustERC721
      .connect(deployer)
      .setMintGoldDustMarketplaceAuctionAddress(
        mintGoldDustMarketplaceAuction.address
      );

    await mintGoldDustMarketplaceAuction
      .connect(deployer)
      .setMintGoldDustMarketplace(mintGoldDustSetPrice.address);

    await mintGoldDustSetPrice
      .connect(deployer)
      .setMintGoldDustMarketplace(mintGoldDustMarketplaceAuction.address);
  });

  describe("\n--------------- Test related with the burn NFT functionality ---------------\n", function () {
    it("should allow token owner to burn token", async function () {
      // Setup: Whitelist and Mint a new token with tokenId = 1 for addr1
      await mgdCompany.connect(deployer).whitelist(addr1.address, true);
      const encoder = new TextEncoder();
      const bytesMemoir = encoder.encode("Some Memoir"); // Replace "Some Memoir" with your actual memoir data
      await mintGoldDustERC721
        .connect(addr1)
        .mintNft("SomeURI", ethers.utils.parseEther("5"), 1, bytesMemoir);

      // Initially check ownership
      const initialOwner = await mintGoldDustERC721.ownerOf(1);
      expect(initialOwner).to.equal(addr1.address);

      // Burn the token
      await expect(mintGoldDustERC721.connect(addr1).burnToken(1))
        .to.emit(mintGoldDustERC721, "Transfer") // Replace "Transfer" with your actual event if different
        .withArgs(addr1.address, ethers.constants.AddressZero, 1);

      // Check that the token is burned (owner should be zero address)
      await expect(mintGoldDustERC721.ownerOf(1)).to.be.revertedWith(
        "ERC721: invalid token ID"
      ); // Replace with your actual error message
    });

    it("should allow contract owner to burn any token", async function () {
      // Setup: Whitelist and Mint a new token with tokenId = 2 for addr1
      await mgdCompany.connect(deployer).whitelist(addr1.address, true);
      const encoder = new TextEncoder();
      const bytesMemoir = encoder.encode("Another Memoir"); // Replace with your actual memoir data
      await mintGoldDustERC721
        .connect(addr1)
        .mintNft("AnotherURI", ethers.utils.parseEther("5"), 1, bytesMemoir);

      // Initially check ownership
      const initialOwner = await mintGoldDustERC721.ownerOf(1);
      expect(initialOwner).to.equal(addr1.address);

      // Burn the token using contract owner (assumed to be deployer)
      await expect(mintGoldDustERC721.connect(deployer).burnToken(1))
        .to.emit(mintGoldDustERC721, "Transfer") // Replace "Transfer" with your actual event if different
        .withArgs(addr1.address, ethers.constants.AddressZero, 1);

      // Check that the token is burned (owner should be zero address)
      await expect(mintGoldDustERC721.ownerOf(1)).to.be.revertedWith(
        "ERC721: invalid token ID"
      ); // Replace with your actual error message
    });

    it("should allow approved address to burn token", async function () {
      // Setup: Whitelist and Mint a new token with tokenId = 3 for addr1
      await mgdCompany.connect(deployer).whitelist(addr1.address, true);
      const encoder = new TextEncoder();
      const bytesMemoir = encoder.encode("Yet Another Memoir"); // Replace with your actual memoir data
      await mintGoldDustERC721
        .connect(addr1)
        .mintNft("YetAnotherURI", ethers.utils.parseEther("5"), 1, bytesMemoir);

      // Initially check ownership
      const initialOwner = await mintGoldDustERC721.ownerOf(1);
      expect(initialOwner).to.equal(addr1.address);

      // Approve addr2 for tokenId = 1
      await mintGoldDustERC721.connect(addr1).approve(addr2.address, 1);
      const approvedAddress = await mintGoldDustERC721.getApproved(1);
      expect(approvedAddress).to.equal(addr2.address);

      // Burn the token using the approved address (addr2)
      await expect(mintGoldDustERC721.connect(addr2).burnToken(1))
        .to.emit(mintGoldDustERC721, "Transfer") // Replace "Transfer" with your actual event if different
        .withArgs(addr1.address, ethers.constants.AddressZero, 1);

      // Check that the token is burned (owner should be zero address)
      await expect(mintGoldDustERC721.ownerOf(1)).to.be.revertedWith(
        "ERC721: invalid token ID"
      ); // Replace with your actual error message
    });

    it("should not allow non-owner to burn token", async function () {
      // Setup: Whitelist and Mint a new token for addr1
      await mgdCompany.connect(deployer).whitelist(addr1.address, true);
      const encoder = new TextEncoder();
      const bytesMemoir = encoder.encode("Unprivileged Memoir"); // Replace with your actual memoir data
      await mintGoldDustERC721
        .connect(addr1)
        .mintNft(
          "UnprivilegedURI",
          ethers.utils.parseEther("5"),
          1,
          bytesMemoir
        );

      // Initially check ownership
      const initialOwner = await mintGoldDustERC721.ownerOf(1);
      expect(initialOwner).to.equal(addr1.address);

      // Attempt to burn the token using a non-owner (addr3) should fail
      await expect(
        mintGoldDustERC721.connect(addr3).burnToken(1)
      ).to.be.revertedWith("Only creator or allowed");
    });

    it("should not allow non-contract owner to burn token they don't own", async function () {
      // Setup: Whitelist and Mint a new token for addr1
      await mgdCompany.connect(deployer).whitelist(addr1.address, true);
      const encoder = new TextEncoder();
      const bytesMemoir = encoder.encode("Owned by addr1"); // Replace with your actual memoir data
      await mintGoldDustERC721
        .connect(addr1)
        .mintNft(
          "OwnedByAddr1URI",
          ethers.utils.parseEther("5"),
          1,
          bytesMemoir
        );

      // Initially check ownership
      const initialOwner = await mintGoldDustERC721.ownerOf(1);
      expect(initialOwner).to.equal(addr1.address);

      // Attempt to burn the token using addr2 (who doesn't own the token)
      await expect(
        mintGoldDustERC721.connect(addr2).burnToken(1)
      ).to.be.revertedWith("Only creator or allowed");
    });

    it("should not allow burning a non-existent token", async function () {
      // Try to burn a token with a tokenId that has not been minted
      await expect(
        mintGoldDustERC721.connect(addr1).burnToken(99)
      ).to.be.revertedWith("ERC721: invalid token ID"); // Replace with your actual error message
    });

    it("should not allow transferring a burned token", async function () {
      // Setup: Whitelist and Mint a new token for addr1
      await mgdCompany.connect(deployer).whitelist(addr1.address, true);
      const encoder = new TextEncoder();
      const bytesMemoir = encoder.encode("Soon to be burned"); // Replace with your actual memoir data
      await mintGoldDustERC721
        .connect(addr1)
        .mintNft(
          "SoonToBeBurnedURI",
          ethers.utils.parseEther("5"),
          1,
          bytesMemoir
        );

      // Initially check ownership
      const initialOwner = await mintGoldDustERC721.ownerOf(1);
      expect(initialOwner).to.equal(addr1.address);

      // Burn the token
      await mintGoldDustERC721.connect(addr1).burnToken(1);

      // Attempt to transfer the burned token should fail
      await expect(
        mintGoldDustERC721
          .connect(addr1)
          .transferFrom(addr1.address, addr2.address, 1)
      ).to.be.revertedWith("ERC721: invalid token ID"); // Replace with your actual error message
    });

    it("should not allow re-burning an already burned token", async function () {
      // Setup: Whitelist and Mint a new token for addr1
      await mgdCompany.connect(deployer).whitelist(addr1.address, true);
      const encoder = new TextEncoder();
      const bytesMemoir = encoder.encode("Burn me once"); // Replace with your actual memoir data
      await mintGoldDustERC721
        .connect(addr1)
        .mintNft("BurnMeOnceURI", ethers.utils.parseEther("5"), 1, bytesMemoir);

      // Initially check ownership
      const initialOwner = await mintGoldDustERC721.ownerOf(1);
      expect(initialOwner).to.equal(addr1.address);

      // Burn the token
      await mintGoldDustERC721.connect(addr1).burnToken(1);

      // Attempt to re-burn the already burned token should fail
      await expect(
        mintGoldDustERC721.connect(addr1).burnToken(1)
      ).to.be.revertedWith("ERC721: invalid token ID"); // Replace with your actual error message
    });

    it("should not allow burn an listed token for set price", async function () {
      // Setup: Whitelist and Mint a new token for addr1
      await mgdCompany.connect(deployer).whitelist(addr1.address, true);
      const encoder = new TextEncoder();
      const bytesMemoir = encoder.encode("Burn me once"); // Replace with your actual memoir data
      await mintGoldDustERC721
        .connect(addr1)
        .mintNft("BurnMeOnceURI", ethers.utils.parseEther("5"), 1, bytesMemoir);

      // Initially check ownership
      const initialOwner = await mintGoldDustERC721.ownerOf(1);
      expect(initialOwner).to.equal(addr1.address);

      await mintGoldDustERC721
        .connect(addr1)
        .setApprovalForAll(mintGoldDustSetPrice.address, true);

      await mintGoldDustSetPrice
        .connect(addr1)
        .list(1, 1, mintGoldDustERC721.address, toWei(1));

      // check ownership
      const marketOwnerNow = await mintGoldDustERC721.ownerOf(1);
      expect(marketOwnerNow).to.equal(mintGoldDustSetPrice.address);

      // Attempt to re-burn the already burned token should fail
      await expect(
        mintGoldDustERC721.connect(addr1).burnToken(1)
      ).to.be.revertedWith("Only creator or allowed"); // Replace with your actual error message
    });

    it("should allow burn an delisted token from set price market", async function () {
      // Setup: Whitelist and Mint a new token for addr1
      await mgdCompany.connect(deployer).whitelist(addr1.address, true);
      const encoder = new TextEncoder();
      const bytesMemoir = encoder.encode("Burn me once"); // Replace with your actual memoir data
      await mintGoldDustERC721
        .connect(addr1)
        .mintNft("BurnMeOnceURI", ethers.utils.parseEther("5"), 1, bytesMemoir);

      // Initially check ownership
      const initialOwner = await mintGoldDustERC721.ownerOf(1);
      expect(initialOwner).to.equal(addr1.address);

      await mintGoldDustERC721
        .connect(addr1)
        .setApprovalForAll(mintGoldDustSetPrice.address, true);

      await mintGoldDustSetPrice
        .connect(addr1)
        .list(1, 1, mintGoldDustERC721.address, toWei(1));

      // check ownership
      const marketOwnerNow = await mintGoldDustERC721.ownerOf(1);
      expect(marketOwnerNow).to.equal(mintGoldDustSetPrice.address);

      await mintGoldDustSetPrice.connect(addr1).delistNft({
        tokenId: 1,
        amount: 1,
        contractAddress: mintGoldDustERC721.address,
      });

      const finalOwner = await mintGoldDustERC721.ownerOf(1);
      expect(finalOwner).to.equal(addr1.address);

      // Attempt to re-burn the already burned token should fail
      await mintGoldDustERC721.connect(addr1).burnToken(1);
    });

    it("should allow burn an token that was listed for auction but after cancelled", async function () {
      // Setup: Whitelist and Mint a new token for addr1
      await mgdCompany.connect(deployer).whitelist(addr1.address, true);
      const encoder = new TextEncoder();
      const bytesMemoir = encoder.encode("Burn me once"); // Replace with your actual memoir data

      await mintGoldDustERC721
        .connect(addr1)
        .mintNft("BurnMeOnceURI", toWei(5), 1, bytesMemoir);

      // Initially check ownership
      const initialOwner = await mintGoldDustERC721.ownerOf(1);
      expect(initialOwner).to.equal(addr1.address);

      // Artist approve gdMarketPlace marketplace to exchange its MintGoldDustER721
      await mintGoldDustERC721
        .connect(addr1)
        .setApprovalForAll(mintGoldDustMarketplaceAuction.address, true);

      await mintGoldDustMarketplaceAuction
        .connect(addr1)
        .list(1, 1, mintGoldDustERC721.address, toWei(10));

      // check ownership
      const marketOwnerNow = await mintGoldDustERC721.ownerOf(1);
      expect(marketOwnerNow).to.equal(mintGoldDustMarketplaceAuction.address);

      // Attempt to re-burn the already burned token should fail
      await expect(
        mintGoldDustERC721.connect(addr1).burnToken(1)
      ).to.be.revertedWith("Only creator or allowed"); // Replace with your actual error message
    });

    it("should not allow burn an listed token for auction", async function () {
      // Setup: Whitelist and Mint a new token for addr1
      await mgdCompany.connect(deployer).whitelist(addr1.address, true);
      const encoder = new TextEncoder();
      const bytesMemoir = encoder.encode("Burn me once"); // Replace with your actual memoir data

      await mintGoldDustERC721
        .connect(addr1)
        .mintNft("BurnMeOnceURI", toWei(5), 1, bytesMemoir);

      // Initially check ownership
      const initialOwner = await mintGoldDustERC721.ownerOf(1);
      expect(initialOwner).to.equal(addr1.address);

      // Artist approve gdMarketPlace marketplace to exchange its MintGoldDustER721
      await mintGoldDustERC721
        .connect(addr1)
        .setApprovalForAll(mintGoldDustMarketplaceAuction.address, true);

      await mintGoldDustMarketplaceAuction
        .connect(addr1)
        .list(1, 1, mintGoldDustERC721.address, toWei(10));

      // check ownership
      const marketOwnerNow = await mintGoldDustERC721.ownerOf(1);
      expect(marketOwnerNow).to.equal(mintGoldDustMarketplaceAuction.address);

      await mintGoldDustMarketplaceAuction
        .connect(addr1)
        .cancelAuction(1, mintGoldDustERC721.address);

      // Initially check ownership
      const finalOwner = await mintGoldDustERC721.ownerOf(1);
      expect(finalOwner).to.equal(addr1.address);

      // Attempt to re-burn the already burned token should fail
      await mintGoldDustERC721.connect(addr1).burnToken(1);
    });

    it("should allow burn an token that was listed for auction but after cancelled", async function () {
      // Setup: Whitelist and Mint a new token for addr1
      await mgdCompany.connect(deployer).whitelist(addr1.address, true);
      const encoder = new TextEncoder();
      const bytesMemoir = encoder.encode("Burn me once"); // Replace with your actual memoir data

      await mintGoldDustERC721
        .connect(addr1)
        .mintNft("BurnMeOnceURI", toWei(5), 1, bytesMemoir);

      // Initially check ownership
      const initialOwner = await mintGoldDustERC721.ownerOf(1);
      expect(initialOwner).to.equal(addr1.address);

      // Artist approve gdMarketPlace marketplace to exchange its MintGoldDustER721
      await mintGoldDustERC721
        .connect(addr1)
        .setApprovalForAll(mintGoldDustMarketplaceAuction.address, true);

      await mintGoldDustMarketplaceAuction
        .connect(addr1)
        .list(1, 1, mintGoldDustERC721.address, toWei(10));

      // check ownership
      const marketOwnerNow = await mintGoldDustERC721.ownerOf(1);
      expect(marketOwnerNow).to.equal(mintGoldDustMarketplaceAuction.address);

      // Attempt to re-burn the already burned token should fail
      await mintGoldDustERC721.connect(deployer).burnToken(1);
    });

    it("should emit the correct events", async function () {
      // Setup: Whitelist and Mint a new token for addr1
      await mgdCompany.connect(deployer).whitelist(addr1.address, true);
      const encoder = new TextEncoder();
      const bytesMemoir = encoder.encode("Burn with an event"); // Replace with your actual memoir data
      await mintGoldDustERC721
        .connect(addr1)
        .mintNft(
          "BurnWithEventURI",
          ethers.utils.parseEther("5"),
          1,
          bytesMemoir
        );

      // Capture the event in a transaction
      await expect(mintGoldDustERC721.connect(addr1).burnToken(1))
        .to.emit(mintGoldDustERC721, "TokenBurned")
        .withArgs(1, true, addr1.address, addr1.address, 1);
    });

    // it("should decrease total supply correctly", async function () {
    //   // Setup: Whitelist and Mint a new token for addr1
    //   await mgdCompany.connect(deployer).whitelist(addr1.address, true);
    //   const encoder = new TextEncoder();
    //   const bytesMemoir = encoder.encode("Decrease total supply"); // Replace with your actual memoir data
    //   await mintGoldDustERC721
    //     .connect(addr1)
    //     .mintNft(
    //       "DecreaseTotalSupplyURI",
    //       ethers.utils.parseEther("5"),
    //       1,
    //       bytesMemoir
    //     );

    //   // Check initial total supply
    //   const initialTotalSupply = await mintGoldDustERC721.totalSupply();
    //   expect(initialTotalSupply).to.equal(ethers.BigNumber.from(1)); // Replace with the correct initial value

    //   // Burn the token
    //   await mintGoldDustERC721.connect(addr1).burnToken(1);

    //   // Check final total supply
    //   const finalTotalSupply = await mintGoldDustERC721.totalSupply();
    //   expect(finalTotalSupply).to.equal(initialTotalSupply.sub(1));
    // });
  });
});
