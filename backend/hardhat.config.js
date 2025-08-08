require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();


/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: "0.8.28",
  paths: {
        sources: "./contracts",
        tests: "./test",
        cache: "./cache",
        artifacts: "./artifacts"
    },
     networks: {
        hardhat: {
            chainId: 1337,
            blockGasLimit: 10000000,
            allowUnlimitedContractSize: true
        },
        sepolia: {
            url: process.env.RPC_URL || "",
            accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
            chainId: 11155111,
            gasPrice: 20000000000,
            blockGasLimit: 10000000
        },
        localhost: {
            url: "http://127.0.0.1:8545"
        }, basecamp: {
            url: "https://rpc-campnetwork.xyz",
            accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
            chainId: 123420001114,
            gasPrice: 20000,
            blockGasLimit: 1000
        }

    },
     etherscan: {
        apiKey: {
            sepolia: process.env.ETHERSCAN_API_KEY || ""
        },
        customChains: [
            {
                network: "sepolia",
                chainId: 11155111,
                urls: {
                    apiURL: "https://api-sepolia.etherscan.io/api",
                    browserURL: "https://sepolia.etherscan.io"
                }
            }
        ]
    }

};
