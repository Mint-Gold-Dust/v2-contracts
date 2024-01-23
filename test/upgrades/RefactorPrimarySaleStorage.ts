import { ethers, upgrades, network } from "hardhat";
import { expect } from "chai";
import { impersonate, stopImpersonating } from "../utils/impersonate";
import dealEth from "../utils/dealEth";
import setTimestampNexBlock from "../utils/setTimestampNextBlock";
import { loadFixture } from "ethereum-waffle";
import {
  rpssSetup,
  DEBUG,
  ONE_DAY,
  ONE_SECOND,
  LOW_PRICE,
  addCollectorFee,
} from "./setup/rpssSetup";

describe("RefactorPrimarySaleStorage.ts", function () {
  /**
   * Scenarios for the test setup:
   * -----------------------------------------
   *                             Execute before
   * Artist  tokenId  Collector     upgrade
   * -----------------------------------------
   * A1 721   (1)  => C1 (setPrice)  X
   * A1 721   (2)  => C2 (setPrice)
   * A1 721   (3)  => C3 (auction)   X
   * A1 721   (4)  => C1 (auction)
   * A2 1155  (1)  => C2 (setPrice)  X
   * A2 1155  (2)  => C3 (setPrice)
   * A2 1155  (3)  => C1 (auction)   X
   * A2 1155  (4)  => C2 (auction)
   * A3 721   (5)  => C3 (collectorMint)  X
   * A3 721   (6)  => C1 (collectorMint)
   * A3 1155  (5)  => C2 (collectorMint)  X
   * A3 1155  (6)  => C3 (collectorMint)
   * -----------------------------------------
   */
  async function upgradingFromRpssSetup() {
    if (DEBUG) console.log("upgradingFromRpssSetup");
    const setup = await loadFixture(rpssSetup);

    // Deal company owner signer some more ETH
    await dealEth(setup.mgdOwnerSigner.address, 10);

    // Instantiate factories and deploy implementations
    const mgd721Factory = await ethers.getContractFactory(
      "MintGoldDustERC721",
      setup.mgdOwnerSigner
    );
    const mgd721Impl = await mgd721Factory.deploy();

    const mgd1155Factory = await ethers.getContractFactory(
      "MintGoldDustERC1155",
      setup.mgdOwnerSigner
    );
    const mgd1155Impl = await mgd1155Factory.deploy();

    const mgdSetPriceFactory = await ethers.getContractFactory(
      "MintGoldDustSetPrice",
      setup.mgdOwnerSigner
    );
    const mgdSetPriceImpl = await mgdSetPriceFactory.deploy();

    const mgdAuctionFactory = await ethers.getContractFactory(
      "MintGoldDustMarketplaceAuction",
      setup.mgdOwnerSigner
    );
    const mgdAuctionImpl = await mgdAuctionFactory.deploy();

    if (DEBUG)
      console.log("upgradingFromRpssSetup- all implementations deployed");

    // Perform upgrades
    await impersonate(setup.mgdOwnerSigner.address);
    await setup.proxyAdmin.upgrade(setup.mgd721.address, mgd721Impl.address);
    await setup.proxyAdmin.upgrade(setup.mgd1155.address, mgd1155Impl.address);
    await setup.proxyAdmin.upgrade(
      setup.mgdSetPrice.address,
      mgdSetPriceImpl.address
    );
    await setup.proxyAdmin.upgrade(
      setup.mgdAuction.address,
      mgdAuctionImpl.address
    );

    await stopImpersonating(setup.mgdOwnerSigner.address);

    if (DEBUG) console.log("upgradingFromRpssSetup- all proxies upgraded");

    return {
      ...setup,
      mgd721Impl,
      mgd1155Impl,
      mgdSetPriceImpl,
      mgdAuctionImpl,
    };
  }

  describe("Validating setup", function () {
    it("should check collector 1 owns corresponding NFTs", async () => {
      const { collector1, mgd721, mgd1155, tokenId721_1, tokenId1155_3 } =
        await loadFixture(rpssSetup);
      const presumedOwner = await mgd721.ownerOf(tokenId721_1);
      const collector1Balance1155_tokenId_3 = await mgd1155.balanceOf(
        collector1.address,
        tokenId1155_3
      );
      expect(presumedOwner).to.equal(collector1.address);
      expect(collector1Balance1155_tokenId_3).to.equal("1");
    });

    it("should check collector 2 owns corresponding NFTs", async () => {
      const { collector2, mgd1155, tokenId1155_1, tokenId1155_5 } =
        await loadFixture(rpssSetup);
      const collector2Balance1155_tokenId_1 = await mgd1155.balanceOf(
        collector2.address,
        tokenId1155_1
      );
      const collector2Balance1155_tokenId_5 = await mgd1155.balanceOf(
        collector2.address,
        tokenId1155_5
      );
      expect(collector2Balance1155_tokenId_1).to.equal("1");
      expect(collector2Balance1155_tokenId_5).to.equal("1");
    });

    it("should check collector 3 owns corresponding NFTs", async () => {
      const { collector3, mgd721, tokenId721_3, tokenId721_5 } =
        await loadFixture(rpssSetup);
      const presumedOwner721_3 = await mgd721.ownerOf(tokenId721_3);
      const presumedOwner721_5 = await mgd721.ownerOf(tokenId721_5);
      expect(presumedOwner721_3).to.equal(collector3.address);
      expect(presumedOwner721_5).to.equal(collector3.address);
    });

    it("should check artist1 correct state of not sold NFTs", async () => {
      const { mgd721, mgdSetPrice, mgdAuction, tokenId721_2, tokenId721_4 } =
        await loadFixture(rpssSetup);
      const ownerhsipTokenId_2 = await mgd721.ownerOf(tokenId721_2);
      const ownerhsipTokenId_4 = await mgd721.ownerOf(tokenId721_4);
      expect(ownerhsipTokenId_2).to.equal(mgdSetPrice.address);
      expect(ownerhsipTokenId_4).to.equal(mgdAuction.address);
    });

    it("should check artist2 correct state of not sold NFTs", async () => {
      const { mgd1155, mgdSetPrice, mgdAuction, tokenId1155_2, tokenId1155_4 } =
        await loadFixture(rpssSetup);
      const ownerhsipTokenId_2 = await mgd1155.balanceOf(
        mgdSetPrice.address,
        tokenId1155_2
      );
      const ownerhsipTokenId_4 = await mgd1155.balanceOf(
        mgdAuction.address,
        tokenId1155_4
      );
      expect(ownerhsipTokenId_2).to.equal("10");
      expect(ownerhsipTokenId_4).to.equal("1");
    });
  });

  describe("Upgrading and validating state", function () {
    it("should check upgraded contract new implementations", async () => {
      const {
        proxyAdmin,
        mgd721,
        mgd721Impl,
        mgd1155,
        mgd1155Impl,
        mgdSetPrice,
        mgdSetPriceImpl,
        mgdAuction,
        mgdAuctionImpl,
      } = await loadFixture(upgradingFromRpssSetup);

      expect(await proxyAdmin.getProxyImplementation(mgd721.address)).to.equal(
        mgd721Impl.address
      );
      expect(await proxyAdmin.getProxyImplementation(mgd1155.address)).to.equal(
        mgd1155Impl.address
      );
      expect(
        await proxyAdmin.getProxyImplementation(mgdSetPrice.address)
      ).to.equal(mgdSetPriceImpl.address);
      expect(
        await proxyAdmin.getProxyImplementation(mgdAuction.address)
      ).to.equal(mgdAuctionImpl.address);
    });

    it("should check after upgrade that collector 1 owns corresponding NFTs", async () => {
      const { collector1, mgd721, mgd1155, tokenId721_1, tokenId1155_3 } =
        await loadFixture(upgradingFromRpssSetup);
      const presumedOwner = await mgd721.ownerOf(tokenId721_1);
      const collector1Balance1155_tokenId_3 = await mgd1155.balanceOf(
        collector1.address,
        tokenId1155_3
      );
      expect(presumedOwner).to.equal(collector1.address);
      expect(collector1Balance1155_tokenId_3).to.equal("1");
    });

    it("should check after upgrade that collector 2 owns corresponding NFTs", async () => {
      const { collector2, mgd1155, tokenId1155_1, tokenId1155_5 } =
        await loadFixture(upgradingFromRpssSetup);
      const collector2Balance1155_tokenId_1 = await mgd1155.balanceOf(
        collector2.address,
        tokenId1155_1
      );
      const collector2Balance1155_tokenId_5 = await mgd1155.balanceOf(
        collector2.address,
        tokenId1155_5
      );
      expect(collector2Balance1155_tokenId_1).to.equal("1");
      expect(collector2Balance1155_tokenId_5).to.equal("1");
    });

    it("should check after upgrade that collector 3 owns corresponding NFTs", async () => {
      const { collector3, mgd721, tokenId721_3, tokenId721_5 } =
        await loadFixture(upgradingFromRpssSetup);
      const presumedOwner721_3 = await mgd721.ownerOf(tokenId721_3);
      const presumedOwner721_5 = await mgd721.ownerOf(tokenId721_5);
      expect(presumedOwner721_3).to.equal(collector3.address);
      expect(presumedOwner721_5).to.equal(collector3.address);
    });

    it("should check after upgrade that artist1 correct state of not sold NFTs", async () => {
      const { mgd721, mgdSetPrice, mgdAuction, tokenId721_2, tokenId721_4 } =
        await loadFixture(upgradingFromRpssSetup);
      const ownerhsipTokenId_2 = await mgd721.ownerOf(tokenId721_2);
      const ownerhsipTokenId_4 = await mgd721.ownerOf(tokenId721_4);
      expect(ownerhsipTokenId_2).to.equal(mgdSetPrice.address);
      expect(ownerhsipTokenId_4).to.equal(mgdAuction.address);
    });
    it("should check after upgrade that artist2 correct state of not sold NFTs", async () => {
      const { mgd1155, mgdSetPrice, mgdAuction, tokenId1155_2, tokenId1155_4 } =
        await loadFixture(upgradingFromRpssSetup);
      const ownerhsipTokenId_2 = await mgd1155.balanceOf(
        mgdSetPrice.address,
        tokenId1155_2
      );
      const ownerhsipTokenId_4 = await mgd1155.balanceOf(
        mgdAuction.address,
        tokenId1155_4
      );
      expect(ownerhsipTokenId_2).to.equal("10");
      expect(ownerhsipTokenId_4).to.equal("1");
    });
  });

  describe("Upgrading and executing more state", function () {
    it("should check collector1 bid is succesfull on tokenID721_4", async () => {
      const { mgdAuction, tokenId721_4, collector1, artist1, mgd721 } =
        await loadFixture(upgradingFromRpssSetup);
      await impersonate(collector1.address);
      await mgdAuction.connect(collector1).placeBid(
        {
          tokenId: tokenId721_4,
          nft: mgd721.address,
          seller: artist1.address,
        },
        {
          value: addCollectorFee(LOW_PRICE),
        }
      );
      const blockNum = await ethers.provider.getBlockNumber();
      const block = await ethers.provider.getBlock(blockNum);
      const timestamp = block.timestamp;
      await setTimestampNexBlock(timestamp + ONE_DAY + ONE_SECOND);
      await impersonate(collector1.address);
      await mgdAuction.connect(collector1).endAuction({
        tokenId: tokenId721_4,
        nft: mgd721.address,
        seller: artist1.address,
      });
      expect(await mgd721.ownerOf(tokenId721_4)).to.equal(collector1.address);
    });

    it("should check collector1 collect mints is succesfull for tokenId721_6", async () => {
      const {
        mgdSetPrice,
        collector1,
        mgd721,
        collector721DTO_2,
        hash721_2,
        artistSignature721_2,
        mgdSignature721_2,
        tokenId721_6,
      } = await loadFixture(upgradingFromRpssSetup);
      await impersonate(collector1.address);
      await mgdSetPrice
        .connect(collector1)
        .collectorMintPurchase(
          collector721DTO_2,
          hash721_2,
          artistSignature721_2,
          mgdSignature721_2,
          1,
          {
            value: addCollectorFee(LOW_PRICE),
          }
        );
      expect(await mgd721.ownerOf(tokenId721_6)).to.equal(collector1.address);
    });

    it("should check collector2 buy is succesfull for tokenId721_2", async () => {
      const {
        mgdSetPrice,
        mgd721,
        collector2,
        tokenId721_2,
        artist1,
        mgdOwnerSigner,
      } = await loadFixture(upgradingFromRpssSetup);
      await impersonate(mgdOwnerSigner.address);
      await mgd721
        .connect(mgdOwnerSigner)
        .setOverridePrimarySaleQuantityToSell([tokenId721_2]);

      await impersonate(collector2.address);
      await mgdSetPrice.connect(collector2).purchaseNft(
        {
          tokenId: tokenId721_2,
          amount: 1,
          nft: mgd721.address,
          seller: artist1.address,
        },
        {
          value: addCollectorFee(LOW_PRICE),
        }
      );
      expect(await mgd721.ownerOf(tokenId721_2)).to.equal(collector2.address);
    });

    it("should check collector2 bid is succesfull on tokenID1155_4", async () => {
      const { mgdAuction, tokenId1155_4, collector2, artist2, mgd1155 } =
        await loadFixture(upgradingFromRpssSetup);
      await impersonate(collector2.address);
      await mgdAuction.connect(collector2).placeBid(
        {
          tokenId: tokenId1155_4,
          nft: mgd1155.address,
          seller: artist2.address,
        },
        {
          value: addCollectorFee(LOW_PRICE),
        }
      );
      const blockNum = await ethers.provider.getBlockNumber();
      const block = await ethers.provider.getBlock(blockNum);
      const timestamp = block.timestamp;
      await setTimestampNexBlock(timestamp + ONE_DAY + ONE_SECOND);
      await impersonate(collector2.address);
      await mgdAuction.connect(collector2).endAuction({
        tokenId: tokenId1155_4,
        nft: mgd1155.address,
        seller: artist2.address,
      });
      expect(
        await mgd1155.balanceOf(collector2.address, tokenId1155_4)
      ).to.equal("1");
    });

    it("should check collector3 buys is succesfull for tokenId1155_2", async () => {
      const { mgdSetPrice, mgd1155, collector3, tokenId1155_2, artist2 } =
        await loadFixture(upgradingFromRpssSetup);
      await impersonate(collector3.address);
      await mgdSetPrice.connect(collector3).purchaseNft(
        {
          tokenId: tokenId1155_2,
          amount: 1,
          nft: mgd1155.address,
          seller: artist2.address,
        },
        {
          value: addCollectorFee(LOW_PRICE),
        }
      );
      expect(
        await mgd1155.balanceOf(collector3.address, tokenId1155_2)
      ).to.equal("1");
    });

    it("should check collector3 collect mints is succesfull for tokenId1155_6", async () => {
      const {
        mgdSetPrice,
        collector3,
        mgd1155,
        collector1155DTO_2,
        hash1155_2,
        artistSignature1155_2,
        mgdSignature1155_2,
        tokenId1155_6,
      } = await loadFixture(upgradingFromRpssSetup);
      await impersonate(collector3.address);
      await mgdSetPrice
        .connect(collector3)
        .collectorMintPurchase(
          collector1155DTO_2,
          hash1155_2,
          artistSignature1155_2,
          mgdSignature1155_2,
          1,
          {
            value: addCollectorFee(LOW_PRICE),
          }
        );
      expect(
        await mgd1155.balanceOf(collector3.address, tokenId1155_6)
      ).to.equal("1");
    });
  });
});
