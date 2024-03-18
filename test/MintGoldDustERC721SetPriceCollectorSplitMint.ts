require("dotenv").config();
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";
import { Contract, ContractFactory, Wallet } from "ethers";
import { ethers } from "hardhat";
import chai from "chai";
import chaiAsPromised from "chai-as-promised";
import { encodeData, generateEIP712Hash, signData } from "./utils/eip712";
import generateWallet from "./utils/generateWallet";

chai.use(chaiAsPromised);

const toWei = (num: any) => ethers.utils.parseEther(num.toString());
const fromWei = (num: any) => ethers.utils.formatEther(num);

describe("MintGoldDustSetPrice.sol Smart Contract \n___________________________________________________\n \nThis smart contract is responsible by all functionalities related with the fixed price market. \n Here goes the tests related with the collectorMint feature with split Minting of MintGoldDustSetPrice market for MintGoldDustERC721 tokens. \n\n", function () {
  let MintGoldDustERC721: ContractFactory;
  let mintGoldDustERC721: Contract;

  let MintGoldDustERC1155: ContractFactory;
  let mintGoldDustERC1155: Contract;

  let MintGoldDustCompany: ContractFactory;
  let mintGoldDustCompany: Contract;

  let MintGoldDustSetPrice: ContractFactory;
  let mintGoldDustSetPrice: Contract;

  let MintGoldDustMarketplaceAuction: ContractFactory;
  let mintGoldDustMarketplaceAuction: Contract;

  let MintGoldDustMemoir: ContractFactory;
  let mintGoldDustMemoir: Contract;

  let deployer: SignerWithAddress;
  let addr1: SignerWithAddress;
  let addr2: SignerWithAddress;
  let addr3: SignerWithAddress;
  let addr4: SignerWithAddress;
  let addr5: SignerWithAddress;

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
  primarySaleFee = fee;
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

    MintGoldDustMarketplaceAuction = await ethers.getContractFactory(
      "MintGoldDustMarketplaceAuction"
    );

    MintGoldDustERC1155 = await ethers.getContractFactory(
      "MintGoldDustERC1155"
    );
    MintGoldDustMemoir = await ethers.getContractFactory("MintGoldDustMemoir");

    mintGoldDustMemoir = await MintGoldDustMemoir.deploy();
    await mintGoldDustMemoir.deployed();

    [deployer, addr1, addr2, addr3, addr4, addr5, ...addrs] =
      await ethers.getSigners();

    mintGoldDustCompany = await upgrades.deployProxy(
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
    await mintGoldDustCompany.deployed();

    mintGoldDustERC721 = await upgrades.deployProxy(
      MintGoldDustERC721,
      [mintGoldDustCompany.address],
      {
        initializer: "initializeChild",
      }
    );

    mintGoldDustERC1155 = await upgrades.deployProxy(
      MintGoldDustERC1155,
      [mintGoldDustCompany.address, baseURI],
      {
        initializer: "initializeChild",
      }
    );
    await mintGoldDustERC1155.deployed();

    mintGoldDustSetPrice = await upgrades.deployProxy(
      MintGoldDustSetPrice,
      [
        mintGoldDustCompany.address,
        mintGoldDustERC721.address,
        mintGoldDustERC1155.address,
      ],
      { initializer: "initializeChild" }
    );
    await mintGoldDustSetPrice.deployed();

    mintGoldDustMarketplaceAuction = await upgrades.deployProxy(
      MintGoldDustMarketplaceAuction,
      [
        mintGoldDustCompany.address,
        mintGoldDustERC721.address,
        mintGoldDustERC1155.address,
      ],
      { initializer: "initializeChild" }
    );
    await mintGoldDustMarketplaceAuction.deployed();

    await mintGoldDustCompany
      .connect(deployer)
      .setValidator(deployer.address, true);

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
    let quantityToMint = 1;
    let quantityToBuy = 1;

    // Create an instance of the ListDTO struct

    beforeEach(async () => {
      // MGD owner whitelist the artist
      await mintGoldDustCompany
        .connect(deployer)
        .whitelist(addr1.address, true);

      // Artist approve gdMarketPlace marketplace to exchange its NFT
      await mintGoldDustERC721
        .connect(addr1)
        .setApprovalForAll(mintGoldDustSetPrice.address, true);

      await mintGoldDustERC721
        .connect(addr1)
        .setApprovalForAll(mintGoldDustMarketplaceAuction.address, true);
    });

    it("Should track a collector mint flow", async function () {
      let collectrDTO = {
        nft: mintGoldDustERC721.address,
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

      const artistBalanceBefore = await addr1.getBalance();
      const buyerBalanceBefore = await addr2.getBalance();
      const mintGoldDustOwnerBalanceBefore = await deployer.getBalance();

      const signer = ethers.provider.getSigner(1);

      // Generate the encoded data
      const encodedData = encodeData(collectrDTO);

      // Generate the EIP712 hash
      const hash = generateEIP712Hash(encodedData, domainSeparator);

      // Sign the hash
      const signature = await signData(hash, signer);

      const wallet = await generateWallet();

      // Sign the hash
      const mintGoldDustSignature = await wallet.signMessage(hash);

      mintGoldDustCompany.connect(deployer).setPublicKey(wallet.address);

      const signer1After = ethers.utils.verifyMessage(
        hash,
        mintGoldDustSignature
      );

      // Check if the signer address matches Hardhat address 1
      if (signer1After === wallet.address) {
        console.log("Signature is from MintGoldDust Private Key");
      } else {
        console.log("Signature is not from MintGoldDust Private Key");
      }

      const signerAfter = ethers.utils.verifyMessage(hash, signature);

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
            value: toWei(price + (price * 3) / 100),
          }
        );

      const filter = mintGoldDustERC721.filters.MintGoldDustNFTMinted();
      const eventPromise = mintGoldDustERC721.queryFilter(filter);

      const events = await eventPromise;

      const filter1 = mintGoldDustERC721.filters.MetadataUpdate();
      const eventPromise1 = mintGoldDustERC721.queryFilter(filter1);

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
      expect(events[0].args!.isERC721).to.be.true;
      expect(events[0].args!.collectorMintId).to.be.equal(1);
      expect(events[0].args!.memoir).to.be.equal(
        ethers.utils.hexlify(bytesMemoir)
      );
      expect(ethers.utils.toUtf8String(events[0].args!.memoir)).to.be.equal(
        MEMOIR
      );

      console.log("PEGA AQUI: ", events1[0].args);

      expect(events1[0].event).to.be.equal("MetadataUpdate");
      expect(events1[0].eventSignature).to.be.equal("MetadataUpdate(uint256)");
      expect(events1[0].args!._tokenId).to.be.equal(1);

      const receipt = await tx.wait();

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
        mintGoldDustERC721.address
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
      expect(receipt.events[6].args.isERC721).to.be.true;

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
      expect(marketItem.tokenId).to.be.equal(0);
      expect(marketItem.seller).to.be.equal(ethers.constants.AddressZero);
      expect(marketItem.price).to.be.equal(0);
      expect(marketItem.isERC721).to.be.false;
      expect(marketItem.tokenAmount).to.be.equal(0);

      expect(await mintGoldDustERC721.tokenURI(1)).to.equal(URI);
      expect(await mintGoldDustERC721.tokenIdArtist(1)).to.equal(addr1.address);

      expect(await mintGoldDustERC721.ownerOf(1)).to.equal(addr2.address);

      const primarySaleFee = (price * quantityToBuy * 100 * 0.15) / 100;
      const collectorFee = price * quantityToBuy * 0.03;
      const sellerAmount = price * quantityToBuy - primarySaleFee;

      console.log("primarySaleFee: ", primarySaleFee);
      console.log("collectorFee: ", collectorFee);
      console.log("sellerAmount: ", sellerAmount);

      const totalGas = receipt.gasUsed.mul(await tx.gasPrice);

      const etherValue = ethers.utils.formatEther(totalGas);

      console.log(`GAS USED: ${etherValue} ETH`);

      expect(await addr1.getBalance()).to.be.equal(
        artistBalanceBefore.add(toWei(sellerAmount))
      );

      const buyerBalanceAfter = await addr2.getBalance();

      expect(buyerBalanceBefore).to.be.equal(
        buyerBalanceAfter.add(toWei(price + (price * 3) / 100).add(totalGas))
      );

      expect(await deployer.getBalance()).to.be.closeTo(
        mintGoldDustOwnerBalanceBefore.add(
          toWei(primarySaleFee).add(toWei(collectorFee))
        ),
        ethers.BigNumber.from("200000000000000")
      );

      // The artist amount should be 5.
      const managePrimarySale = await mintGoldDustSetPrice.getManagePrimarySale(
        mintGoldDustERC721.address,
        1
      );
      expect(managePrimarySale.amount).to.be.equal(
        quantityToMint - quantityToBuy
      );
      expect(managePrimarySale.owner).to.be.equal(addr1.address);
      expect(managePrimarySale.soldout).to.be.true;

      const managePrimarySaleAuction =
        await mintGoldDustMarketplaceAuction.getManagePrimarySale(
          mintGoldDustERC721.address,
          1
        );
      expect(managePrimarySaleAuction.amount).to.be.equal(
        quantityToMint - quantityToBuy
      );
      expect(managePrimarySaleAuction.owner).to.be.equal(addr1.address);
      expect(managePrimarySaleAuction.soldout).to.be.true;

      const collectorBalanceBeforeSecondTx = await addr2.getBalance();
      const artistBuyerItsOwnArtBalance = await addr1.getBalance();
      const deployerBeforeSecondTx = await deployer.getBalance();

      // Artist approve mintGoldDustSetPrice marketplace to exchange its NFT
      await mintGoldDustERC721
        .connect(addr2)
        .setApprovalForAll(mintGoldDustSetPrice.address, true);

      //HERE STARTS THE OTHER PROCESS
      const txList = await mintGoldDustSetPrice
        .connect(addr2)
        .list(1, quantityToBuy, mintGoldDustERC721.address, toWei(price));

      const receiptList = await txList.wait();
      const totalGasList = receiptList.gasUsed.mul(await txList.gasPrice);

      const txPurchase = await mintGoldDustSetPrice.connect(addr1).purchaseNft(
        {
          tokenId: 1,
          amount: quantityToBuy,
          nft: mintGoldDustERC721.address,
          seller: addr2.address,
        },
        {
          value: toWei(price),
        }
      );

      const secondarySaleFee = (price * quantityToBuy * 100 * 0.05) / 100;
      console.log("SECONDARY SALE: ", secondarySaleFee);

      const royaltPercent = (price * quantityToBuy * 100 * 0.05) / 100;
      console.log("ROYALT PERCENT: ", royaltPercent);

      console.log("PRICE: ", price * quantityToBuy);
      const sellerAmountSecondarySale =
        price * quantityToBuy - secondarySaleFee - royaltPercent;

      console.log("sellerAmountSecondarySale: ", sellerAmountSecondarySale);

      console.log("TOTALGASTOLIST: ", totalGasList);

      console.log(
        "TESTE COUNT: ",
        collectorBalanceBeforeSecondTx.add(
          toWei(sellerAmountSecondarySale).sub(totalGasList)
        )
      );

      const receiptPurchase = await txPurchase.wait();
      const totalGasPurchase = receiptPurchase.gasUsed.mul(
        await txPurchase.gasPrice
      );

      // The artist amount should be 5.
      const managePrimarySale2 =
        await mintGoldDustSetPrice.getManagePrimarySale(
          mintGoldDustERC721.address,
          1
        );
      expect(managePrimarySale2.amount).to.be.equal(
        quantityToMint - quantityToBuy
      );
      expect(managePrimarySale2.owner).to.be.equal(addr1.address);
      expect(managePrimarySale2.soldout).to.be.true;

      const managePrimarySaleAuction2 =
        await mintGoldDustMarketplaceAuction.getManagePrimarySale(
          mintGoldDustERC721.address,
          1
        );
      expect(managePrimarySaleAuction2.amount).to.be.equal(
        quantityToMint - quantityToBuy
      );
      expect(managePrimarySaleAuction2.owner).to.be.equal(addr1.address);
      expect(managePrimarySaleAuction2.soldout).to.be.true;

      const collectorBalanceAfterSecondTx = await addr2.getBalance();
      const artistBuyerItsOwnArtBalanceAfter = await addr1.getBalance();

      expect(artistBuyerItsOwnArtBalance).to.be.equal(
        artistBuyerItsOwnArtBalanceAfter
          .add(toWei(price * quantityToBuy))
          .add(totalGasPurchase)
          .sub(toWei(royaltPercent))
      );

      console.log("Got by addr2.getbalance() ::::::", await addr2.getBalance());

      console.log(
        `Got doing the calculation:  \n collectorBalanceAfterSecondTx
        .add(totalGasList)
        .sub(toWei(sellerAmountSecondarySale))`,
        collectorBalanceAfterSecondTx
          .add(totalGasList)
          .sub(toWei(sellerAmountSecondarySale))
      );

      expect(collectorBalanceAfterSecondTx).to.be.closeTo(
        collectorBalanceBeforeSecondTx
          .add(toWei(sellerAmountSecondarySale))
          .sub(totalGasList),
        ethers.BigNumber.from("200000000000000")
      );

      expect(await deployer.getBalance()).to.be.equal(
        deployerBeforeSecondTx.add(toWei(secondarySaleFee))
      );

      expect(await mintGoldDustERC721.ownerOf(1)).to.equal(addr1.address);

      // Here starts the third operation
      const artistBalanceBeforeThirdTx = await addr1.getBalance();
      const buyerBalanceBeforeThirdTx = await addr2.getBalance();
      const deployerBeforeThirdTx = await deployer.getBalance();

      // Here we confirm that the state manipulation is working for both contracts
      const txList3 = await mintGoldDustSetPrice
        .connect(addr1)
        .list(1, quantityToBuy, mintGoldDustERC721.address, toWei(price));

      const receiptList3 = await txList3.wait();
      const totalGasList3 = receiptList3.gasUsed.mul(await txList3.gasPrice);

      const txPurchase2 = await mintGoldDustSetPrice.connect(addr2).purchaseNft(
        {
          tokenId: 1,
          amount: quantityToBuy,
          nft: mintGoldDustERC721.address,
          seller: addr1.address,
        },
        {
          value: toWei(price),
        }
      );

      const receiptPurchase2 = await txPurchase2.wait();
      const totalGasPurchase2 = receiptPurchase2.gasUsed.mul(
        txPurchase2.gasPrice
      );

      expect(await addr1.getBalance()).to.be.closeTo(
        artistBalanceBeforeThirdTx
          .sub(totalGasList3)
          .add(toWei(sellerAmountSecondarySale))
          .add(toWei(royaltPercent)),
        ethers.BigNumber.from("1000000000000000")
      );

      expect(await addr2.getBalance()).to.be.equal(
        buyerBalanceBeforeThirdTx
          .sub(toWei(price * quantityToBuy))
          .sub(totalGasPurchase2)
      );

      expect(await deployer.getBalance()).to.be.equal(
        deployerBeforeThirdTx.add(toWei(secondarySaleFee))
      );

      const managePrimarySale3 =
        await mintGoldDustSetPrice.getManagePrimarySale(
          mintGoldDustERC721.address,
          1
        );

      expect(managePrimarySale3.amount).to.be.equal(0);
      expect(managePrimarySale3.owner).to.be.equal(addr1.address);
      expect(managePrimarySale3.soldout).to.be.true;

      const managePrimarySaleAuction3 =
        await mintGoldDustMarketplaceAuction.getManagePrimarySale(
          mintGoldDustERC721.address,
          1
        );
      expect(managePrimarySaleAuction3.amount).to.be.equal(0);
      expect(managePrimarySaleAuction3.owner).to.be.equal(addr1.address);
      expect(managePrimarySaleAuction3.soldout).to.be.true;

      expect(await mintGoldDustERC721.ownerOf(1)).to.equal(addr2.address);
    });
  });

  describe("Bad path tests", function () {
    const quantityToMint = 1;
    const quantityToBuy = 1;
    let wallet: Wallet;

    beforeEach(async () => {
      // MGD owner whitelist the artist
      await mintGoldDustCompany
        .connect(deployer)
        .whitelist(addr1.address, true);

      // Artist approve gdMarketPlace marketplace to exchange its NFT
      await mintGoldDustERC721
        .connect(addr1)
        .setApprovalForAll(mintGoldDustSetPrice.address, true);

      wallet = await generateWallet();

      mintGoldDustCompany.connect(deployer).setPublicKey(wallet.address);
    });

    it('Should call the collectorMint function with an address that is not the mintGoldDustERC721 address. It MUST revert with an "Invalid contract address" error.', async () => {
      await expect(
        mintGoldDustERC721
          .connect(addr1)
          .collectorSplitMint(
            URI,
            toWei(royalty),
            [addr2.address, addr3.address, addr4.address, addr5.address],
            [toWei(20), toWei(20), toWei(20), toWei(20), toWei(20)],
            quantityToMint,
            addr4.address,
            bytesMemoir,
            1,
            mintGoldDustSetPrice.address
          )
      )
        .to.be.revertedWithCustomError(mintGoldDustERC721, "UnauthorizedOnNFT")
        .withArgs("SET_PRICE");
    });

    it("Call the function passing everything correct. The attacker can generate the object, the EIP712 and everything using an address that is not a whitelisted artist. It MUST revert with an UnauthorizedOnNFT error.", async () => {
      let collectrDTO = {
        nft: mintGoldDustERC721.address,
        tokenURI: URI,
        royalty: toWei(royalty),
        memoir: bytesMemoir,
        collaborators: [],
        ownersPercentage: [],
        amount: quantityToMint,
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

      // Sign the hash
      const mintGoldDustSignature = await wallet.signMessage(hash);

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

    it('Should call the collectorMint function passing a wrong royalty percentage. It MUST revert with an "Invalid contract address" error.', async () => {
      let collectrDTO = {
        nft: mintGoldDustERC721.address,
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

      const signer = ethers.provider.getSigner(1);

      // Generate the encoded data
      const encodedData = encodeData(collectrDTO);

      // Generate the EIP712 hash
      const hash = generateEIP712Hash(encodedData, domainSeparator);

      // Sign the hash
      const signature = await signData(hash, signer);

      // Sign the hash
      const mintGoldDustSignature = await wallet.signMessage(hash);

      await mintGoldDustSetPrice
        .connect(addr2)
        .collectorMintPurchase(
          collectrDTO,
          hash,
          signature,
          mintGoldDustSignature,
          quantityToBuy,
          {
            value: toWei(price + (price * 3) / 100),
          }
        );
    });

    it("Call the function passing everything correct. But in this case the caller do not use our private key to sign. It MUST revert with an 'Invalid Signature' error.", async () => {
      let collectrDTO = {
        nft: mintGoldDustERC721.address,
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

      const signer = ethers.provider.getSigner(1);

      // Generate the encoded data
      const encodedData = encodeData(collectrDTO);

      // Generate the EIP712 hash
      const hash = generateEIP712Hash(encodedData, domainSeparator);

      // Sign the hash
      const signature = await signData(hash, signer);

      // Sign the hash
      const signerWrong = ethers.provider.getSigner(2);
      const signatureWrong = await signData(hash, signerWrong);

      await expect(
        mintGoldDustSetPrice
          .connect(addr2)
          .collectorMintPurchase(
            collectrDTO,
            hash,
            signature,
            signatureWrong,
            quantityToBuy,
            {
              value: toWei(price * quantityToBuy),
            }
          )
      ).to.be.revertedWith("Invalid signature");
    });

    it("Call the function passing everything correct. But in this case the caller do not use our private key to sign. It MUST revert with an 'Invalid Signature' error.", async () => {
      let collectrDTO = {
        nft: mintGoldDustERC721.address,
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

      const signer = ethers.provider.getSigner(1);

      // Generate the encoded data
      const encodedData = encodeData(collectrDTO);

      // Generate the EIP712 hash
      const hash = generateEIP712Hash(encodedData, domainSeparator);

      // Sign the hash
      const signature = await signData(hash, signer);

      // Sign the hash
      const mintGoldDustSignature = await wallet.signMessage(hash);

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
              value: toWei(price * 5),
            }
          )
      ).to.be.revertedWithCustomError(
        mintGoldDustSetPrice,
        "InvalidAmountForThisPurchase"
      );
    });
  });
});
