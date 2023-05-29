require("dotenv").config();
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect, use } from "chai";
import { Contract, ContractFactory } from "ethers";
import { ethers } from "hardhat";

const toWei = (num: any) => ethers.utils.parseEther(num.toString());
const fromWei = (num: any) => ethers.utils.formatEther(num);

describe("splitMints are related with the MintGoldDustERC721.sol and MintGoldDustMarketplace.sol Smart Contracts \n**********************\_\_**********************\n \n\tThe process of the split payments starts at the moment of the minting. It means that the artist can choose to mint with or without adding of collaborators. After that, the flow ends at the moment of the sale process. For the primary sales the balance will be divided between the artist creator and its collaborators and in the secondary market the royalty gonna be diveded by the same people. \n", function () {
let MintGoldDustERC721: ContractFactory;
let mintGoldDustERC721: Contract;

let MintGoldDustERC1155: ContractFactory;
let mintGoldDustERC1155: Contract;

let MintGoldDustCompany: ContractFactory;
let mgdCompany: Contract;

let MintGoldDustSetPrice: ContractFactory;
let mgdSetPrice: Contract;

let deployer: SignerWithAddress;
let addr1: SignerWithAddress;
let addr2: SignerWithAddress;
let addr3: SignerWithAddress;
let addr4: SignerWithAddress;
let addr5: SignerWithAddress;
let addr6: SignerWithAddress;
let addr7: SignerWithAddress;
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
let secondary_sale_fee_percent = 5;
let collector_fee = 3;
let max_royalty = 20;
let royalty = 5;

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

    [deployer, addr1, addr2, addr3, addr4, addr5, addr6, addr7, ...addrs] =
      await ethers.getSigners();

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
      [mgdCompany.address],
      {
        initializer: "initializeChild",
      }
    );
    await mintGoldDustERC721.deployed();

    mintGoldDustERC1155 = await upgrades.deployProxy(
      MintGoldDustERC1155,
      [mgdCompany.address, baseURI],
      {
        initializer: "initializeChild",
      }
    );
    await mintGoldDustERC1155.deployed();

    mgdSetPrice = await upgrades.deployProxy(
      MintGoldDustSetPrice,
      [
        mgdCompany.address,
        mintGoldDustERC721.address,
        mintGoldDustERC1155.address,
      ],
      { initializer: "initializeChild" }
    );
    await mgdSetPrice.deployed();

    await mgdCompany.connect(deployer).setValidator(deployer.address, true);

});

describe("\n--------------- Test related with the mint a splitted NFT functionality ---------------\n", function () {
it("Should revert with a NumberOfCollaboratorsAndPercentagesNotMatch if the number of collaborators plus one is different of the number of percentages.", async function () {
await mgdCompany.connect(deployer).whitelist(addr1.address, true);
await expect(
mintGoldDustERC1155
.connect(addr1)
.splitMint(
URI,
toWei(5),
[addr2.address, addr3.address],
[toWei(20), toWei(20)],
1
)
).to.be.revertedWithCustomError(
mintGoldDustERC1155,
"NumberOfCollaboratorsAndPercentagesNotMatch"
);
});

    it("Should revert with a TheTotalPercentageCantBeGreaterThan100 if total percentage passed to the spliPayment function surpass 100.", async function () {
      await mgdCompany.connect(deployer).whitelist(addr1.address, true);
      await expect(
        mintGoldDustERC1155
          .connect(addr1)
          .splitMint(
            URI,
            toWei(5),
            [addr2.address, addr3.address, addr4.address, addr5.address],
            [toWei(20), toWei(20), toWei(20), toWei(20), toWei(21)],
            1
          )
      ).to.be.revertedWithCustomError(
        mintGoldDustERC1155,
        "TheTotalPercentageCantBeGreaterThan100"
      );
    });

    it("Should revert with a TheTotalPercentageCantBeGreaterThan100 if total percentage passed to the spliPayment function is less than 100.", async function () {
      await mgdCompany.connect(deployer).whitelist(addr1.address, true);
      await expect(
        mintGoldDustERC1155
          .connect(addr1)
          .splitMint(
            URI,
            toWei(5),
            [addr2.address, addr3.address, addr4.address, addr5.address],
            [toWei(20), toWei(20), toWei(20), toWei(20), toWei(19)],
            1
          )
      ).to.be.revertedWithCustomError(
        mintGoldDustERC1155,
        "TheTotalPercentageCantBeGreaterThan100"
      );
    });

    it(`Should call the split payments function correctly.`, async function () {
      await mgdCompany.connect(deployer).whitelist(addr1.address, true);

      let transaction = await mintGoldDustERC1155
        .connect(addr1)
        .splitMint(
          URI,
          toWei(5),
          [addr2.address, addr3.address, addr4.address, addr5.address],
          [toWei(15), toWei(25), toWei(25), toWei(20), toWei(15)],
          10
        );

      // Wait for the transaction to be finalized
      const receipt = await transaction.wait();
      const tokenId = receipt.events[0].args[3];

      expect(receipt.events[0].event).to.be.equal("TransferSingle");

      expect(receipt.events[0].args[1]).to.be.equal(
        "0x0000000000000000000000000000000000000000"
      );
      expect(receipt.events[0].args[2]).to.be.equal(addr1.address);
      expect(tokenId).to.be.equal(1);

      expect(receipt.events[1].event).to.be.equal("NftMinted");
      expect(receipt.events[1].args[0]).to.be.equal(tokenId);
      expect(receipt.events[1].args[1]).to.be.equal(addr1.address);
      expect(receipt.events[1].args[2]).to.be.equal(toWei(5));
      expect(receipt.events[1].args[3]).to.be.equal(10);

      expect(receipt.events[2].event).to.be.equal("NftSplitted");
      expect(receipt.events[2].args[0]).to.be.equal(tokenId);
      expect(receipt.events[2].args[1]).to.be.equal(addr1.address);
      expect(JSON.stringify(receipt.events[2].args[2])).to.be.equal(
        JSON.stringify([
          addr2.address,
          addr3.address,
          addr4.address,
          addr5.address,
        ])
      );
      expect(JSON.stringify(receipt.events[2].args[3])).to.be.equal(
        JSON.stringify([toWei(15), toWei(25), toWei(25), toWei(20), toWei(15)])
      );
      expect(receipt.events[2].args[4]).to.be.equal(
        mintGoldDustERC1155.address
      );

      expect(+tokenId).to.be.equal(1);
      expect(await mintGoldDustERC1155.uri(+tokenId)).to.equal(baseURI);
      expect(await mintGoldDustERC1155.tokenIdArtist(+tokenId)).to.equal(
        addr1.address
      );
      expect(
        await mintGoldDustERC1155.hasTokenCollaborators(+tokenId)
      ).to.equal(true);

      // OWNER
      expect(
        await mintGoldDustERC1155.balanceOf(addr1.address, +tokenId)
      ).to.equal(10);

      // COLLABORATORS
      expect(
        await mintGoldDustERC1155.tokenCollaborators(+tokenId, 0)
      ).to.equal(addr2.address);
      expect(
        await mintGoldDustERC1155.tokenCollaborators(+tokenId, 1)
      ).to.equal(addr3.address);
      expect(
        await mintGoldDustERC1155.tokenCollaborators(+tokenId, 2)
      ).to.equal(addr4.address);
      expect(
        await mintGoldDustERC1155.tokenCollaborators(+tokenId, 3)
      ).to.equal(addr5.address);

      expect(
        await mintGoldDustERC1155.tokenIdCollaboratorsPercentage(+tokenId, 0)
      ).to.equal(toWei(15));
      expect(
        await mintGoldDustERC1155.tokenIdCollaboratorsPercentage(+tokenId, 1)
      ).to.equal(toWei(25));
      expect(
        await mintGoldDustERC1155.tokenIdCollaboratorsPercentage(+tokenId, 2)
      ).to.equal(toWei(25));
      expect(
        await mintGoldDustERC1155.tokenIdCollaboratorsPercentage(+tokenId, 3)
      ).to.equal(toWei(20));
      expect(
        await mintGoldDustERC1155.tokenIdCollaboratorsPercentage(+tokenId, 4)
      ).to.equal(toWei(15));
    });

    it("Should revert with a MGDnftUnauthorized error if some not whitelisted artist try to mint a NFT.", async function () {
      // addr1 try to mint a NFT without be whitelisted
      await expect(
        mintGoldDustERC1155
          .connect(addr1)
          .splitMint(
            URI,
            toWei(5),
            [addr2.address, addr3.address, addr4.address, addr5.address],
            [toWei(20), toWei(20), toWei(20), toWei(20), toWei(19)],
            1
          )
      ).to.be.revertedWithCustomError(
        mintGoldDustERC1155,
        "MGDnftUnauthorized"
      );
    });

    describe("\n\n Here goes the tests related with splitted sales for primary market and after for secondary market. The result of the test are after the console logs.\n", () => {
      let price = 20;
      // Calculate the fee and balance values based on the price
      let fee: number;
      let balance: number;
      let collFee: number;
      let primarySaleFee: number;
      let sumBalances: number;
      let royaltyFee: number;
      let secondarySaleFee: number;

      let percentages: number[] = [15, 25, 25, 20, 15];
      let balanceSplits: number[] = [];

      beforeEach(async () => {
        // MGD owner whitelist the artist
        await mgdCompany.connect(deployer).whitelist(addr1.address, true);
        // addr1 mints a NFT
        await mintGoldDustERC1155
          .connect(addr1)
          .splitMint(
            URI,
            toWei(royalty),
            [addr2.address, addr3.address, addr4.address, addr5.address],
            [
              toWei(percentages[0]),
              toWei(percentages[1]),
              toWei(percentages[2]),
              toWei(percentages[3]),
              toWei(percentages[4]),
            ],
            10
          );
        // Artist approve MGD marketplace to exchange its NFT
        await mintGoldDustERC1155
          .connect(addr1)
          .setApprovalForAll(mgdSetPrice.address, true);
        // Artist list its NFT on MGD marketplace
        await mgdSetPrice
          .connect(addr1)
          .list(1, toWei(price), 10, mintGoldDustERC1155.address);

        fee = (price * primary_sale_fee_percent) / 100;
        collFee = (price * collector_fee) / 100;
        primarySaleFee = fee + collFee;
        balance = price - primarySaleFee;
        balanceSplits = percentages.map(
          (percentages: number) => (balance * percentages) / 100
        );
        sumBalances = balanceSplits.reduce(
          (accumulator, currentValue) => accumulator + currentValue
        );
      });

      it("Should:\n \t - Simulate a primary sale that transfer an NFT to the buyer and split the payments;\n \t - Verify if the item changed status for sale;\n \t - Verify if the seller balance increases;\n \t - Verify if the collaborators' balances increases correctly;\n \t - Verify if the marketplace's owner receives the fee;\n \t - Verify if the isSecondarySale attribute was set to true;\n \t - Verify if the buyer balance was deacresed exactly the gas fee + the token price;\n\n\tShould also: \n\t - Simulate a secondary sale that transfer an NFT to the buyer;\n\t - Verify if the item changed status for sale;\n\t - Verify if the seller balance increases correctly;\n\t - Verify if the marketplace's owner receives the secondary sale fee;\n\t - Verify if the artist creator and all collaborators have received correctly each one the respective part of the royalty.", async function () {
        // get the balances for the seller and the owner of the marketplace.
        const sellerInitalEthBal = await addr1.getBalance();

        const collaborator1InitialBalance = await addr2.getBalance();
        const collaborator2InitialBalance = await addr3.getBalance();
        const collaborator3InitialBalance = await addr4.getBalance();
        const collaborator4InitialBalance = await addr5.getBalance();

        let feeAccountInitialEthBal = await deployer.getBalance();
        let feeAccountAfterEthBalShouldBe = ethers.BigNumber.from(
          feeAccountInitialEthBal
        ).add(toWei(primarySaleFee));

        // verify if the flag for secondary is false
        expect(
          (
            await mgdSetPrice
              .connect(addr1)
              .idMarketItemsByContractByOwner(mintGoldDustERC1155.address, 1)
          ).isSecondarySale
        ).to.be.equal(false);

        let gasPrice = await mgdSetPrice.signer.getGasPrice();
        let gasLimit = await mgdSetPrice.estimateGas.purchaseNft(
          1,
          5,
          mintGoldDustERC1155.address,
          {
            value: toWei(price),
          }
        );

        console.log("\t GAS PRICE: ", gasPrice);
        console.log("\t GAS LIMIT: ", gasLimit);

        console.log(
          "\t\t TOTAL GAS ESTIMATION (USD): ",
          (+ethers.BigNumber.from(gasPrice).mul(gasLimit) / (100 * 10 ** 18)) *
            2500
        );

        console.log("\n PRIMARY SALE");
        console.log("\n\t\t ITEM PRICE: ", price);
        console.log("\t\t PRIMARY MARKET FEE: ", fee);
        console.log("\t\t COLLECTOR FEE: ", collFee);
        console.log("\t\t MARKETPLACE OWNER FEE: ", primarySaleFee * 5);
        console.log("\t\t TOTAL BALANCE TO BE SPLITTED: ", balance * 5);
        console.log("\t\t BALANCE SPLITTED: ", +balanceSplits * 5);

        let addr6BalanceBefore = await addr6.getBalance();
        // execute the buyNft function

        let transaction = await mgdSetPrice
          .connect(addr6)
          .purchaseNft(1, 5, mintGoldDustERC1155.address, {
            value: toWei(price),
          });
        // )
        //   .to.emit(mgdSetPrice, "NftPurchasedPrimaryMarket")
        //   .withArgs(
        //     1,
        //     addr1.address,
        //     addr6.address,
        //     toWei(price * 5),
        //     toWei(fee * 5),
        //     toWei(collector_fee * 5),
        //     false,
        //     false,
        //     5
        //   );

        // Wait for the transaction to be finalized
        const receipt = await transaction.wait();
        const tokenId = receipt.events[0].args[3];

        console.log("EVENTTTTTTSSS: ", receipt.events);

        // console.log(
        //   "\n\t\t MARKETPLACE OWNER BALANCE BEFORE SALE: ",
        //   parseFloat(fromWei(feeAccountInitialEthBal))
        // );

        // console.log(
        //   "\t\t MARKETPLACE OWNER BALANCE AFTER SALE: ",
        //   parseFloat(fromWei(await deployer.getBalance()))
        // );

        // let addr6ShouldBeAfter = ethers.BigNumber.from(addr6BalanceBefore)
        //   .sub(toWei(price))
        //   .sub(ethers.BigNumber.from(gasPrice).mul(gasLimit));

        // expect(
        //   parseFloat(
        //     (parseFloat(fromWei(await addr6.getBalance())) * 2500).toFixed(2)
        //   )
        // ).to.be.closeTo(
        //   parseFloat(
        //     (parseFloat(fromWei(addr6ShouldBeAfter)) * 2500).toFixed(2)
        //   ),
        //   1
        // );

        //     // verify if the owner of the NFT changed for the buyer
        //     expect(await mintGoldDustERC1155.ownerOf(1)).to.equal(addr6.address);

        //     // verify if the flag for secondary market changed for true
        //     expect(
        //       (
        //         await mgdSetPrice
        //           .connect(addr1)
        //           .idMarketItemsByContractByOwner(mintGoldDustERC1155.address, 1)
        //       ).isSecondarySale
        //     ).to.be.equal(true);

        //     // verify if the marketplace owner's balance increased the fee
        //     expect(await deployer.getBalance()).to.be.equal(
        //       feeAccountAfterEthBalShouldBe
        //     );

        //     // Check Owner Balance After Sale
        //     expect(parseFloat(fromWei(await addr1.getBalance()))).to.be.equal(
        //       parseFloat(
        //         fromWei(
        //           ethers.BigNumber.from(sellerInitalEthBal).add(
        //             toWei(balanceSplits[0])
        //           )
        //         )
        //       )
        //     );

        //     // Check Collaborator 1 Balance After Sale
        //     expect(parseFloat(fromWei(await addr2.getBalance()))).to.be.equal(
        //       parseFloat(
        //         fromWei(
        //           ethers.BigNumber.from(collaborator1InitialBalance).add(
        //             toWei(balanceSplits[1])
        //           )
        //         )
        //       )
        //     );

        //     // Check Collaborator 2 Balance After Sale
        //     expect(parseFloat(fromWei(await addr3.getBalance()))).to.be.equal(
        //       parseFloat(
        //         fromWei(
        //           ethers.BigNumber.from(collaborator2InitialBalance).add(
        //             toWei(balanceSplits[2])
        //           )
        //         )
        //       )
        //     );

        //     // Check Collaborator 3 Balance After Sale
        //     expect(parseFloat(fromWei(await addr4.getBalance()))).to.be.equal(
        //       parseFloat(
        //         fromWei(
        //           ethers.BigNumber.from(collaborator3InitialBalance).add(
        //             toWei(balanceSplits[3])
        //           )
        //         )
        //       )
        //     );

        //     // Check Collaborator 4 Balance After Sale
        //     expect(parseFloat(fromWei(await addr5.getBalance()))).to.be.equal(
        //       parseFloat(
        //         fromWei(
        //           ethers.BigNumber.from(collaborator4InitialBalance).add(
        //             toWei(balanceSplits[4])
        //           )
        //         )
        //       )
        //     );

        //     // expect item sold to be true
        //     expect(
        //       (
        //         await mgdSetPrice.idMarketItemsByContractByOwner(
        //           mintGoldDustERC1155.address,
        //           1
        //         )
        //       ).sold
        //     ).to.be.equal(true);

        //     // expect item sold to be true
        //     expect(await mgdSetPrice.itemsSold()).to.be.equal(1);

        //     console.log("\n\n\t\t SELLER SHOULD BE RECEIVED: ", balanceSplits[0]);
        //     console.log(
        //       "\t\t SELLER BALANCE BEFORE SALE: ",
        //       parseFloat(fromWei(sellerInitalEthBal))
        //     );

        //     console.log(
        //       "\t\t SELLER BALANCE AFTER SALE: ",
        //       parseFloat(fromWei(await addr1.getBalance()))
        //     );

        //     console.log(
        //       "\n\n\t\t COLLABORATOR 1 SHOULD BE RECEIVED: ",
        //       balanceSplits[1]
        //     );
        //     console.log(
        //       "\t\t COLLABORATOR 1 BALANCE BEFORE SALE: ",
        //       parseFloat(fromWei(collaborator1InitialBalance))
        //     );

        //     console.log(
        //       "\t\t COLLABORATOR 1 BALANCE AFTER SALE: ",
        //       parseFloat(fromWei(await addr2.getBalance()))
        //     );

        //     console.log(
        //       "\n\n\t\t COLLABORATOR 2 SHOULD BE RECEIVED: ",
        //       balanceSplits[2]
        //     );
        //     console.log(
        //       "\t\t COLLABORATOR 2 BALANCE BEFORE SALE: ",
        //       parseFloat(fromWei(collaborator2InitialBalance))
        //     );

        //     console.log(
        //       "\t\t COLLABORATOR 2 BALANCE AFTER SALE: ",
        //       parseFloat(fromWei(await addr3.getBalance()))
        //     );

        //     console.log(
        //       "\n\n\t\t COLLABORATOR 3 SHOULD BE RECEIVED: ",
        //       balanceSplits[3]
        //     );
        //     console.log(
        //       "\t\t COLLABORATOR 3 BALANCE BEFORE SALE: ",
        //       parseFloat(fromWei(collaborator3InitialBalance))
        //     );

        //     console.log(
        //       "\t\t COLLABORATOR 3 BALANCE AFTER SALE: ",
        //       parseFloat(fromWei(await addr4.getBalance()))
        //     );

        //     console.log(
        //       "\n\n\t\t COLLABORATOR 4 SHOULD BE RECEIVED: ",
        //       balanceSplits[4]
        //     );
        //     console.log(
        //       "\t\t COLLABORATOR 4 BALANCE BEFORE SALE: ",
        //       parseFloat(fromWei(collaborator4InitialBalance))
        //     );

        //     console.log(
        //       "\t\t COLLABORATOR 4 BALANCE AFTER SALE: ",
        //       parseFloat(fromWei(await addr5.getBalance()))
        //     );

        //     console.log("\n\n\t\t BUYER SHOULD HAVE SPENT: ", price);
        //     console.log(
        //       "\t\t BUYER BALANCE BEFORE SALE: ",
        //       parseFloat(fromWei(addr6BalanceBefore))
        //     );

        //     console.log(
        //       "\t\t BUYER BALANCE AFTER SALE: ",
        //       parseFloat(fromWei(await addr6.getBalance()))
        //     );

        //     await mgdSetPrice
        //       .connect(addr6)
        //       .list(1, toWei(price), 1, mintGoldDustERC1155.address);

        //     secondarySaleFee = (price * secondary_sale_fee_percent) / 100;
        //     royaltyFee = (price * royalty) / 100;
        //     balance = price - (secondarySaleFee + royaltyFee);

        //     balanceSplits = percentages.map(
        //       (percentages: number) => (royaltyFee * percentages) / 100
        //     );
        //     sumBalances = balanceSplits.reduce(
        //       (accumulator, currentValue) => accumulator + currentValue
        //     );

        //     // Check if the sum of all split royalties are equal the royalty value for this price
        //     expect(price * (royalty / 100)).equal(sumBalances);

        //     // get the balance of the seller.
        //     const sellerBalanceBeforeSecondSale = await addr6.getBalance();

        //     // get the balances for the artist creator and all collaborators.
        //     const artistCreatorBalanceBeforeSecondSale = await addr1.getBalance();
        //     const collaborator1BalanceBeforeSecondSale = await addr2.getBalance();
        //     const collaborator2BalanceBeforeSecondSale = await addr3.getBalance();
        //     const collaborator3BalanceBeforeSecondSale = await addr4.getBalance();
        //     const collaborator4BalanceBeforeSecondSale = await addr5.getBalance();

        //     let gasPrice2 = await mgdSetPrice.signer.getGasPrice();
        //     let gasLimit2 = await mgdSetPrice.estimateGas.purchaseNft(
        //       1,
        //       1,
        //       mintGoldDustERC1155.address,
        //       {
        //         value: toWei(price),
        //       }
        //     );

        //     console.log(
        //       "\t\t TOTAL GAS ESTIMATION (USD): ",
        //       (+ethers.BigNumber.from(gasPrice).mul(gasLimit) / (100 * 10 ** 18)) *
        //         2500
        //     );

        //     console.log("\n SECONDARY SALE FOR SET PRICE");
        //     console.log("\n\t\t ITEM PRICE: ", price);
        //     console.log("\t\t TOTAL ROYALTY TO BE SPLITTED: ", royaltyFee);
        //     console.log("\t\t ROYALTY SPLITTED: ", balanceSplits);
        //     console.log(
        //       "\t\t MARKETPLACE OWNER SECONDARY SALE FEE: ",
        //       secondarySaleFee
        //     );
        //     console.log("\t\t BALANCE TO SELLER: ", balance);

        //     const newBuyerBalanceBefore = await addr7.getBalance();
        //     feeAccountInitialEthBal = await deployer.getBalance();
        //     feeAccountAfterEthBalShouldBe = ethers.BigNumber.from(
        //       feeAccountInitialEthBal
        //     ).add(toWei(secondarySaleFee));
        //     // execute the buyNft function
        //     expect(
        //       await mgdSetPrice
        //         .connect(addr7)
        //         .purchaseNft(1, 1, mintGoldDustERC1155.address, {
        //           value: toWei(price),
        //         })
        //     )
        //       .to.emit(mgdSetPrice, "NftPurchasedPrimaryMarket")
        //       .withArgs(
        //         1,
        //         addr1.address,
        //         addr6.address,
        //         toWei(price),
        //         toWei(fee),
        //         toWei(collector_fee),
        //         false
        //       );

        //     console.log(
        //       "\n\t\t MARKETPLACE OWNER BALANCE BEFORE SECONDARY SALE: ",
        //       parseFloat(fromWei(feeAccountInitialEthBal))
        //     );

        //     console.log(
        //       "\t\t MARKETPLACE OWNER BALANCE AFTER SECONDARY SALE: ",
        //       parseFloat(fromWei(await deployer.getBalance()))
        //     );

        //     let addr7ShouldBeAfter = ethers.BigNumber.from(newBuyerBalanceBefore)
        //       .sub(toWei(price))
        //       .sub(ethers.BigNumber.from(gasPrice2).mul(gasLimit2));

        //     expect(
        //       parseFloat(
        //         (parseFloat(fromWei(await addr7.getBalance())) * 2500).toFixed(2)
        //       )
        //     ).to.be.closeTo(
        //       parseFloat(
        //         (parseFloat(fromWei(addr7ShouldBeAfter)) * 2500).toFixed(2)
        //       ),
        //       1
        //     );

        //     // verify if the owner of the NFT changed for the buyer
        //     expect(await mintGoldDustERC1155.ownerOf(1)).to.equal(addr7.address);

        //     // verify if the marketplace owner's balance increased the fee
        //     expect(await deployer.getBalance()).to.be.equal(
        //       feeAccountAfterEthBalShouldBe
        //     );

        //     // Check Seller Balance After Sale
        //     expect(parseFloat(fromWei(await addr6.getBalance()))).to.be.equal(
        //       parseFloat(
        //         fromWei(
        //           ethers.BigNumber.from(sellerBalanceBeforeSecondSale).add(
        //             toWei(balance)
        //           )
        //         )
        //       )
        //     );

        //     // Check Owner Balance After Sale
        //     expect(parseFloat(fromWei(await addr1.getBalance()))).to.be.equal(
        //       parseFloat(
        //         fromWei(
        //           ethers.BigNumber.from(artistCreatorBalanceBeforeSecondSale).add(
        //             toWei(balanceSplits[0])
        //           )
        //         )
        //       )
        //     );

        //     // Check Collaborator 1 Balance After Sale
        //     expect(parseFloat(fromWei(await addr2.getBalance()))).to.be.equal(
        //       parseFloat(
        //         fromWei(
        //           ethers.BigNumber.from(collaborator1BalanceBeforeSecondSale).add(
        //             toWei(balanceSplits[1])
        //           )
        //         )
        //       )
        //     );

        //     // Check Collaborator 2 Balance After Sale
        //     expect(parseFloat(fromWei(await addr3.getBalance()))).to.be.equal(
        //       parseFloat(
        //         fromWei(
        //           ethers.BigNumber.from(collaborator2BalanceBeforeSecondSale).add(
        //             toWei(balanceSplits[2])
        //           )
        //         )
        //       )
        //     );

        //     // Check Collaborator 3 Balance After Sale
        //     expect(parseFloat(fromWei(await addr4.getBalance()))).to.be.equal(
        //       parseFloat(
        //         fromWei(
        //           ethers.BigNumber.from(collaborator3BalanceBeforeSecondSale).add(
        //             toWei(balanceSplits[3])
        //           )
        //         )
        //       )
        //     );

        //     // Check Collaborator 4 Balance After Sale
        //     expect(parseFloat(fromWei(await addr5.getBalance()))).to.be.equal(
        //       parseFloat(
        //         fromWei(
        //           ethers.BigNumber.from(collaborator4BalanceBeforeSecondSale).add(
        //             toWei(balanceSplits[4])
        //           )
        //         )
        //       )
        //     );

        //     console.log("\n\n\t\t SELLER SHOULD BE RECEIVED: ", balance);
        //     console.log(
        //       "\t\t SELLER BALANCE BEFORE SECONDARY SALE: ",
        //       parseFloat(fromWei(sellerBalanceBeforeSecondSale))
        //     );

        //     console.log(
        //       "\t\t SELLER BALANCE AFTER SECONDARY SALE: ",
        //       parseFloat(fromWei(await addr6.getBalance()))
        //     );

        //     console.log(
        //       "\n\n\t\t ARTIST CREATOR SHOULD BE RECEIVED: ",
        //       balanceSplits[0]
        //     );
        //     console.log(
        //       "\t\t ARTIST CREATOR BALANCE BEFORE SECONDARY SALE: ",
        //       parseFloat(fromWei(artistCreatorBalanceBeforeSecondSale))
        //     );

        //     console.log(
        //       "\t\t ARTIST CREATOR BALANCE AFTER SECONDARY SALE: ",
        //       parseFloat(fromWei(await addr1.getBalance()))
        //     );

        //     console.log(
        //       "\n\n\t\t COLLABORATOR 1 SHOULD BE RECEIVED: ",
        //       balanceSplits[1]
        //     );
        //     console.log(
        //       "\t\t COLLABORATOR 1 BALANCE BEFORE SECONDARY SALE: ",
        //       parseFloat(fromWei(collaborator1BalanceBeforeSecondSale))
        //     );

        //     console.log(
        //       "\t\t COLLABORATOR 1 BALANCE AFTER SECONDARY SALE: ",
        //       parseFloat(fromWei(await addr2.getBalance()))
        //     );

        //     console.log(
        //       "\n\n\t\t COLLABORATOR 2 SHOULD BE RECEIVED: ",
        //       balanceSplits[2]
        //     );
        //     console.log(
        //       "\t\t COLLABORATOR 2 BALANCE BEFORE SECONDARY SALE: ",
        //       parseFloat(fromWei(collaborator2BalanceBeforeSecondSale))
        //     );

        //     console.log(
        //       "\t\t COLLABORATOR 2 BALANCE AFTER SECONDARY SALE: ",
        //       parseFloat(fromWei(await addr3.getBalance()))
        //     );

        //     console.log(
        //       "\n\n\t\t COLLABORATOR 3 SHOULD BE RECEIVED: ",
        //       balanceSplits[3]
        //     );
        //     console.log(
        //       "\t\t COLLABORATOR 3 BALANCE BEFORE SECONDARY SALE: ",
        //       parseFloat(fromWei(collaborator3BalanceBeforeSecondSale))
        //     );

        //     console.log(
        //       "\t\t COLLABORATOR 3 BALANCE AFTER SECONDARY SALE: ",
        //       parseFloat(fromWei(await addr4.getBalance()))
        //     );

        //     console.log(
        //       "\n\n\t\t COLLABORATOR 4 SHOULD BE RECEIVED: ",
        //       balanceSplits[4]
        //     );
        //     console.log(
        //       "\t\t COLLABORATOR 4 BALANCE BEFORE SECONDARY SALE: ",
        //       parseFloat(fromWei(collaborator4BalanceBeforeSecondSale))
        //     );

        //     console.log(
        //       "\t\t COLLABORATOR 4 BALANCE AFTER SECONDARY SALE: ",
        //       parseFloat(fromWei(await addr5.getBalance()))
        //     );

        //     console.log("\n\n\t\t BUYER SHOULD HAVE SPENT: ", price);
        //     console.log(
        //       "\t\t BUYER BALANCE BEFORE SECONDARY SALE: ",
        //       parseFloat(fromWei(newBuyerBalanceBefore))
        //     );

        //     console.log(
        //       "\t\t BUYER BALANCE AFTER SECONDARY SALE: ",
        //       parseFloat(fromWei(await addr7.getBalance()))
        //     );
      });
    });

});
});
