import { expect, use } from "chai";
import { ethers } from "hardhat";

const toWei = (num: number) => ethers.utils.parseEther(num.toString());
const fromWei = (num: any) => ethers.utils.formatEther(num);

describe("LSP17 Smart Contract", function () {
  let LSP17: any;
  let lsp17: any;

  let deployer: any;
  let addr1: any;
  let addr2: any;
  let addrs: any;

  let URI = "sample URI";

  beforeEach(async function () {
    // Get the ContractFactories and Signers here.
    LSP17 = await ethers.getContractFactory("GDNFT");

    [deployer, addr1, addr2, ...addrs] = await ethers.getSigners();

    // To deploy our contracts
    lsp17 = await LSP17.deploy();
  });
  it("Should dispatch fallback", () => {
    console.log("VALLLLLLL: ", lsp17.val());
    expect(lsp17.val()).to.be.equal(10);
  });
});
