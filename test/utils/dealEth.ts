import { ethers, network } from "hardhat";

async function dealEth(address: string, amountInEth: number) {
  const amount = ethers.utils.parseEther(amountInEth.toString()).toHexString();
  const params = [address, amount];
  await network.provider.send("hardhat_setBalance", params);
}

export default dealEth;
