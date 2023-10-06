require("dotenv").config();

module.exports = {
  networks: {
    development: {
      host: "127.0.0.1",
      port: 7545,
      network_id: "*", // match any network
    },
    hardhat: {
      host: "127.0.0.1",
      port: 8545,
      network_id: "31337",
    },
    sepolia: {
      provider: () =>
        new HDWalletProvider(
          process.env.PK,
          `https://sepolia.infura.io/v3/${process.env.INFURA_API_KEY}`
        ),
      network_id: 11155111,
      gasPrice: 20000000000,
    },
    goerli: {
      provider: () =>
        new HDWalletProvider(
          process.env.PK,
          `https://goerli.infura.io/v3/${process.env.INFURA_API_KEY}`
        ),
      network_id: 5,
    },
    mainnet: {
      provider: () =>
        new HDWalletProvider(
          process.env.PK,
          `https://mainnet.infura.io/v3/${process.env.INFURA_API_KEY}`
        ),
      network_id: 1,
    },
  },
  contracts_directory: "./contracts/marketplace/",
  contracts_build_directory: "./artifacts",
  test_directory: "./test/",
  compilers: {
    solc: {
      version: "0.8.18",
      settings: {
        optimizer: {
          enabled: true,
          runs: 200,
        },
        evmVersion: "london",
      },
    },
  },
  mocha: {
    enableTimeouts: false,
    before_timeout: 40000,
  },
};
