require("dotenv").config();
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect, use } from "chai";
import { Contract, ContractFactory, Wallet } from "ethers";
import { ethers } from "hardhat";
import chai from "chai";
import chaiAsPromised from "chai-as-promised";
import generateEIP712 from "./utils/generateEIP712";
import generateNewEIP712 from "./utils/generateNewEIP712";
import { encodeData, generateEIP712Hash, signData } from "./utils/eip712";
import generateKeys from "./utils/generateWallet";
import generateWallet from "./utils/generateWallet";

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
  const auction_duration = 5;
  const auction_extension_duration = 1;

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

  let domainSeparator: any;
  let bytesMemoir: Uint8Array;

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
        auction_duration,
        auction_extension_duration,
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

    await mgdCompany.connect(deployer).setValidator(deployer.address, true);

    await mintGoldDustERC1155
      .connect(deployer)
      .setMintGoldDustSetPriceAddress(mintGoldDustSetPrice.address);

    await mintGoldDustERC721
      .connect(deployer)
      .setMintGoldDustSetPriceAddress(mintGoldDustSetPrice.address);

    domainSeparator = {
      name: "MintGoldDustSetPrice",
      version: "1.0.0",
      chainId: 31337, // Replace with your desired chain ID
      verifyingContract: mintGoldDustSetPrice.address, // Replace with your contract address
    };

    const encoder = new TextEncoder();
    bytesMemoir = encoder.encode(MEMOIR);
  });

  describe("\n--------------- Tests related witn collector mint functionality after a MintGoldDustERC721 traditional purchase on set price ---------------\n", function () {
    let quantityToMint = 10;
    let quantityToBuy = 5;

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
        memoir: bytesMemoir,
        collaborators: [],
        ownersPercentage: [],
        amount: quantityToMint,
        artistSigner: addr1.address,
        price: toWei(price),
        collectorMintId: 1,
      };

      let collectorMintId = 1;

      const signer = ethers.provider.getSigner(1);

      // Generate the encoded data
      const encodedData = encodeData(collectrDTO);

      // const collectorMintDTOHash = generateCollectorMintDTOHash(
      //   collectrDTO,
      //   collectorMintId
      // );

      // Generate the EIP712 hash
      const hash = generateEIP712Hash(encodedData, domainSeparator);

      // Sign the hash
      const signature = await signData(hash, signer);

      const wallet = await generateWallet();

      // Sign the hash
      const mintGoldDustSignature = await wallet.signMessage(hash);

      mgdCompany.connect(deployer).setPublicKey(wallet.address);

      const signer1After = ethers.utils.verifyMessage(
        hash,
        mintGoldDustSignature
      );

      console.log("signer1After: ", signer1After);
      console.log("wallet.address): ", wallet.address);

      // Check if the signer address matches Hardhat address 1
      if (signer1After === wallet.address) {
        console.log("Signature is from Hardhat address 1");
      } else {
        console.log("Signature is not from Hardhat address 1");
      }

      const signerAfter = ethers.utils.verifyMessage(hash, signature);
      console.log("ADDR1: ", signerAfter);
      // Check if the signer address matches Hardhat address 1
      if (signerAfter === addr1.address) {
        console.log("Signature is from Hardhat address 1");
      } else {
        console.log("Signature is not from Hardhat address 1");
      }

      const tx = await mintGoldDustSetPrice
        .connect(addr2)
        .collectorMintPurchase(
          collectrDTO,
          hash,
          signature,
          mintGoldDustSignature,
          quantityToBuy,
          {
            value: toWei(price * quantityToBuy),
          }
        );

      const filter = mintGoldDustERC1155.filters.MintGoldDustNFTMinted();
      const eventPromise = mintGoldDustERC1155.queryFilter(filter);

      const events = await eventPromise;

      const filter1 = mintGoldDustERC1155.filters.URI();
      const eventPromise1 = mintGoldDustERC1155.queryFilter(filter1);

      const events1 = await eventPromise1;

      expect(events[0].event).to.be.equal("MintGoldDustNFTMinted");
      expect(events[0].eventSignature).to.be.equal(
        "MintGoldDustNFTMinted(uint256,string,address,uint256,uint256,bool,uint256,bytes)"
      );
      expect(events[0].args!.tokenId).to.be.equal(1);
      expect(events[0].args!.tokenURI).to.be.equal(URI);
      expect(events[0].args!.owner).to.be.equal(addr1.address);
      expect(events[0].args!.royalty).to.be.equal(toWei(royalty));
      expect(events[0].args!.amount).to.be.equal(quantityToMint);
      expect(events[0].args!.isERC721).to.be.false;
      expect(events[0].args!.collectorMintId).to.be.equal(1);
      expect(events[0].args!.memoir).to.be.equal(
        ethers.utils.hexlify(bytesMemoir)
      );
      expect(ethers.utils.toUtf8String(events[0].args!.memoir)).to.be.equal(
        MEMOIR
      );

      expect(events1[0].event).to.be.equal("URI");
      expect(events1[0].eventSignature).to.be.equal("URI(string,uint256)");
      expect(events1[0].args!.value).to.be.equal(URI);
      expect(events1[0].args!.id).to.be.equal(1);

      const receipt = await tx.wait();

      console.log("receipt:", receipt.events);

      expect(receipt.events[4].event).to.be.equal(
        "MintGoldDustNftListedToSetPrice"
      );
      expect(receipt.events[4].eventSignature).to.be.equal(
        "MintGoldDustNftListedToSetPrice(uint256,address,uint256,uint256,address)"
      );
      expect(receipt.events[4].args.tokenId).to.be.equal(1);
      expect(receipt.events[4].args.seller).to.be.equal(addr1.address);
      expect(receipt.events[4].args.price).to.be.equal(toWei(price));
      expect(receipt.events[4].args.amount).to.be.equal(quantityToMint);
      expect(receipt.events[4].args.contractAddress).to.be.equal(
        mintGoldDustERC1155.address
      );

      expect(receipt.events[6].event).to.be.equal(
        "MintGoldDustNftPurchasedPrimaryMarket"
      );
      expect(receipt.events[6].eventSignature).to.be.equal(
        "MintGoldDustNftPurchasedPrimaryMarket(uint256,uint256,address,address,uint256,uint256,uint256,uint256,uint256,bool,bool)"
      );
      expect(receipt.events[6].args.saleId).to.be.equal(1);
      expect(receipt.events[6].args.tokenId).to.be.equal(1);
      expect(receipt.events[6].args.seller).to.be.equal(addr1.address);
      expect(receipt.events[6].args.newOwner).to.be.equal(addr2.address);
      expect(receipt.events[6].args.buyPrice).to.be.equal(
        toWei(price * quantityToBuy)
      );
      expect(receipt.events[6].args.sellerAmount).to.be.equal(
        toWei(balance * quantityToBuy)
      );
      expect(receipt.events[6].args.feeAmount).to.be.equal(
        toWei(fee * quantityToBuy)
      );
      expect(receipt.events[6].args.collectorFeeAmount).to.be.equal(
        toWei(collFee * quantityToBuy)
      );
      expect(receipt.events[6].args.tokenAmountSold).to.be.equal(quantityToBuy);
      expect(receipt.events[6].args.hasCollaborators).to.be.false;
      expect(receipt.events[6].args.isERC721).to.be.false;

      let marketItem =
        await mintGoldDustSetPrice.idMarketItemsByContractByOwner(
          mintGoldDustERC1155.address,
          1,
          addr2.address
        );

      console.log("marketItem:", marketItem);

      expect(marketItem).to.be.not.null;
      expect(marketItem).to.be.not.undefined;
      expect(marketItem).to.be.not.empty;
      expect(marketItem).to.be.not.false;
      expect(marketItem.tokenId).to.be.equal(0);
      expect(marketItem.seller).to.be.equal(ethers.constants.AddressZero);
      expect(marketItem.price).to.be.equal(0);
      expect(marketItem.isSecondarySale).to.be.false;
      expect(marketItem.isERC721).to.be.false;
      expect(marketItem.tokenAmount).to.be.equal(0);

      expect(await mintGoldDustERC1155.uri(1)).to.equal(URI);
      expect(await mintGoldDustERC1155.tokenIdArtist(1)).to.equal(
        addr1.address
      );

      expect(await mintGoldDustERC1155.balanceOf(addr1.address, 1)).to.equal(0);
      expect(await mintGoldDustERC1155.balanceOf(addr2.address, 1)).to.equal(5);
      expect(
        await mintGoldDustERC1155.balanceOf(mintGoldDustSetPrice.address, 1)
      ).to.equal(5);
    });
  });

  describe("Bad path tests", function () {
    const quantityToList = 10;
    const quantityToBuy = 5;
    let wallet: Wallet;

    beforeEach(async () => {
      // MGD owner whitelist the artist
      await mgdCompany.connect(deployer).whitelist(addr1.address, true);

      // Artist approve gdMarketPlace marketplace to exchange its NFT
      await mintGoldDustERC1155
        .connect(addr1)
        .setApprovalForAll(mintGoldDustSetPrice.address, true);

      wallet = await generateWallet();

      mgdCompany.connect(deployer).setPublicKey(wallet.address);
    });

    it('Should call the collectorMint function with an address that is not the mintGoldDustERC1155 address. It MUST revert with an "Invalid contract address" error.', async () => {
      await expect(
        mintGoldDustERC1155
          .connect(addr1)
          .collectorMint(
            URI,
            toWei(royalty),
            quantityToList,
            addr1.address,
            bytesMemoir,
            1,
            mintGoldDustSetPrice.address
          )
      )
        .to.be.revertedWithCustomError(mintGoldDustERC1155, "UnauthorizedOnNFT")
        .withArgs("SET_PRICE");
    });

    it("Call the function passing everything correct. The attacker can generate the object, the EIP712 and everything using an address that is not a whitelisted artist. It MUST revert with an 'Invalid Signature' error.", async () => {
      let collectrDTO = {
        contractAddress: mintGoldDustERC1155.address,
        tokenURI: URI,
        royalty: toWei(royalty),
        memoir: bytesMemoir,
        collaborators: [],
        ownersPercentage: [],
        amount: quantityToList,
        artistSigner: addr2.address,
        price: toWei(price),
        collectorMintId: 1,
      };

      const signer = ethers.provider.getSigner(2);

      // Generate the encoded data
      const encodedData = encodeData(collectrDTO);

      // Generate the EIP712 hash
      const hash = generateEIP712Hash(encodedData, domainSeparator);

      // Sign the hash
      const signature = await signData(hash, signer);

      const signerAfter = ethers.utils.verifyMessage(hash, signature);

      // Check if the signer address matches Hardhat address 1
      if (signerAfter === addr1.address) {
        console.log("Signature is from Hardhat address 1");
      } else {
        console.log("Signature is not from Hardhat address 1");
      }

      // Sign the hash
      const mintGoldDustSignature = await wallet.signMessage(hash);

      console.log("Address 2: ", addr2.address);
      await expect(
        mintGoldDustSetPrice
          .connect(addr2)
          .collectorMintPurchase(
            collectrDTO,
            hash,
            signature,
            mintGoldDustSignature,
            quantityToBuy,
            {
              value: toWei(price),
            }
          )
      )
        .to.be.revertedWithCustomError(
          mintGoldDustSetPrice,
          "UnauthorizedOnNFT"
        )
        .withArgs("ARTIST");
    });

    // it("Call the function passing everything correct. But in this case the caller do not use our private key to sign. It MUST revert with an 'Invalid Signature' error.", async () => {
    //   let collectrDTO = {
    //     contractAddress: mintGoldDustERC1155.address,
    //     tokenURI: URI,
    //     royalty: toWei(royalty),
    //     memoir: bytesMemoir,
    //     collaborators: [],
    //     ownersPercentage: [],
    //     amount: quantityToList,
    //     artistSigner: addr1.address,
    //     price: toWei(price),
    //     collectorMintId: 1,
    //   };

    //   const signer = ethers.provider.getSigner(1);

    //   // Generate the encoded data
    //   const encodedData = encodeData(collectrDTO);

    //   // Generate the EIP712 hash
    //   const hash = generateEIP712Hash(encodedData, domainSeparator);

    //   // Sign the hash
    //   const signature = await signData(hash, signer);

    //   const signerAfter = ethers.utils.verifyMessage(hash, signature);

    //   // Check if the signer address matches Hardhat address 1
    //   if (signerAfter === addr1.address) {
    //     console.log("Signature is from Hardhat address 1");
    //   } else {
    //     console.log("Signature is not from Hardhat address 1");
    //   }

    //   // Sign the hash
    //   const mintGoldDustSignature = await wallet.signMessage(hash);

    //   console.log("Address 2: ", addr2.address);
    //   await expect(
    //     mintGoldDustSetPrice
    //       .connect(addr2)
    //       .collectorMintPurchase(
    //         collectrDTO,
    //         hash,
    //         signature,
    //         mintGoldDustSignature,
    //         quantityToBuy,
    //         {
    //           value: toWei(price),
    //         }
    //       )
    //   )
    //     .to.be.revertedWithCustomError(
    //       mintGoldDustSetPrice,
    //       "UnauthorizedOnNFT"
    //     )
    //     .withArgs("ARTIST");
    // });
  });
});
