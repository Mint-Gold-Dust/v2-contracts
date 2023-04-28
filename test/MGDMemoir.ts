require("dotenv").config();
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect, use } from "chai";
import { Contract, ContractFactory } from "ethers";
import { ethers, upgrades } from "hardhat";

const toWei = (num: any) => ethers.utils.parseEther(num.toString());
const fromWei = (num: any) => ethers.utils.formatEther(num);

describe("******************************************** MGDMemoirs.sol Smart Contract ************************************************\n\n\tThis smart contract is responsible vinculate memoirs with some address, be it an EOA or a contract address. \n\n", function () {
  let MGDnft: ContractFactory;
  let mgdNft: Contract;

  let MGDCompany: ContractFactory;
  let mgdCompany: Contract;

  let MGDMemoir: ContractFactory;
  let mgdMemoir: Contract;

  let deployer: SignerWithAddress;
  let addr1: SignerWithAddress;
  let addr2: SignerWithAddress;
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
    MGDMemoir = await ethers.getContractFactory("MGDMemoir");

    [deployer, addr1, addr2, ...addrs] = await ethers.getSigners();

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

    mgdMemoir = await MGDMemoir.deploy();
    await mgdMemoir.deployed();

    await mgdCompany.connect(deployer).setValidator(deployer.address, true);
  });

  describe("* TESTS RELATED WITH TOKENS MEMOIRS\n", () => {
    it("Should add a new memoir for a new MGD ERC721 minted by the MGDnft contract.", async () => {
      console.log(
        "--------------------------------------------------------------------------------------------"
      );
      console.log(
        "\t ARTIST BALANCE BEFORE ADD MEMOIR: ",
        parseFloat(parseFloat(fromWei(await addr1.getBalance())).toFixed(5))
      );
      let artistBalanceBefore = await addr1.getBalance();

      // MGD Owner whitelist the artist addr1
      await mgdCompany.connect(deployer).whitelist(addr1.address, true);

      // Mint a new MGD ERC721
      const transaction = await mgdNft.connect(addr1).mintNft(URI, toWei(5));
      // Wait for the transaction to be finalized
      const receipt = await transaction.wait();
      const tokenId = receipt.events[0].args[2];

      const MEMOIR =
        "This is my first memoir in my art history! I was very thoughtful and very creative at this moment!";
      await mgdMemoir.addMemoirForContract(mgdNft.address, tokenId, MEMOIR);

      const decoder = new TextDecoder();
      const byteArray = ethers.utils.arrayify(
        await mgdMemoir.contractTokenIdMemoirs(mgdNft.address, tokenId)
      );
      const memoirStringReturned = decoder.decode(byteArray);

      console.log(
        "\t ARTIST BALANCE AFTER ADD MEMOIR: ",
        parseFloat(parseFloat(fromWei(await addr1.getBalance())).toFixed(5))
      );

      console.log(
        "\t \tSo the gas estimation was more less (USD):",
        parseFloat(
          fromWei(
            ethers.BigNumber.from(artistBalanceBefore).sub(
              await addr1.getBalance()
            )
          )
        ) * 2500
      );

      console.log(
        `\n\t\tTOKEN ID MEMOIR FOR THE CONTRACT MGDNFT (${mgdNft.address}):\n\t\t `,
        memoirStringReturned
      );
      expect(memoirStringReturned).to.be.equal(MEMOIR);
    });

    it("Should revert with a UseThisFunctionForContract error if someone try to call the addMemoirForContract function passing an Externally Owned Account address.", async () => {
      console.log("\n");
      console.log(
        "--------------------------------------------------------------------------------------------"
      );
      console.log(
        "\t ARTIST BALANCE BEFORE TRY TO ADD A MEMOIR: ",
        parseFloat(parseFloat(fromWei(await addr1.getBalance())).toFixed(5))
      );
      let artistBalanceBefore = await addr1.getBalance();

      // MGD Owner whitelist the artist addr1
      await mgdCompany.connect(deployer).whitelist(addr1.address, true);

      // Mint a new MGD ERC721
      const transaction = await mgdNft.connect(addr1).mintNft(URI, toWei(5));

      // Wait for the transaction to be finalized
      const receipt = await transaction.wait();
      const tokenId = receipt.events[0].args[2];

      const MEMOIR = "Some string";
      await expect(
        mgdMemoir.addMemoirForContract(addr1.address, tokenId, MEMOIR)
      ).to.be.revertedWithCustomError(mgdMemoir, "UseThisFunctionForContract");

      console.log(
        "\t ARTIST BALANCE AFTER TRY TO ADD A MEMOIR: ",
        parseFloat(parseFloat(fromWei(await addr1.getBalance())).toFixed(5))
      );

      console.log(
        "\t \tSo the gas estimation was more less (USD):",
        parseFloat(
          fromWei(
            ethers.BigNumber.from(artistBalanceBefore).sub(
              await addr1.getBalance()
            )
          )
        ) * 2500
      );
    });

    it("Should revert with a YouCannotUpdateThisMemoir error if someone try update a memoir created for a specif NFT token. It means that is not possible to update memoirs created to NFTs at the minting moment.", async () => {
      console.log(
        "\n--------------------------------------------------------------------------------------------"
      );
      // MGD Owner whitelist the artist addr1
      await mgdCompany.connect(deployer).whitelist(addr1.address, true);

      // Mint a new MGD ERC721
      const transaction = await mgdNft.connect(addr1).mintNft(URI, toWei(5));

      // Wait for the transaction to be finalized
      const receipt = await transaction.wait();
      const tokenId = receipt.events[0].args[2];

      // Artist add a memoir
      let MEMOIR = "Some string";
      await mgdMemoir.addMemoirForContract(mgdNft.address, tokenId, MEMOIR);

      // Artist try to update this memoir
      let MEMOIR2 = "NEW Some string";
      await expect(
        mgdMemoir.addMemoirForContract(mgdNft.address, tokenId, MEMOIR2)
      ).to.be.revertedWithCustomError(mgdMemoir, "YouCannotUpdateThisMemoir");
    });
  });

  describe("\n\n * TESTS RELATED WITH EXTERNALLY OWNED ACCOUNTS MEMOIRS\n", () => {
    it("Should add a new memoir for a EXTERNALLY OWNED ACCOUNT.", async () => {
      console.log(
        "--------------------------------------------------------------------------------------------"
      );
      console.log(
        "\t USER BALANCE BEFORE ADD MEMOIR: ",
        parseFloat(parseFloat(fromWei(await addr1.getBalance())).toFixed(5))
      );
      let artistBalanceBefore = await addr1.getBalance();

      const MEMOIR =
        "This is my first memoir in my art history! I think web3 will revolutionize the art world!";
      await mgdMemoir.addMemoirForEOA(addr1.address, MEMOIR);

      const decoder = new TextDecoder();
      const byteArray = ethers.utils.arrayify(
        await mgdMemoir.userCounterMemoirs(addr1.address, 1)
      );
      const memoirStringReturned = decoder.decode(byteArray);

      console.log(
        "\t USER BALANCE AFTER ADD MEMOIR: ",
        parseFloat(parseFloat(fromWei(await addr1.getBalance())).toFixed(5))
      );

      console.log(
        "\t \tSo the gas estimation was more less (USD):",
        parseFloat(
          fromWei(
            ethers.BigNumber.from(artistBalanceBefore).sub(
              await addr1.getBalance()
            )
          )
        ) * 2500
      );

      console.log(
        `\n\t\THE MEMOIR FOR THE USER (${addr1.address}):\n\t\t `,
        memoirStringReturned
      );
      expect(memoirStringReturned).to.be.equal(MEMOIR);
    });

    it("Should revert with a UseThisFunctionForEOA error if someone try to call the addMemoirForEOA function passing a contract address.", async () => {
      console.log("\n");
      console.log(
        "--------------------------------------------------------------------------------------------"
      );
      console.log(
        "\t USER BALANCE BEFORE TRY TO ADD A MEMOIR: ",
        parseFloat(parseFloat(fromWei(await addr1.getBalance())).toFixed(5))
      );
      let artistBalanceBefore = await addr1.getBalance();

      // MGD Owner whitelist the artist addr1
      await mgdCompany.connect(deployer).whitelist(addr1.address, true);

      // Mint a new MGD ERC721
      await expect(mgdNft.connect(addr1).mintNft(URI, toWei(5)))
        .to.emit(mgdNft, "NftMinted")
        .withArgs(1, addr1.address, URI, toWei(5));

      const MEMOIR = "Some string";
      await expect(
        mgdMemoir.addMemoirForEOA(mgdNft.address, MEMOIR)
      ).to.be.revertedWithCustomError(mgdMemoir, "UseThisFunctionForEOA");

      console.log(
        "\t USER BALANCE AFTER TRY TO ADD A MEMOIR: ",
        parseFloat(parseFloat(fromWei(await addr1.getBalance())).toFixed(5))
      );

      console.log(
        "\t \tSo the gas estimation was more less (USD):",
        parseFloat(
          fromWei(
            ethers.BigNumber.from(artistBalanceBefore).sub(
              await addr1.getBalance()
            )
          )
        ) * 2500
      );
    });

    it("Should allow an artist to create more than one memoir for itself and check if the userCounter for this address is the same of the memoirs added.", async () => {
      console.log(
        "--------------------------------------------------------------------------------------------"
      );

      const decoder = new TextDecoder();

      // MGD Owner whitelist the artist addr1
      await mgdCompany.connect(deployer).whitelist(addr1.address, true);

      const MEMOIR1 =
        "This is my first memoir in my art history! I think web3 will revolutionize the art world!";
      await mgdMemoir.addMemoirForEOA(addr1.address, MEMOIR1);

      let byteArray = ethers.utils.arrayify(
        await mgdMemoir.userCounterMemoirs(addr1.address, 1)
      );

      let memoirStringReturned1 = decoder.decode(byteArray);

      console.log(
        `\n\t\THE FIRST MEMOIR FOR THIS ARTIST (${addr1.address}):\n\t\t `,
        memoirStringReturned1
      );
      expect(memoirStringReturned1).to.be.equal(MEMOIR1);

      // artist add your second memoir
      const MEMOIR2 =
        "This is my second memoir in my art history! I think web3 is really revolutionizing the art world!";
      await mgdMemoir.addMemoirForEOA(addr1.address, MEMOIR2);

      byteArray = ethers.utils.arrayify(
        await mgdMemoir.userCounterMemoirs(addr1.address, 2)
      );

      let memoirStringReturned2 = decoder.decode(byteArray);

      console.log(
        `\n\t\THE SECOND MEMOIR FOR THIS ARTIST (${addr1.address}):\n\t\t `,
        memoirStringReturned2
      );
      expect(memoirStringReturned2).to.be.equal(MEMOIR2);

      expect(await mgdMemoir.userCounter(addr1.address)).to.be.equal(2);
    });

    it("Should allow a collector to create more than one memoir for itself and check if the userCounter for this address is the same of the memoirs added.", async () => {
      console.log(
        "--------------------------------------------------------------------------------------------"
      );

      const decoder = new TextDecoder();

      // The user add your fist memoir
      const MEMOIR1 =
        "This is my first memoir in my art history! I think web3 will revolutionize the art world!";
      await mgdMemoir.addMemoirForEOA(addr2.address, MEMOIR1);

      let byteArray = ethers.utils.arrayify(
        await mgdMemoir.userCounterMemoirs(addr2.address, 1)
      );

      let memoirStringReturned1 = decoder.decode(byteArray);

      console.log(
        `\n\t\THE FIRST MEMOIR FOR THIS USER (${addr2.address}):\n\t\t `,
        memoirStringReturned1
      );
      expect(memoirStringReturned1).to.be.equal(MEMOIR1);

      // artist add your second memoir
      const MEMOIR2 =
        "This is my second memoir in my art history! I think web3 is really revolutionizing the art world!";
      await mgdMemoir.addMemoirForEOA(addr2.address, MEMOIR2);

      byteArray = ethers.utils.arrayify(
        await mgdMemoir.userCounterMemoirs(addr2.address, 2)
      );

      let memoirStringReturned2 = decoder.decode(byteArray);

      console.log(
        `\n\t\THE SECOND MEMOIR FOR THIS USER (${addr2.address}):\n\t\t `,
        memoirStringReturned2
      );
      expect(memoirStringReturned2).to.be.equal(MEMOIR2);

      expect(await mgdMemoir.userCounter(addr2.address)).to.be.equal(2);
    });
  });
});
