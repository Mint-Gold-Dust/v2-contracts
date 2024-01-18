import { ethers } from "ethers";

async function generateWallet(
  passedProvider?: ethers.providers.JsonRpcProvider
) {
  // Generate a new random private key
  const privateKey = ethers.Wallet.createRandom().privateKey;

  let provider;
  if (!provider) {
    provider = new ethers.providers.JsonRpcProvider("http://localhost:8545");
  } else {
    provider = passedProvider;
  }

  const wallet = new ethers.Wallet(privateKey, provider);
  return wallet;
}

export default generateWallet;
