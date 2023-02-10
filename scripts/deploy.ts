import { artifacts, ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();

  console.log("Deploying contracts with the account:", deployer.address);
  console.log("Account balance:", (await deployer.getBalance()).toString());

  // Get the ContractFactories and Signers here.
  const GDNFT = await ethers.getContractFactory("GDNFT");
  const MGD = await ethers.getContractFactory("MGD");
  // deploy contracts
  const mgd = await MGD.deploy(1);
  const gdnft = await GDNFT.deploy();
  // Save copies of each contracts abi and address to the frontend.
  //saveFrontendFiles(mgd, "MGD");
  //saveFrontendFiles(gdnft, "GDNFT");
}

// function saveFrontendFiles(contract: any, name: string) {
//   const fs = require("fs");
//   const contractsDir = __dirname + "/../../frontend/contractsData";

//   if (!fs.existsSync(contractsDir)) {
//     fs.mkdirSync(contractsDir);
//   }

//   fs.writeFileSync(
//     contractsDir + `/${name}-address.json`,
//     JSON.stringify({ address: contract.address }, undefined, 2)
//   );

//   const contractArtifact = artifacts.readArtifactSync(name);

//   fs.writeFileSync(
//     contractsDir + `/${name}.json`,
//     JSON.stringify(contractArtifact, null, 2)
//   );
// }

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
