require("dotenv").config();
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect, use } from "chai";
import { Contract, ContractFactory } from "ethers";
import { ethers } from "hardhat";
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

  let deployer: SignerWithAddress;
  let addr1: SignerWithAddress;
  let addr2: SignerWithAddress;
  let addr3: SignerWithAddress;
  let addrs: SignerWithAddress[];

  let URI = "sample URI";
  let baseURI = "https://example.com/{id}.json";

  //const REAL_OWNER = "0x46ab5D1518688f66286aF7c6C9f5552edd050d15";
  const TEST_OWNER = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266";
  const primary_sale_fee_percent_initial = 15000000000000000000n;
  const secondary_sale_fee_percent_initial = 5000000000000000000n;
  const collector_fee_initial = 3000000000000000000n;
  const max_royalty_initial = 20000000000000000000n;

  let primary_sale_fee_percent = 15;
  let collector_fee = 3;
  let royalty = 5;
  let price = 10;

  let fee: number;
  let balance: number;
  let collFee: number;
  let primarySaleFee: number;

  const MEMOIR = "This is a great moment of my life!";

  fee = (price * primary_sale_fee_percent) / 100;
  collFee = (price * collector_fee) / 100;
  primarySaleFee = fee + collFee;
  balance = price - primarySaleFee;

  beforeEach(async function () {
    MintGoldDustCompany = await ethers.getContractFactory(
      "MintGoldDustCompany"
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
      [mgdCompany.address, mintGoldDustMemoir.address],
      {
        initializer: "initializeChild",
      }
    );

    mintGoldDustERC1155 = await upgrades.deployProxy(
      MintGoldDustERC1155,
      [mgdCompany.address, mintGoldDustMemoir.address, baseURI],
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

    await mgdCompany.connect(deployer).setValidator(deployer.address, true);
  });

  describe("\n--------------- Tests related witn collector mint functionality after a MintGoldDustERC721 traditional purchase on set price ---------------\n", function () {
    let quantityToMint = 10;
    let quantityToList = 5;

    // Create an instance of the ListDTO struct

    beforeEach(async () => {
      // MGD owner whitelist the artist
      await mgdCompany.connect(deployer).whitelist(addr1.address, true);

      // Artist approve gdMarketPlace marketplace to exchange its NFT
      await mintGoldDustERC721
        .connect(addr1)
        .setApprovalForAll(mintGoldDustSetPrice.address, true);
    });

    it("Should track a collector mint flow", async function () {
      let collectrDTO = {
        contractAddress: mintGoldDustERC721.address,
        tokenURI: URI,
        royalty: toWei(royalty),
        memoir: MEMOIR,
        collaborators: [],
        ownersPercentage: [],
        amount: 1,
        artistSigner: addr1.address,
        price: toWei(price),
        collectorMintId: 1,
      };

      const messageBytes = ethers.utils.defaultAbiCoder.encode(
        [
          "address",
          "string",
          "uint256",
          "string",
          "address[]",
          "uint256[]",
          "uint256",
          "address",
          "uint256",
          "uint256",
        ],
        [
          collectrDTO.contractAddress,
          collectrDTO.tokenURI,
          collectrDTO.royalty,
          collectrDTO.memoir,
          collectrDTO.collaborators,
          collectrDTO.ownersPercentage,
          collectrDTO.amount,
          collectrDTO.artistSigner,
          collectrDTO.price,
          collectrDTO.collectorMintId,
        ]
      );

      // Convert the JSON data to a string
      const message = JSON.stringify(collectrDTO);
      const messageHash = ethers.utils.keccak256(messageBytes);

      // Sign the JSON data using Hardhat address 1
      const signer = ethers.provider.getSigner(1);
      const signature = await signer.signMessage(messageHash);

      console.log("Signed Message:", messageBytes);
      console.log("Message Hash:", messageHash);
      console.log("Signature:", signature);
      console.log("ADDR1: ", addr1.address);

      const signerAfter = ethers.utils.verifyMessage(messageHash, signature);
      console.log("ADDR1: ", signerAfter);
      // Check if the signer address matches Hardhat address 1
      if (signerAfter === addr1.address) {
        console.log("Signature is from Hardhat address 1");
      } else {
        console.log("Signature is not from Hardhat address 1");
      }
      console.log("ADDRESS: ", mintGoldDustERC721.address);

      const tx = await mintGoldDustSetPrice
        .connect(addr2)
        .collectorMintPurchase(collectrDTO, messageHash, signature, {
          value: toWei(price),
        });

      await expect(tx)
        .to.emit(mintGoldDustERC721, "MintGoldDustNFTMinted")
        .withArgs(1, URI, addr1.address, toWei(royalty), 1, true, 1);
      await expect(tx)
        .to.emit(mintGoldDustSetPrice, "MintGoldDustNftListedToSetPrice")
        .withArgs(
          1,
          addr1.address,
          toWei(price),
          1,
          mintGoldDustERC721.address
        );
      await expect(tx)
        .to.emit(mintGoldDustSetPrice, "MintGoldDustNftPurchasedPrimaryMarket")
        .withArgs(
          1,
          1,
          addr1.address,
          addr2.address,
          toWei(price),
          toWei(balance),
          toWei(fee),
          toWei(collFee),
          1,
          false,
          false,
          true
        );

      let marketItem =
        await mintGoldDustSetPrice.idMarketItemsByContractByOwner(
          mintGoldDustERC721.address,
          1,
          addr2.address
        );

      expect(marketItem).to.be.not.null;
      expect(marketItem).to.be.not.undefined;
      expect(marketItem).to.be.not.empty;
      expect(marketItem).to.be.not.false;
      expect(marketItem.tokenId).to.be.equal(1);
      expect(marketItem.seller).to.be.equal(addr2.address);
      expect(marketItem.price).to.be.equal(toWei(price));
      expect(marketItem.sold).to.be.true;
      expect(marketItem.isAuction).to.be.false;
      expect(marketItem.isSecondarySale).to.be.true;
      expect(marketItem.isERC721).to.be.true;
      expect(marketItem.tokenAmount).to.be.equal(1);

      expect(await mintGoldDustERC721.tokenURI(1)).to.equal(URI);
      expect(await mintGoldDustERC721.tokenIdArtist(1)).to.equal(addr1.address);
      expect(await mintGoldDustERC721.ownerOf(1)).to.equal(addr2.address);

      const decoder = new TextDecoder();
      const byteArray = ethers.utils.arrayify(
        await mintGoldDustMemoir.contractTokenIdMemoirs(
          mintGoldDustERC721.address,
          1
        )
      );
      const memoirStringReturned = decoder.decode(byteArray);

      expect(memoirStringReturned).to.be.equal(MEMOIR);
    });
  });

  describe("\n--------------- Tests related witn collector mint functionality after a MintGoldDustERC1155 traditional purchase on set price ---------------\n", function () {
    let quantityToMint = 10;
    let quantityToList = 5;

    // Create an instance of the ListDTO struct

    beforeEach(async () => {
      // MGD owner whitelist the artist
      await mgdCompany.connect(deployer).whitelist(addr1.address, true);

      // Artist approve gdMarketPlace marketplace to exchange its NFT
      await mintGoldDustERC1155
        .connect(addr1)
        .setApprovalForAll(mintGoldDustSetPrice.address, true);
    });

    it("Should track a collector mint flow", async function () {
      let collectrDTO = {
        contractAddress: mintGoldDustERC1155.address,
        tokenURI: URI,
        royalty: toWei(royalty),
        memoir: MEMOIR,
        collaborators: [],
        ownersPercentage: [],
        amount: quantityToMint,
        artistSigner: addr1.address,
        price: toWei(price),
        collectorMintId: 1,
      };

      const messageBytes = ethers.utils.defaultAbiCoder.encode(
        [
          "address",
          "string",
          "uint256",
          "string",
          "address[]",
          "uint256[]",
          "uint256",
          "address",
          "uint256",
          "uint256",
        ],
        [
          collectrDTO.contractAddress,
          collectrDTO.tokenURI,
          collectrDTO.royalty,
          collectrDTO.memoir,
          collectrDTO.collaborators,
          collectrDTO.ownersPercentage,
          collectrDTO.amount,
          collectrDTO.artistSigner,
          collectrDTO.price,
          collectrDTO.collectorMintId,
        ]
      );

      // Convert the JSON data to a string
      const message = JSON.stringify(collectrDTO);
      const messageHash = ethers.utils.keccak256(messageBytes);

      // Sign the JSON data using Hardhat address 1
      const signer = ethers.provider.getSigner(1);
      const signature = await signer.signMessage(messageHash);

      console.log("Signed Message:", messageBytes);
      console.log("Message Hash:", messageHash);
      console.log("Signature:", signature);
      console.log("ADDR1: ", addr1.address);

      const signerAfter = ethers.utils.verifyMessage(messageHash, signature);
      console.log("ADDR1: ", signerAfter);
      // Check if the signer address matches Hardhat address 1
      if (signerAfter === addr1.address) {
        console.log("Signature is from Hardhat address 1");
      } else {
        console.log("Signature is not from Hardhat address 1");
      }
      console.log("ADDRESS: ", mintGoldDustERC1155.address);

      const tx = await mintGoldDustSetPrice
        .connect(addr2)
        .collectorMintPurchase(collectrDTO, messageHash, signature, {
          value: toWei(price),
        });

      // await expect(tx)
      //   .to.emit(mintGoldDustERC1155, "MintGoldDustNFTMinted")
      //   .withArgs(1, URI, addr1.address, toWei(royalty), 1, true, 1);
      // await expect(tx)
      //   .to.emit(mintGoldDustSetPrice, "MintGoldDustNftListedToSetPrice")
      //   .withArgs(
      //     1,
      //     addr1.address,
      //     toWei(price),
      //     quantityToMint,
      //     mintGoldDustERC1155.address
      //   );
      // await expect(tx)
      //   .to.emit(mintGoldDustSetPrice, "MintGoldDustNftPurchasedPrimaryMarket")
      //   .withArgs(
      //     1,
      //     1,
      //     addr1.address,
      //     addr2.address,
      //     toWei(price),
      //     toWei(balance),
      //     toWei(fee),
      //     toWei(collFee),
      //     quantityToMint,
      //     false,
      //     false,
      //     true
      //   );

      // let marketItem =
      //   await mintGoldDustSetPrice.idMarketItemsByContractByOwner(
      //     mintGoldDustERC1155.address,
      //     1,
      //     addr2.address
      //   );

      // expect(marketItem).to.be.not.null;
      // expect(marketItem).to.be.not.undefined;
      // expect(marketItem).to.be.not.empty;
      // expect(marketItem).to.be.not.false;
      // expect(marketItem.tokenId).to.be.equal(1);
      // expect(marketItem.seller).to.be.equal(addr2.address);
      // expect(marketItem.price).to.be.equal(toWei(price));
      // expect(marketItem.sold).to.be.true;
      // expect(marketItem.isAuction).to.be.false;
      // expect(marketItem.isSecondarySale).to.be.true;
      // expect(marketItem.isERC721).to.be.true;
      // expect(marketItem.tokenAmount).to.be.equal(quantityToMint);

      // //expect(await mintGoldDustERC1155.tokenURI(1)).to.equal(URI);
      // expect(await mintGoldDustERC1155.tokenIdArtist(1)).to.equal(
      //   addr1.address
      // );
      // //expect(await mintGoldDustERC1155.ownerOf(1)).to.equal(addr2.address);

      // const decoder = new TextDecoder();
      // const byteArray = ethers.utils.arrayify(
      //   await mintGoldDustMemoir.contractTokenIdMemoirs(
      //     mintGoldDustERC1155.address,
      //     1
      //   )
      // );
      // const memoirStringReturned = decoder.decode(byteArray);

      // expect(memoirStringReturned).to.be.equal(MEMOIR);
    });
  });
});
