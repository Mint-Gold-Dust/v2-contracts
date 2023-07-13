import { BigNumber, ethers } from "ethers";

async function gasEstimator(tx: ethers.providers.TransactionResponse, functionName: string) {

  const receipt = await tx.wait();

  console.log(`\n________________________________ GAS ESTIMATE FOR THE ${functionName.toUpperCase()} ________________________________\n`);

  console.log(`\t ACTUAL GAS USED: ${receipt.gasUsed.toString()}`);

  const gasUsed = receipt.gasUsed;
  const gasPrice = tx.gasPrice as BigNumber;
  const gasCost = gasUsed.mul(gasPrice);

  console.log(`\t GAS COST: ${ethers.utils.formatEther(gasCost)} ETH \n`);
}

export { gasEstimator };