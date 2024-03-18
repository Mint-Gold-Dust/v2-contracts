import { ethers } from "hardhat";

export async function setTimestampNextBlock(timestamp: number) {
  await ethers.provider.send("evm_setNextBlockTimestamp", [timestamp]);
  await ethers.provider.send("evm_mine", []);
}

export default setTimestampNextBlock;
