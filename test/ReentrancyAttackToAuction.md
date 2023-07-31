import { Contract, ContractFactory } from "ethers";
import { expect } from "chai";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { ethers } from "hardhat";

describe("Auction Contract Penetration Test", () => {
let MintGoldDustERC721: ContractFactory;
let mintGoldDustERC721: Contract;

let MintGoldDustCompany: ContractFactory;
let mgdCompany: Contract;

let MintGoldDustMarketplaceAuction: ContractFactory;
let mintGoldDustMarketplaceAuction: Contract;

let MintGoldDustSetPrice: ContractFactory;
let mgdSetPrice: Contract;

let MaliciousReentrancy: ContractFactory;
let maliciousReentrancy: Contract;

let deployer: SignerWithAddress;
let addr1: SignerWithAddress;
let addr2: SignerWithAddress;
let addr3: SignerWithAddress;
let addrs: SignerWithAddress[];

let URI = "sample URI";

//const REAL_OWNER = "0x46ab5D1518688f66286aF7c6C9f5552edd050d15";
const TEST_OWNER = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266";
const primary_sale_fee_percent_initial = 15000000000000000000n;
const secondary_sale_fee_percent_initial = 5000000000000000000n;
const collector_fee_initial = 3000000000000000000n;
const max_royalty_initial = 20000000000000000000n; const auction_duration = 5;
const auction_extension_duration = 1;
const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

let primary_sale_fee_percent = 15;
let secondary_sale_fee_percent = 5;
let collector_fee = 3;
let max_royalty = 20;
let royalty = 5;

beforeEach(async () => {
[deployer, addr1, addr2, addr3, ...addrs] = await ethers.getSigners();

    mgdCompany = await upgrades.deployProxy(
      MintGoldDustCompany,
      [
        TEST_OWNER,
        primary_sale_fee_percent_initial,
        secondary_sale_fee_percent_initial,
        collector_fee_initial,
        max_royalty_initial, auction_duration, auction_extension_duration
      ],
      { initializer: "initialize" }
    );
    await mgdCompany.deployed();

    mintGoldDustERC721 = await upgrades.deployProxy(
      MintGoldDustERC721,
      [mgdCompany.address],
      {
        initializer: "initialize",
      }
    );
    await mintGoldDustERC721.deployed();

    mintGoldDustMarketplaceAuction = await upgrades.deployProxy(
      MintGoldDustMarketplaceAuction,
      [mgdCompany.address, mintGoldDustERC721.address],
      { initializer: "initialize" }
    );
    await mintGoldDustMarketplaceAuction.deployed();

    mgdSetPrice = await upgrades.deployProxy(
      MintGoldDustSetPrice,
      [mgdCompany.address, mintGoldDustERC721.address],
      { initializer: "initialize" }
    );
    await mgdSetPrice.deployed();

    await mgdCompany.connect(deployer).setValidator(deployer.address, true);

    // Deploy the malicious contract
    const MaliciousContract = await ethers.getContractFactory(
      "MaliciousContract"
    );
    maliciousReentrancy = await MaliciousReentrancy.deploy(
      mintGoldDustMarketplaceAuction.address
    );

});

it("should fail reentrancy attack", async () => {
// Place a bid on the auction contract
await mintGoldDustMarketplaceAuction.placeBid(bidDTO);

    // Trigger the reentrancy attack by calling the fallback function of the malicious contract
    await mintGoldDustMarketplaceAuction.triggerReentrancyAttack();

    // Assert that the attack fails and the auction contract reverts
    await expect(
      mintGoldDustMarketplaceAuction.placeBid(bidDTO)
    ).to.be.revertedWith("Reentrancy protection");

});
});
