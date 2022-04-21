import { expect, use } from "chai";
import { ethers, network } from "hardhat";
import { Signer, Contract } from "ethers";
import { FakeContract, smock } from "@defi-wonderland/smock";
import { VotingDao, VotingDao__factory } from "../typechain-types";

import TestToken from "../artifacts/contracts/TestToken.sol/TestToken.json";

use(smock.matchers);

describe("VotingDao", function() {

    const minimumQuorum = 30; //30%
    const debatingPeriodDuration = 3 * 60; //3 minutes

    let bob: Signer;
    let alice: Signer;
    let dao: VotingDao;
    let erc20Mock: FakeContract<Contract>;

    async function deposit(account: Signer, amount: number) {
       const accountAddress: string = await account.getAddress();
       await erc20Mock.balanceOf.whenCalledWith(accountAddress).returns(amount);
       await erc20Mock.allowance.whenCalledWith(accountAddress, dao.address).returns(amount);
       await erc20Mock.transferFrom.whenCalledWith(accountAddress, dao.address, amount).returns(true);
       await dao.connect(account).deposit(amount);
   }

    beforeEach("Deploying contract", async function () {
        [alice, bob] = await ethers.getSigners();

        erc20Mock = await smock.fake(TestToken.abi);

        const VotingDaoFactory: VotingDao__factory = (await ethers.getContractFactory("VotingDao")) as VotingDao__factory;

        dao = await VotingDaoFactory.deploy(
            await alice.getAddress(), erc20Mock.address, minimumQuorum, debatingPeriodDuration
        );
   });

   describe("deposit", async function() {
        it("Should not allow to deposit on insufficient balance", async function() {
            const aliceAddress: string = await alice.getAddress();
            const aliceBalance: number = 0;
            const depositAmount: number = 1;
            await erc20Mock.balanceOf.whenCalledWith(aliceAddress).returns(aliceBalance);

            const depositTxPromise: Promise<any> = dao.deposit(depositAmount);

            await expect(depositTxPromise).to.be.revertedWith("Not enough balance");
        });

        it("Should not allow to deposit on insufficient allowance", async function() {
            const aliceAddress: string = await alice.getAddress();
            const aliceBalance: number = 2;
            const allowance: number = 1;
            const depositAmount: number = 2;
            await erc20Mock.balanceOf.whenCalledWith(aliceAddress).returns(aliceBalance);
            await erc20Mock.allowance.whenCalledWith(aliceAddress, dao.address).returns(allowance);

            const depositTxPromise: Promise<any> = dao.deposit(depositAmount);

            await expect(depositTxPromise).to.be.revertedWith("Not enough allowance");
        });

        it("Should not allow to deposit on failed transfer", async function() {
            const aliceAddress: string = await alice.getAddress();
            const aliceBalance: number = 2;
            const allowance: number = 2;
            const depositAmount: number = 2;
            await erc20Mock.balanceOf.whenCalledWith(aliceAddress).returns(aliceBalance);
            await erc20Mock.allowance.whenCalledWith(aliceAddress, dao.address).returns(allowance);
            await erc20Mock.transferFrom.whenCalledWith(aliceAddress, dao.address, depositAmount).returns(false);

            const depositTxPromise: Promise<any> = dao.deposit(depositAmount);

            await expect(depositTxPromise).to.be.revertedWith("Transfer failed");
        });
   });

   describe("withdraw", async function() {
        it("Should not allow to withdraw if sender is participating in proposals", async function() {
            const depositAmount: number = 2;
            await deposit(alice, depositAmount);
            const withdrawAmount: number = 1;
            const data: Uint8Array = new Uint8Array();
            const description: string = "";
            const proposalId: number = 0;
            const votesFor: boolean = true;
            const targetContractAddress: string = erc20Mock.address;

            await dao.addProposal(data, targetContractAddress, description);
            await dao.vote(proposalId, votesFor);
            const withdrawTxPromise: Promise<any> = dao.withdraw(withdrawAmount);

            await expect(withdrawTxPromise).to.be.revertedWith("There are ongoing proposals");
        });

        it("Should not allow to withdraw the amount greater than the sender holds", async function() {
            const depositAmount: number = 2;
            await deposit(alice, depositAmount);
            const withdrawAmount: number = 3;

            const withdrawTxPromise: Promise<any> = dao.withdraw(withdrawAmount);

            await expect(withdrawTxPromise).to.be.revertedWith("Amount is greater than deposited");
        });

        it("Should not allow for a non-stakeholder to withdraw", async function() {
            const withdrawAmount: number = 3;

            const withdrawTxPromise: Promise<any> = dao.withdraw(withdrawAmount);

            await expect(withdrawTxPromise).to.be.revertedWith("Not a stakeholder");
        });

        it("Should not allow to withdraw on failed transfer", async function() {
            const depositAmount: number = 2;
            await deposit(alice, depositAmount);
            const aliceAddress: string = await alice.getAddress();
            const withdrawAmount: number = 1;
            await erc20Mock.transfer.whenCalledWith(aliceAddress, withdrawAmount).returns(false);

            const withdrawTxPromise: Promise<any> = dao.withdraw(withdrawAmount);

            await expect(withdrawTxPromise).to.be.revertedWith("Transfer failed");
        });

        it("Should allow to withdraw tokens if any", async function() {
            const depositAmount: number = 2;
            await deposit(alice, depositAmount)
            const aliceAddress: string = await alice.getAddress();
            await erc20Mock.transfer.whenCalledWith(aliceAddress, depositAmount).returns(true);

            const depositsBeforeWithdrawal: number = (await dao.deposited(aliceAddress)).toNumber();
            await dao.withdraw(depositAmount);
            const depositsAfterWithdrawal: number = (await dao.deposited(aliceAddress)).toNumber();

            expect(depositAmount).to.equal(depositsBeforeWithdrawal);
            expect(0).to.equal(depositsAfterWithdrawal);
        });
   });

   describe("vote", async function() {
        it("Should not allow to vote if there is no proposal", async function() {
            const depositAmount: number = 2;
            await deposit(alice, depositAmount);
            const proposalId: number = 0;
            const votesFor: boolean = true;

            const voteTxPromise: Promise<any> = dao.vote(proposalId, votesFor);

            await expect(voteTxPromise).to.be.revertedWith("Proposal not found");
        });

        it("Should not allow to vote if the proposal has met deadline", async function() {
            const depositAmount: number = 2;
            await deposit(alice, depositAmount);
            const proposalId: number = 0;
            const votesFor: boolean = true;
            const description: string = "";
            const data: Uint8Array = new Uint8Array();
            const targetContractAddress: string = erc20Mock.address;

            await dao.addProposal(data, targetContractAddress, description);
            await network.provider.send("evm_increaseTime", [debatingPeriodDuration]);
            const voteTxPromise: Promise<any> = dao.vote(proposalId, votesFor);

            await expect(voteTxPromise).to.be.revertedWith("Proposal is finished");
        });

        it("Should not allow to vote if sender already voted", async function() {
            const depositAmount: number = 2;
            await deposit(alice, depositAmount);
            const proposalId: number = 0;
            const votesFor: boolean = true;
            const description: string = "";
            const data: Uint8Array = new Uint8Array();
            const targetContractAddress: string = erc20Mock.address;

            await dao.addProposal(data, targetContractAddress, description);
            await dao.vote(proposalId, votesFor);
            const voteTxPromise: Promise<any> = dao.vote(proposalId, votesFor);

            await expect(voteTxPromise).to.be.revertedWith("Already voted");
        });
   });

   describe("addProposal", async function() {
        it("Should allow for chairman to create proposal", async function() {
            const proposalId: number = 0;
            const description: string = "description";
            const data: Uint8Array = new Uint8Array();
            const targetContractAddress: string = erc20Mock.address;

            await dao.addProposal(data, targetContractAddress, description);
            const fetchDescription: string = await dao.description(proposalId);

            expect(fetchDescription).to.not.be.null;
        });

        it("Should not allow for non-chairman to create proposal", async function() {
            const description: string = "description";
            const data: Uint8Array = new Uint8Array();
            const targetContractAddress: string = erc20Mock.address;

            const addProposalTxPromise: Promise<any> =
                dao.connect(bob).addProposal(data, targetContractAddress, description);

            await expect(addProposalTxPromise).to.be.revertedWith("Not a chairman");
        });

        it("Should not allow to create a proposal if recepient is not a contract", async function() {
            const description: string = "description";
            const data: Uint8Array = new Uint8Array();
            const aliceAddress: string = await alice.getAddress();

            const addProposalTxPromise: Promise<any> = dao.addProposal(data, aliceAddress, description);

            await expect(addProposalTxPromise).to.be.revertedWith("Recipient is not a contract");
        });

        it("Should emit ProposalCreated event", async function() {
            const proposalId: number = 0;
            const description: string = "description";
            const data: Uint8Array = new Uint8Array();
            const targetContractAddress: string = erc20Mock.address;

            const addProposaltxPromise: Promise<any> = dao.addProposal(data, targetContractAddress, description);

            await expect(addProposaltxPromise).to.emit(dao, "ProposalCreated").withArgs(proposalId);
        });
   });

   describe("finishProposal", async function() {
        const changeFeeAbi = [{
          "inputs": [
            {
              "internalType": "uint256",
              "name": "_fees",
              "type": "uint256"
            }
          ],
          "name": "changeFee",
          "outputs": [],
          "stateMutability": "nonpayable",
          "type": "function"
        }];
        const iface = new ethers.utils.Interface(changeFeeAbi);

        it("Should not allow to finish non-existing proposal", async function() {
            const proposalId: number = 0;

            const finishProposalTxPromise: Promise<any> = dao.finishProposal(proposalId);

            await expect(finishProposalTxPromise).to.be.revertedWith("Proposal not found");
        });

        it("Should not allow to finish in-progress proposal", async function() {
            const proposalId: number = 0;
            const description: string = "";
            const data: Uint8Array = new Uint8Array();
            const targetContractAddress: string = erc20Mock.address;

            await dao.addProposal(data, targetContractAddress, description);
            const finishProposalTxPromise: Promise<any> = dao.finishProposal(proposalId);

            await expect(finishProposalTxPromise).to.be.revertedWith("Proposal is still in progress");
        });

        it("Should emit ProposalFailed if a number of votes does not exceed the minimum quorum", async function() {
            const depositAmount: number = 1;
            await deposit(alice, depositAmount);
            const proposalId: number = 0;
            const description: string = "";
            const data: Uint8Array = new Uint8Array();
            const targetContractAddress: string = erc20Mock.address;
            const daoBalance: number = 5;
            const votesFor: boolean = true;
            await erc20Mock.balanceOf.whenCalledWith(dao.address).returns(daoBalance);

            await dao.addProposal(data, targetContractAddress, description);
            await dao.vote(proposalId, votesFor);
            await network.provider.send("evm_increaseTime", [debatingPeriodDuration]);
            const finishProposalTxPromise: Promise<any> = dao.finishProposal(proposalId);

            await expect(finishProposalTxPromise).to.emit(dao, "ProposalFailed")
                .withArgs(proposalId, description, "Minimum quorum is not reached");
        });

        it("Should emit ProposalFinished if a call to a target contract succeeded", async function() {
            const aliceDepositAmount: number = 2;
            const bobDepositAmount: number = 1;
            await deposit(alice, aliceDepositAmount);
            await deposit(bob, bobDepositAmount);
            const proposalId: number = 0;
            const description: string = "";
            const newFees: number = 10;
            const data: string = iface.encodeFunctionData("changeFee", [newFees]);
            const targetContractAddress: string = erc20Mock.address;
            const daoBalance: number = 2;
            const votesFor: boolean = true;
            await erc20Mock.balanceOf.whenCalledWith(dao.address).returns(daoBalance);

            await dao.addProposal(data, targetContractAddress, description);
            await dao.vote(proposalId, votesFor);
            await dao.connect(bob).vote(proposalId, !votesFor);
            await network.provider.send("evm_increaseTime", [debatingPeriodDuration]);
            const finishProposalTxPromise: Promise<any> = dao.finishProposal(proposalId);

            await expect(finishProposalTxPromise).to.emit(dao, "ProposalFinished").withArgs(proposalId, description, votesFor);
            expect(erc20Mock.changeFee).to.be.calledOnceWith(newFees);
        });

        it("Should emit ProposalFailed if a call to a target contract did not succeed", async function() {
            const depositAmount: number = 2;
            await deposit(alice, depositAmount);
            const proposalId: number = 0;
            const description: string = "";
            const newFees: number = 10;
            const data: string = iface.encodeFunctionData("changeFee", [newFees]);
            const targetContractAddress: string = erc20Mock.address;
            const daoBalance: number = 2;
            const votesFor: boolean = true;
            await erc20Mock.balanceOf.whenCalledWith(dao.address).returns(daoBalance);
            await erc20Mock.changeFee.reverts();

            await dao.addProposal(data, targetContractAddress, description);
            await dao.vote(proposalId, votesFor);
            await network.provider.send("evm_increaseTime", [debatingPeriodDuration]);
            const finishProposalTxPromise: Promise<any> = dao.finishProposal(proposalId);

            await expect(finishProposalTxPromise).to.emit(dao, "ProposalFailed")
                .withArgs(proposalId, description, "Function call failed");
            expect(erc20Mock.changeFee).to.be.calledOnceWith(newFees);
        });

        it("Should emit ProposalFailed if a proposal has no votes", async function() {
            const proposalId: number = 0;
            const description: string = "";
            const data: Uint8Array = new Uint8Array();
            const targetContractAddress: string = erc20Mock.address;

            await dao.addProposal(data, targetContractAddress, description);
            await network.provider.send("evm_increaseTime", [debatingPeriodDuration]);
            const finishProposalTxPromise: Promise<any> = dao.finishProposal(proposalId);

            await expect(finishProposalTxPromise).to.emit(dao, "ProposalFailed")
                .withArgs(proposalId, description, "No votes for proposal");
        });

        it("Should emit ProposalFinished if number of `against` votes exceeds a number of `for` votes", async function() {
            const aliceDepositAmount: number = 1;
            const bobDepositAmount: number = 2;
            await deposit(alice, aliceDepositAmount);
            await deposit(bob, bobDepositAmount);
            const proposalId: number = 0;
            const description: string = "";
            const data: Uint8Array = new Uint8Array();
            const targetContractAddress: string = erc20Mock.address;
            const daoBalance: number = aliceDepositAmount + bobDepositAmount;
            const votesFor: boolean = true;
            await erc20Mock.balanceOf.whenCalledWith(dao.address).returns(daoBalance);

            await dao.addProposal(data, targetContractAddress, description);
            await dao.vote(proposalId, votesFor);
            await dao.connect(bob).vote(proposalId, !votesFor);
            await network.provider.send("evm_increaseTime", [debatingPeriodDuration]);
            const finishProposalTxPromise: Promise<any> = dao.finishProposal(proposalId);

            await expect(finishProposalTxPromise).to.emit(dao, "ProposalFinished")
                .withArgs(proposalId, description, !votesFor);
        });
   });

   describe("misc", async function() {
        it("Should not allow for non-owner to change debating period duration", async function() {
            const debatingPeriodDuration: number = 10;

            const setDebatingPeriodDurationTxPromise: Promise<any> =
                dao.connect(bob).setDebatingPeriodDuration(debatingPeriodDuration);

            await expect(setDebatingPeriodDurationTxPromise).to.be.revertedWith("Ownable: caller is not the owner");
        });

        it("Should allow for the owner to change debating period duration", async function() {
            const previousDebatingPeriodDuration: number = (await dao.debatingPeriodDuration()).toNumber();
            const toBeSetDebatingPeriodDuration: number = previousDebatingPeriodDuration + 1;

            await dao.setDebatingPeriodDuration(toBeSetDebatingPeriodDuration);
            const newDebatingPeriodDuration: number = (await dao.debatingPeriodDuration()).toNumber();

            expect(toBeSetDebatingPeriodDuration).to.equal(newDebatingPeriodDuration);
        });

        it("Should not allow for non-owner to change minimum quorum", async function() {
            const minimumQuorum: number = 10;

            const setMinimumQuorumTxPromise: Promise<any> = dao.connect(bob).setMinimumQuorum(minimumQuorum);

            await expect(setMinimumQuorumTxPromise).to.be.revertedWith("Ownable: caller is not the owner");
        });

        it("Should allow for the owner to change minimum quorum", async function() {
            const previousMinimumQuorum: number = (await dao.minimumQuorum()).toNumber();
            const toBeSetMinimumQuorum: number = previousMinimumQuorum + 1;

            await dao.setMinimumQuorum(toBeSetMinimumQuorum);
            const newMinimumQuorum: number = (await dao.minimumQuorum()).toNumber();

            expect(toBeSetMinimumQuorum).to.equal(newMinimumQuorum);
        });

        it("Should not allow to set a minimum quorum greater than 100", async function() {
            const minimumQuorum: number = 101;

            const setMinimumQuorumTxPromise: Promise<any> = dao.setMinimumQuorum(minimumQuorum);

            await expect(setMinimumQuorumTxPromise).to.be.revertedWith("Minimum quorum can not be > 100");
        });

        it("Should not return a description for a non-existing proposals", async function() {
            const proposalId: number = 0;

            const descriptionPromise: Promise<any>= dao.description(proposalId);

            await expect(descriptionPromise).to.be.revertedWith("Proposal not found");
        });

        it("Should return a valid description for an existing proposals", async function() {
            const data: Uint8Array = new Uint8Array();
            const proposalId: number = 0;
            const description: string = "This is it";
            const targetContractAddress: string = erc20Mock.address;

            await dao.addProposal(data, targetContractAddress, description);
            const setDescription: string = await dao.description(proposalId);

            expect(description).to.be.equal(setDescription);
        });

        it("Should not allow to construct dao contract with invalid minimum quorum", async function() {
            const erc20Mock: FakeContract<Contract> = await smock.fake(TestToken.abi);
            const minimumQuorum: number = 101;
            const VotingDaoFactory: VotingDao__factory = (await ethers.getContractFactory("VotingDao")) as VotingDao__factory;

            const deployTxPromise: Promise<any> = VotingDaoFactory.deploy(
                await alice.getAddress(), erc20Mock.address, minimumQuorum, debatingPeriodDuration
            );

            await expect(deployTxPromise).to.be.revertedWith("Minimum quorum can not be > 100");
        });
   });

   describe("changeChairman", async function() {
        it("Should not allow for non-chairman to change the chairman", async function() {
            const aliceAddress: string = await alice.getAddress();

            const changeChairmanTxPromise: Promise<any> = dao.connect(bob).changeChairman(aliceAddress);

            await expect(changeChairmanTxPromise).to.be.revertedWith("Not a chairman");
        });

        it("Should allow for chairman to change the chairman", async function() {
            const bobAddress: string = await bob.getAddress();

            await dao.changeChairman(bobAddress);
            const theChairman: string = await dao.chairman();

            expect(bobAddress).to.equal(theChairman);
        });

        it("Should not allow to assign zero address as the chairman", async function() {
            const changeChairmanTxPromise: Promise<any> = dao.changeChairman(ethers.constants.AddressZero);

            await expect(changeChairmanTxPromise).to.be.revertedWith("Should not be zero address");
        });
   });
});