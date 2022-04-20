import "@nomiclabs/hardhat-web3";
import "@nomiclabs/hardhat-ethers";
import { task } from 'hardhat/config';
import { Contract, ContractFactory } from "ethers";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";

task("withdraw", "Transfers the `amount` of tokens from that contract to `msg.sender`")
    .addParam("contractAddress", "The address of the dao contract")
    .addParam("amount", "Tokens to withdraw")
    .setAction(async function (taskArgs, hre) {
        const VotingDao: ContractFactory = await hre.ethers.getContractFactory("VotingDao");
        const dao: Contract = await VotingDao.attach(taskArgs.contractAddress);
        const accounts: SignerWithAddress[] = await hre.ethers.getSigners();

        const withdrawTx: any = await dao.withdraw(taskArgs.amount);
        const withdrawTxReceipt: any = await withdrawTx.wait();

        console.log(
            "Successfully transfered %d tokens from %s to %s",
            taskArgs.amount, dao.address, await accounts[0].getAddress()
        );
        console.log("Gas used: %d", withdrawTxReceipt.gasUsed.toNumber() * withdrawTxReceipt.effectiveGasPrice.toNumber());
    });
