/**
 * @dev This one show if you need to create some transaction data to be executed in Gnosis Safe UI
 * @example just uncoment the code spcify the contract and the function you wanna call
 *          and run `npx hardhat run scripts/generateTransaction.ts --network desiredNetwork`
 */

const { utils } = require("ethers");

// ABI for the setPublicKey function
const abi = ["function setPublicKey(address)"];

// Create an interface for the ABI
const iface = new utils.Interface(abi);

// Address of the new public key you want to set
const newPublicKeyAddress = "0x..."; // Replace with the actual address

// ABI-encode the function call
const data = iface.encodeFunctionData("setPublicKey", [
  "0x00694046e4bd965444f4c64b0be3b4ab620f1755",
]);

console.log(data); // This will output the hex-encoded data for the function call
