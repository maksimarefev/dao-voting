import "@nomiclabs/hardhat-web3";
import "@nomiclabs/hardhat-ethers";
import { task } from 'hardhat/config';
import { Contract, ContractFactory } from "ethers";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";

task("deposit", "Transfers the `amount` of tokens from `msg.sender` to that contract")
    .addParam("contractAddress", "The address of the dao contract")
    .addParam("amount", "Tokens to transfer")
    .setAction(async function (taskArgs, hre) {
        const VotingDao: ContractFactory = await hre.ethers.getContractFactory("VotingDao");
        const dao: Contract = await VotingDao.attach(taskArgs.contractAddress);
        const accounts: SignerWithAddress[] = await hre.ethers.getSigners();

        const depositTx: any = await dao.deposit(taskArgs.amount);
        const depositTxReceipt: any = await depositTx.wait();

        console.log(
            "Successfully transfered %d tokens from %s to %s",
            taskArgs.amount, await accounts[0].getAddress(), dao.address
        );
        console.log("Gas used: %d", depositTxReceipt.gasUsed.toNumber() * depositTxReceipt.effectiveGasPrice.toNumber());
    });
