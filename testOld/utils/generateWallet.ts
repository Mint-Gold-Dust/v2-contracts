import { ethers } from "ethers";

async function generateWallet() {
  // Generate a new random private key
  const privateKey = ethers.Wallet.createRandom().privateKey;

  const provider = new ethers.providers.JsonRpcProvider(
    "http://localhost:8545"
  );

  const wallet = new ethers.Wallet(privateKey, provider);
  return wallet;
}

export default generateWallet;
