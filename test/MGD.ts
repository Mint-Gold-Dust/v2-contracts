// import { expect, use } from "chai";
// import { ethers } from "hardhat";

// const toWei = (num: number) => ethers.utils.parseEther(num.toString());
// const fromWei = (num: any) => ethers.utils.formatEther(num);

// describe("MGD Smart Contract", function () {
//   let MGD: any;
//   let mgd: any;

//   let GDNFT: any;
//   let gdnft: any;

//   let deployer: any;
//   let addr1: any;
//   let addr2: any;
//   let addrs: any;

//   let _feePercent: number;
//   let URI = "sample URI";

//   beforeEach(async function () {
//     // Get the ContractFactories and Signers here.
//     MGD = await ethers.getContractFactory("MGD");
//     GDNFT = await ethers.getContractFactory("GDNFT");
//     [deployer, addr1, addr2, ...addrs] = await ethers.getSigners();

//     _feePercent = 10;

//     // To deploy our contracts
//     mgd = await MGD.deploy(_feePercent);
//     gdnft = await GDNFT.deploy();
//   });

//   describe("Deployment", function () {
//     it("Should contract owner be equal to deployer address", async function () {
//       expect(await mgd.owner()).to.equal(deployer.address);
//     });

//     it("Should match the feePercent value with the value passed to the constructor", async function () {
//       expect(await mgd._getFeePercent()).to.equal(_feePercent);
//     });
//   });

//   describe("Listing a NFT", function () {
//     beforeEach(async () => {
//       await gdnft.connect(addr1).mint(URI);

//       await gdnft.connect(addr1).setApprovalForAll(mgd.address, true);
//     });
//     it("Should track newly listed item, transfer NFT from seller to MGD marketplace and emmit the Listed event", async function () {
//       // addr1 mints an mgd
//       expect(mgd.connect(addr1)._listItem(gdnft.address, 1, toWei(1)))
//         .to.emit(mgd, "Listed")
//         .withArgs(1, gdnft.address, 1, toWei(1), addr1.address);
//       expect(await gdnft.ownerOf(1)).to.equal(mgd.address);
//     });
//   });
// });
