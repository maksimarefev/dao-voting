import { ethers } from "hardhat";
import { execSync } from "child_process";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { VotingDao, VotingDao__factory, TestToken, TestToken__factory } from '../typechain-types';

function verify(contractAddress: string, ...constructorParameters: any[]) {
    if (!contractAddress) {
        console.error("No contract address was provided");
        return;
    }

    const constructorParametersAsString: string =
        !constructorParameters || constructorParameters.length == 0 ? "" : constructorParameters.join(" ");

    const command: string = "npx hardhat verify --network rinkeby "  + contractAddress + " " + constructorParametersAsString;
    console.log("Running command:", command);

    try {
        execSync(command, { encoding: "utf-8" });
    } catch (error) {
        //do nothing, it always fails but in fact a contract becomes verified
    }
}

async function main() {
    const accounts: SignerWithAddress[] = await ethers.getSigners();

    if (accounts.length == 0) {
        throw new Error('No accounts were provided');
    }

    const signerAddress: string = await accounts[0].getAddress();

    console.log("Deploying contracts with the account:", accounts[0].address);

    console.log("Deploying ERC20 contract");
    const TestToken: TestToken__factory = (await ethers.getContractFactory("TestToken")) as TestToken__factory;
    const erc20: TestToken = await TestToken.deploy();
    await erc20.deployed();
    console.log("ERC20 contract had been deployed to:", erc20.address);

    const minimumQuorum = 30; //30%
    const debatingPeriodDuration = 3 * 24 * 60 * 60; //3 days
    console.log("Deploying DAO contract");
    const VotingDao: VotingDao__factory = (await ethers.getContractFactory("VotingDao")) as VotingDao__factory;
    const dao: VotingDao = await VotingDao.deploy(signerAddress, erc20.address, minimumQuorum, debatingPeriodDuration);
    await dao.deployed();
    console.log("DAO had been deployed to:", dao.address);

    await erc20.transferOwnership(dao.address);

    console.log("Verifying NFT contract..");
    verify(erc20.address, networkName);
    console.log("NFT contract is verified");

    console.log("Verifying dao contract..");
    verify(dao.address, signerAddress, erc20.address, networkId);
    console.log("DAO contract is verified");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
