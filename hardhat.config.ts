require("dotenv").config();
import "@nomicfoundation/hardhat-chai-matchers";
import "@nomiclabs/hardhat-ethers";
import "@nomicfoundation/hardhat-verify";
import "@openzeppelin/hardhat-upgrades";
import { HardhatUserConfig } from "hardhat/config";
import "solidity-coverage";
// import "hardhat-gas-reporter";

const config: HardhatUserConfig = {
  defaultNetwork: "hardhat",
  networks: {
    develop: {
      url: "http://127.0.0.1:8545/",
    },
    hardhat: {
      forking: {
        url: "https://eth-mainnet.g.alchemy.com/v2/bhwVbe04yQYbezp6JIFOlQAZmBbiSJAq",
        // blockNumber: 19029795 // Only for testing `test/upgrade/RefactorPrimarySaleStorage.ts`
      },
    },
    sepolia: {
      url: `https://sepolia.infura.io/v3/${process.env.INFURA_API_KEY}`,
      accounts: [`${process.env.PK}`],
      gasPrice: 20000000000, // Optional: specify gas price in wei (this is just an example value)
      chainId: 11155111, // Optional: specify the chainId for sepolia
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
      chainId: 1, // Optional: specify the chainId for mainnet
    },
    base: {
      url: `https://mainnet.base.org`,
      accounts: [`${process.env.PK}`],
      chainId: 8453, // Optional: specify the chainId for base
    },
    baseSepolia: {
      url: `https://sepolia.base.org`,
      accounts: [`${process.env.PK}`],
      gasPrice: 20000000000, // Optional: specify gas price in wei (this is just an example value)
      chainId: 84532, // Optional: specify the chainId for base-sepolia
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
      outputSelection: {
        "*": {
          "*": ["storageLayout"],
        },
      },
    },
  },
  paths: {
    sources: "./contracts/marketplace/",
    tests: "./test/",
    cache: "./cache",
    artifacts: "./artifacts",
  },
  mocha: {
    timeout: 200000,
  },
  etherscan: {
    // Define Your API key for Etherscan on .env
    // Obtain one at https://etherscan.io/
    apiKey: `${process.env.ETHERSCAN_KEY}`,
    customChains: [
      {
        network: "baseSepolia",
        chainId: 84532,
        urls: {
          apiURL: "https://api-sepolia.basescan.org/api",
          browserURL: "https://sepolia.basescan.org/",
        },
      },
    ],
  },
};

export default config;
