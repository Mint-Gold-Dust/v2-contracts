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

describe("MintGoldDustSetPrice.sol Smart Contract \n___________________________________________________\n \nThis smart contract is responsible by all functionalities related with the fixed price market. \n Here goes the tests related with the collectorMint feature of MintGoldDustSetPrice market for MintGoldDustERC1155 splitted tokens. \n\n", function () {
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
  let addr6: SignerWithAddress;
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

    [deployer, addr1, addr2, addr3, addr4, addr5, addr6, ...addrs] =
      await ethers.getSigners();

    mintGoldDustCompany = await upgrades.deployProxy(
      MintGoldDustCompany,
      [
        TEST_OWNER,
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

  describe("\n--------------- Tests related witn collector mint functionality after a MintGoldDustERC1155 traditional purchase on set price ---------------\n", function () {
    let quantityToMint = 10;
    let quantityToBuy = 5;

    // Create an instance of the ListDTO struct

    beforeEach(async () => {
      // MGD owner whitelist the artist
      await mintGoldDustCompany
        .connect(deployer)
        .whitelist(addr1.address, true);

      // Artist approve gdMarketPlace marketplace to exchange its NFT
      await mintGoldDustERC1155
        .connect(addr1)
        .setApprovalForAll(mintGoldDustSetPrice.address, true);

      await mintGoldDustERC1155
        .connect(addr1)
        .setApprovalForAll(mintGoldDustMarketplaceAuction.address, true);
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

      mintGoldDustSetPrice.connect(deployer).setPublicKey(wallet.address);

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

      let tokenAmount = price * quantityToBuy;
      tokenAmount = tokenAmount + (tokenAmount * 3) / 100;

      const tx = await mintGoldDustSetPrice
        .connect(addr2)
        .collectorMintPurchase(
          collectrDTO,
          hash,
          signature,
          mintGoldDustSignature,
          quantityToBuy,
          {
            value: toWei(tokenAmount),
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

      expect(receipt.events[5].event).to.be.equal(
        "MintGoldDustNftPurchasedPrimaryMarket"
      );
      expect(receipt.events[5].eventSignature).to.be.equal(
        "MintGoldDustNftPurchasedPrimaryMarket(uint256,uint256,address,address,uint256,uint256,uint256,bool)"
      );
      expect(receipt.events[5].args.saleId).to.be.equal(1);
      expect(receipt.events[5].args.tokenId).to.be.equal(1);
      expect(receipt.events[5].args.seller).to.be.equal(addr1.address);
      expect(receipt.events[5].args.newOwner).to.be.equal(addr2.address);
      expect(receipt.events[5].args.buyPrice).to.be.equal(
        toWei(price * quantityToBuy)
      );
      expect(receipt.events[5].args.sellerAmount).to.be.equal(
        toWei(balance * quantityToBuy)
      );
      expect(receipt.events[5].args.tokenAmountSold).to.be.equal(quantityToBuy);
      expect(receipt.events[5].args.isERC721).to.be.false;

      let marketItem =
        await mintGoldDustSetPrice.idMarketItemsByContractByOwner(
          mintGoldDustERC1155.address,
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

      expect(await mintGoldDustERC1155.uri(1)).to.equal(URI);
      expect(await mintGoldDustERC1155.tokenIdArtist(1)).to.equal(
        addr1.address
      );

      expect(await mintGoldDustERC1155.balanceOf(addr1.address, 1)).to.equal(0);
      expect(await mintGoldDustERC1155.balanceOf(addr2.address, 1)).to.equal(5);
      expect(
        await mintGoldDustERC1155.balanceOf(mintGoldDustSetPrice.address, 1)
      ).to.equal(5);

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
        buyerBalanceAfter.add(toWei(tokenAmount).add(totalGas))
      );

      expect(await deployer.getBalance()).to.be.closeTo(
        mintGoldDustOwnerBalanceBefore.add(
          toWei(primarySaleFee).add(toWei(collectorFee))
        ),
        ethers.BigNumber.from("100000000000000")
      );

      // The artist amount should be 5.
      const manageSecondarySale = await mintGoldDustSetPrice.isSecondarySale(
        mintGoldDustERC1155.address,
        1
      );
      expect(manageSecondarySale.amount).to.be.equal(
        quantityToMint - quantityToBuy
      );
      expect(manageSecondarySale.owner).to.be.equal(addr1.address);
      expect(manageSecondarySale.sold).to.be.false;

      const manageSecondarySaleAuction =
        await mintGoldDustMarketplaceAuction.isSecondarySale(
          mintGoldDustERC1155.address,
          1
        );
      expect(manageSecondarySaleAuction.amount).to.be.equal(
        quantityToMint - quantityToBuy
      );
      expect(manageSecondarySaleAuction.owner).to.be.equal(addr1.address);
      expect(manageSecondarySaleAuction.sold).to.be.false;

      const collectorBalanceBeforeSecondTx = await addr2.getBalance();
      const artistBuyerItsOwnArtBalance = await addr1.getBalance();
      const deployerBeforeSecondTx = await deployer.getBalance();

      // Artist approve mintGoldDustSetPrice marketplace to exchange its NFT
      await mintGoldDustERC1155
        .connect(addr2)
        .setApprovalForAll(mintGoldDustSetPrice.address, true);

      //HERE STARTS THE OTHER PROCESS
      const txList = await mintGoldDustSetPrice
        .connect(addr2)
        .list(1, quantityToBuy, mintGoldDustERC1155.address, toWei(price));

      const receiptList = await txList.wait();
      const totalGasList = receiptList.gasUsed.mul(await txList.gasPrice);

      const txPurchase = await mintGoldDustSetPrice.connect(addr1).purchaseNft(
        {
          tokenId: 1,
          amount: quantityToBuy,
          contractAddress: mintGoldDustERC1155.address,
          seller: addr2.address,
        },
        {
          value: toWei(price * 5),
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
      const manageSecondarySale2 = await mintGoldDustSetPrice.isSecondarySale(
        mintGoldDustERC1155.address,
        1
      );
      expect(manageSecondarySale2.amount).to.be.equal(
        quantityToMint - quantityToBuy
      );
      expect(manageSecondarySale2.owner).to.be.equal(addr1.address);
      expect(manageSecondarySale2.sold).to.be.false;

      const manageSecondarySaleAuction2 =
        await mintGoldDustMarketplaceAuction.isSecondarySale(
          mintGoldDustERC1155.address,
          1
        );
      expect(manageSecondarySaleAuction2.amount).to.be.equal(
        quantityToMint - quantityToBuy
      );
      expect(manageSecondarySaleAuction2.owner).to.be.equal(addr1.address);
      expect(manageSecondarySaleAuction2.sold).to.be.false;

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
        ethers.BigNumber.from("100000000000000")
      );

      expect(await deployer.getBalance()).to.be.equal(
        deployerBeforeSecondTx.add(toWei(secondarySaleFee))
      );

      expect(await mintGoldDustERC1155.balanceOf(addr1.address, 1)).to.equal(5);
      expect(await mintGoldDustERC1155.balanceOf(addr2.address, 1)).to.equal(0);
      expect(
        await mintGoldDustERC1155.balanceOf(mintGoldDustSetPrice.address, 1)
      ).to.equal(5);

      /**
       * Until here:
       * 1. The artist minted 10 NFTs
       *   - So the manageSecondarySale.amount should be 10
       *   - And the ERC1155 balance of the artist should be 0
       *   - And the ERC1155 balance for the mintGoldDustSetPrice contract should be 10
       * 2. The artist sold 5 NFTs to addr2
       *   - So the manageSecondarySale.amount should be 5
       *   - And the ERC1155 balance of the artist should be 0
       *   - And the ERC1155 balance for the mintGoldDustSetPrice contract should be 5
       *   - And the ERC1155 balance of the addr2 should be 5
       * 3. The addr2 sold 5 NFTs to addr1
       *   - So the manageSecondarySale.amount should keep 5
       *   - And the ERC1155 balance of the artist should be 5
       *   - And the ERC1155 balance of the addr2 should be 0
       *
       * If the artist try to list more than 5 NFTs:
       *   - it should revert with an error, because the manageSecondarySale.amount is 5.
       *   - It means that this artist only have more 5 NFTs to sell in the primary market.
       * So to achieve this error in the collector mint flow we'll delist the artist last 5 items
       * and try to relist more than 5.
       *
       */

      // Here starts the third operation
      const artistBalanceBeforeThirdTx = await addr1.getBalance();
      const buyerBalanceBeforeThirdTx = await addr2.getBalance();
      const deployerBeforeThirdTx = await deployer.getBalance();

      const txDelist = await mintGoldDustSetPrice.connect(addr1).delistNft({
        tokenId: 1,
        amount: 5,
        contractAddress: mintGoldDustERC1155.address,
      });

      const receiptDelist = await txDelist.wait();
      const totalGasDelist = receiptDelist.gasUsed.mul(await txDelist.gasPrice);

      expect(await mintGoldDustERC1155.balanceOf(addr1.address, 1)).to.equal(
        10
      );
      expect(await mintGoldDustERC1155.balanceOf(addr2.address, 1)).to.equal(0);
      expect(
        await mintGoldDustERC1155.balanceOf(mintGoldDustSetPrice.address, 1)
      ).to.equal(0);

      // Here we confirm that the state manipulation is working for both contracts
      await expect(
        mintGoldDustMarketplaceAuction
          .connect(addr1)
          .list(1, 10, mintGoldDustERC1155.address, toWei(price))
      ).to.be.revertedWith("Invalid amount for primary sale");

      await expect(
        mintGoldDustSetPrice
          .connect(addr1)
          .list(1, 10, mintGoldDustERC1155.address, toWei(price))
      ).to.be.revertedWith("Invalid amount for primary sale");

      const txList3 = await mintGoldDustSetPrice
        .connect(addr1)
        .list(1, quantityToBuy, mintGoldDustERC1155.address, toWei(price));

      const receiptList3 = await txList3.wait();
      const totalGasList3 = receiptList3.gasUsed.mul(await txList3.gasPrice);

      tokenAmount = price * quantityToBuy;
      tokenAmount = tokenAmount + (tokenAmount * 3) / 100;
      const txPurchase2 = await mintGoldDustSetPrice.connect(addr2).purchaseNft(
        {
          tokenId: 1,
          amount: quantityToBuy,
          contractAddress: mintGoldDustERC1155.address,
          seller: addr1.address,
        },
        {
          value: toWei(tokenAmount),
        }
      );

      const receiptPurchase2 = await txPurchase2.wait();
      const totalGasPurchase2 = receiptPurchase2.gasUsed.mul(
        txPurchase2.gasPrice
      );

      expect(await addr1.getBalance()).to.be.closeTo(
        artistBalanceBeforeThirdTx
          .sub(totalGasDelist)
          .sub(totalGasList3)
          .add(toWei(sellerAmount)),
        ethers.BigNumber.from("1000000000000000")
      );

      expect(await addr2.getBalance()).to.be.equal(
        buyerBalanceBeforeThirdTx.sub(toWei(tokenAmount)).sub(totalGasPurchase2)
      );

      expect(await deployer.getBalance()).to.be.equal(
        deployerBeforeThirdTx.add(
          toWei(primarySaleFee).add(toWei(collectorFee))
        )
      );

      const manageSecondarySale3 = await mintGoldDustSetPrice.isSecondarySale(
        mintGoldDustERC1155.address,
        1
      );

      expect(manageSecondarySale3.amount).to.be.equal(0);
      expect(manageSecondarySale3.owner).to.be.equal(addr1.address);
      expect(manageSecondarySale3.sold).to.be.true;

      const manageSecondarySaleAuction3 =
        await mintGoldDustMarketplaceAuction.isSecondarySale(
          mintGoldDustERC1155.address,
          1
        );
      expect(manageSecondarySaleAuction3.amount).to.be.equal(0);
      expect(manageSecondarySaleAuction3.owner).to.be.equal(addr1.address);
      expect(manageSecondarySaleAuction3.sold).to.be.true;

      expect(await mintGoldDustERC1155.balanceOf(addr1.address, 1)).to.equal(5);
      expect(await mintGoldDustERC1155.balanceOf(addr2.address, 1)).to.equal(5);
      expect(
        await mintGoldDustERC1155.balanceOf(mintGoldDustSetPrice.address, 1)
      ).to.equal(0);

      // Now let's do the process again that the addr1 buys the addr2 NFTs
      // But now we'll list all tokens and it should work well. Now all sales are secondary for the artist for this NFT
      const artistBalanceBeforeFourthTx = await addr1.getBalance();
      const buyerBalanceBeforeFourthTx = await addr2.getBalance();
      const deployerBeforeFourthTx = await deployer.getBalance();

      const txList4 = await mintGoldDustSetPrice
        .connect(addr2)
        .list(1, quantityToBuy, mintGoldDustERC1155.address, toWei(price));

      const receiptList4 = await txList4.wait();
      const totalGasList4 = receiptList4.gasUsed.mul(await txList4.gasPrice);

      const txPurchase3 = await mintGoldDustSetPrice.connect(addr1).purchaseNft(
        {
          tokenId: 1,
          amount: quantityToBuy,
          contractAddress: mintGoldDustERC1155.address,
          seller: addr2.address,
        },
        {
          value: toWei(price * 5),
        }
      );

      const receiptPurchase3 = await txPurchase3.wait();
      const totalGasPurchase3 = receiptPurchase3.gasUsed.mul(
        txPurchase3.gasPrice
      );

      expect(await addr1.getBalance()).to.be.equal(
        artistBalanceBeforeFourthTx
          .add(toWei(royaltPercent))
          .sub(totalGasPurchase3)
          .sub(toWei(price * 5))
      );

      expect(await addr2.getBalance()).to.be.equal(
        buyerBalanceBeforeFourthTx
          .sub(totalGasList4)
          .add(toWei(sellerAmountSecondarySale))
      );

      expect(await deployer.getBalance()).to.be.equal(
        deployerBeforeFourthTx.add(toWei(secondarySaleFee))
      );

      const manageSecondarySale4 = await mintGoldDustSetPrice.isSecondarySale(
        mintGoldDustERC1155.address,
        1
      );

      expect(manageSecondarySale4.amount).to.be.equal(0);
      expect(manageSecondarySale4.owner).to.be.equal(addr1.address);
      expect(manageSecondarySale4.sold).to.be.true;

      const manageSecondarySaleAuction4 =
        await mintGoldDustMarketplaceAuction.isSecondarySale(
          mintGoldDustERC1155.address,
          1
        );
      expect(manageSecondarySaleAuction4.amount).to.be.equal(0);
      expect(manageSecondarySaleAuction4.owner).to.be.equal(addr1.address);
      expect(manageSecondarySaleAuction4.sold).to.be.true;

      expect(await mintGoldDustERC1155.balanceOf(addr1.address, 1)).to.equal(
        10
      );
      expect(await mintGoldDustERC1155.balanceOf(addr2.address, 1)).to.equal(0);
      expect(
        await mintGoldDustERC1155.balanceOf(mintGoldDustSetPrice.address, 1)
      ).to.equal(0);

      // Now we'll list the 10 items. And all sales now MUST be secondary sales.
      const artistBalanceBeforeFifthTx = await addr1.getBalance();
      const buyerBalanceBeforeFifthTx = await addr2.getBalance();
      const deployerBeforeFifthTx = await deployer.getBalance();

      const txList5 = await mintGoldDustSetPrice
        .connect(addr1)
        .list(1, quantityToBuy, mintGoldDustERC1155.address, toWei(price));

      const receiptList5 = await txList5.wait();
      const totalGasList5 = receiptList5.gasUsed.mul(await txList5.gasPrice);

      const txPurchase4 = await mintGoldDustSetPrice.connect(addr2).purchaseNft(
        {
          tokenId: 1,
          amount: quantityToBuy,
          contractAddress: mintGoldDustERC1155.address,
          seller: addr1.address,
        },
        {
          value: toWei(price * 5),
        }
      );

      const receiptPurchase4 = await txPurchase4.wait();
      const totalGasPurchase4 = receiptPurchase4.gasUsed.mul(
        txPurchase4.gasPrice
      );

      expect(await addr2.getBalance()).to.be.equal(
        buyerBalanceBeforeFifthTx.sub(totalGasPurchase4).sub(toWei(price * 5))
      );

      expect(await addr1.getBalance()).to.be.equal(
        artistBalanceBeforeFifthTx
          .sub(totalGasList5)
          .add(toWei(sellerAmountSecondarySale))
          .add(toWei(royaltPercent))
      );

      expect(await deployer.getBalance()).to.be.equal(
        deployerBeforeFifthTx.add(toWei(secondarySaleFee))
      );

      const manageSecondarySale5 = await mintGoldDustSetPrice.isSecondarySale(
        mintGoldDustERC1155.address,
        1
      );

      expect(manageSecondarySale5.amount).to.be.equal(0);
      expect(manageSecondarySale5.owner).to.be.equal(addr1.address);
      expect(manageSecondarySale5.sold).to.be.true;

      const manageSecondarySaleAuction5 =
        await mintGoldDustMarketplaceAuction.isSecondarySale(
          mintGoldDustERC1155.address,
          1
        );
      expect(manageSecondarySaleAuction5.amount).to.be.equal(0);
      expect(manageSecondarySaleAuction5.owner).to.be.equal(addr1.address);
      expect(manageSecondarySaleAuction5.sold).to.be.true;

      expect(await mintGoldDustERC1155.balanceOf(addr1.address, 1)).to.equal(5);
      expect(await mintGoldDustERC1155.balanceOf(addr2.address, 1)).to.equal(5);
      expect(
        await mintGoldDustERC1155.balanceOf(mintGoldDustSetPrice.address, 1)
      ).to.equal(0);

      const artistBalanceBeforeSixthTx = await addr1.getBalance();
      const buyerBalanceBeforeSixthTx = await addr2.getBalance();
      const deployerBeforeSixthTx = await deployer.getBalance();

      const txList6 = await mintGoldDustSetPrice
        .connect(addr1)
        .list(1, quantityToBuy, mintGoldDustERC1155.address, toWei(price));

      const receiptList6 = await txList6.wait();
      const totalGasList6 = receiptList6.gasUsed.mul(await txList6.gasPrice);

      const txPurchase5 = await mintGoldDustSetPrice.connect(addr2).purchaseNft(
        {
          tokenId: 1,
          amount: quantityToBuy,
          contractAddress: mintGoldDustERC1155.address,
          seller: addr1.address,
        },
        {
          value: toWei(price * 5),
        }
      );

      const receiptPurchase5 = await txPurchase5.wait();
      const totalGasPurchase5 = receiptPurchase5.gasUsed.mul(
        txPurchase5.gasPrice
      );

      expect(await addr2.getBalance()).to.be.equal(
        buyerBalanceBeforeSixthTx.sub(totalGasPurchase5).sub(toWei(price * 5))
      );

      expect(await addr1.getBalance()).to.be.equal(
        artistBalanceBeforeSixthTx
          .sub(totalGasList6)
          .add(toWei(sellerAmountSecondarySale))
          .add(toWei(royaltPercent))
      );

      expect(await deployer.getBalance()).to.be.equal(
        deployerBeforeSixthTx.add(toWei(secondarySaleFee))
      );

      expect(await mintGoldDustERC1155.balanceOf(addr1.address, 1)).to.equal(0);
      expect(await mintGoldDustERC1155.balanceOf(addr2.address, 1)).to.equal(
        10
      );
      expect(
        await mintGoldDustERC1155.balanceOf(mintGoldDustSetPrice.address, 1)
      ).to.equal(0);
    });
  });

  describe("Bad path tests", function () {
    const quantityToMint = 10;
    const quantityToBuy = 5;
    let wallet: Wallet;

    beforeEach(async () => {
      // MGD owner whitelist the artist
      await mintGoldDustCompany
        .connect(deployer)
        .whitelist(addr1.address, true);

      // Artist approve gdMarketPlace marketplace to exchange its NFT
      await mintGoldDustERC1155
        .connect(addr1)
        .setApprovalForAll(mintGoldDustSetPrice.address, true);

      wallet = await generateWallet();

      mintGoldDustSetPrice.connect(deployer).setPublicKey(wallet.address);
    });

    it('Should call the collectorMint function with an address that is not the mintGoldDustERC1155 address. It MUST revert with an "UnauthorizedOnNFT" error.', async () => {
      await expect(
        mintGoldDustERC1155
          .connect(addr1)
          .collectorSplitMint(
            URI,
            toWei(royalty),
            [addr2.address, addr3.address, addr4.address, addr5.address],
            [toWei(20), toWei(20), toWei(20), toWei(20), toWei(20)],
            quantityToMint,
            addr4.address,
            bytesMemoir,
            1
          )
      )
        .to.be.revertedWithCustomError(mintGoldDustERC1155, "UnauthorizedOnNFT")
        .withArgs("SET_PRICE");
    });

    it("Call the function passing everything correct. The attacker can generate the object, the EIP712 and everything using an address that is not a whitelisted artist. It MUST revert with an UnauthorizedOnNFT error.", async () => {
      let collectrDTO = {
        contractAddress: mintGoldDustERC1155.address,
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

      await mintGoldDustERC1155
        .connect(addr2)
        .setApprovalForAll(mintGoldDustSetPrice.address, true);


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
              value: toWei(quantityToBuy*price*1.03),
            }
          )
      )
        .to.be.revertedWithCustomError(
          mintGoldDustERC1155,
          "UnauthorizedOnNFT"
        )
        .withArgs("ARTIST");
    });

    it('Should call the collectorMint function passing a wrong royalty percentage. It MUST revert with an "Invalid contract address" error.', async () => {
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

      const signer = ethers.provider.getSigner(1);

      // Generate the encoded data
      const encodedData = encodeData(collectrDTO);

      // Generate the EIP712 hash
      const hash = generateEIP712Hash(encodedData, domainSeparator);

      // Sign the hash
      const signature = await signData(hash, signer);

      // Sign the hash
      const mintGoldDustSignature = await wallet.signMessage(hash);

      let tokenAmount = price * quantityToBuy;
      tokenAmount = tokenAmount + (tokenAmount * 3) / 100;

      await mintGoldDustSetPrice
        .connect(addr2)
        .collectorMintPurchase(
          collectrDTO,
          hash,
          signature,
          mintGoldDustSignature,
          quantityToBuy,
          {
            value: toWei(tokenAmount),
          }
        );
    });

    it("Call the function passing everything correct. But in this case the caller do not use our private key to sign. It MUST revert with an 'Invalid Signature' error.", async () => {
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
              value: toWei(price),
            }
          )
      ).to.be.revertedWithCustomError(
        mintGoldDustSetPrice,
        "InvalidAmountForThisPurchase"
      );
    });
  });
});
