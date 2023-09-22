require("dotenv").config();
import "@nomicfoundation/hardhat-chai-matchers";
import "@nomiclabs/hardhat-ethers";
import "@nomiclabs/hardhat-etherscan";
import "@openzeppelin/hardhat-upgrades";
import { HardhatUserConfig } from "hardhat/config";
import "solidity-coverage";
import "hardhat-gas-reporter";

const config: HardhatUserConfig = {
  defaultNetwork: "hardhat",
  networks: {
    hardhat: {},
    sepolia: {
      url: `https://sepolia.infura.io/v3/${process.env.INFURA_API_KEY}`,
      accounts: [`${process.env.PK}`],
      gasPrice: 20000000000, // Optional: specify gas price in wei (this is just an example value)
      chainId: 11155111, // Optional: specify the chainId for sepolia
    },
    goerli: {
      url: `https://goerli.infura.io/v3/${process.env.INFURA_API_KEY}`,
      accounts: [`${process.env.PK}`],
      gasPrice: 20000000000, // Optional: specify gas price in wei (this is just an example value)
      chainId: 5, // Optional: specify the chainId for sepolia
    },
    localhost: {
      url: "http://127.0.0.1:8545",
      accounts: [
        "0xea6c44ac03bff858b476bba40716402b03e41b8e97e276d1baec7c37d42484a0", // Replace with the private key of the chosen pre-funded account
      ],
    },
    mainnet: {
      url: `https://mainnet.infura.io/v3/${process.env.INFURA_API_KEY}`,
      accounts: [`${process.env.PK}`],
      gasPrice: 20000000000, // Optional: specify gas price in wei (this is just an example value)
      chainId: 1, // Optional: specify the chainId for mainnet
    },
  },
  solidity: {
    version: "0.8.18",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
        details: {
          yul: true,
        },
      },
      viaIR: true,
    },
  },
  paths: {
    sources: "./contracts/marketplace/",
    tests: "./test/",
    cache: "./cache",
    artifacts: "./artifacts",
  },
  mocha: {
    timeout: 40000,
  },
};

export default config;
