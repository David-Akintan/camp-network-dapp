const { ethers } = require("hardhat");
const main = async () => {
    console.log("Deploying contracts...");
    
    // Here you would typically include the logic to deploy your contracts
    // For example, using Hardhat or Truffle to deploy a smart contract
    // This is a placeholder for the actual deployment logic

    const ipContract = await ethers.getContractFactory("IPRegistry");
    const deployedIPContract = await ipContract.deploy();
    // console.log(deployedIPContract);
    console.log(`IPRegistry contract deployed to: ${deployedIPContract.target}`);
    console.log("Contracts deployed successfully!");
};

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
// This script is used to deploy smart contracts to the Ethereum network
// It uses the ethers.js library to interact with the Ethereum blockchain       