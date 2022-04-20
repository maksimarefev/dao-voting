import "@nomiclabs/hardhat-web3";
import "@nomiclabs/hardhat-ethers";
import { task } from 'hardhat/config';
import { Contract, ContractFactory } from "ethers";

task("finish", "Finishes the proposal with id `proposalId`")
    .addParam("contractAddress", "The address of the dao contract")
    .addParam("proposalId", "Proposal id")
    .setAction(async function (taskArgs, hre) {
        const VotingDao: ContractFactory = await hre.ethers.getContractFactory("VotingDao");
        const dao: Contract = await VotingDao.attach(taskArgs.contractAddress);

        const finishTx: any = await dao.finish(taskArgs.proposalId);
        const finishTxReceipt: any = await finishTx.wait();

        console.log("Successfully finished the proposal with id %d", taskArgs.proposalId);
        console.log("Gas used: %d", finishTxReceipt.gasUsed.toNumber() * finishTxReceipt.effectiveGasPrice.toNumber());
    });
