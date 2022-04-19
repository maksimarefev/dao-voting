import { expect, use } from "chai";
import { ethers } from "hardhat";
import { Signer, Contract } from "ethers";
import { FakeContract, smock } from "@defi-wonderland/smock";
import { VotingDao, VotingDao__factory } from "../typechain-types";

import TestToken from "../artifacts/contracts/TestToken.sol/TestToken.json";

use(smock.matchers);

/*todo arefev:
    addProposal
        Should allow for chairman to create proposal
        Shold not allow for non-chairman to create proposal
    setMinimumQuorum
    setDebatingPeriodDuration
    description
 */
describe("VotingDao", function() {

    const minimumQuorum = 30; //30%
    const debatingPeriodDuration = 3 * 60; //3 minutes

    let bob: Signer;
    let alice: Signer;
    let dao: VotingDao;
    let erc20Mock: FakeContract<Contract>;

    beforeEach("Deploying contract", async function () {
        const networkId: number = 1;
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
        async function deposit() {
            const aliceAddress: string = await alice.getAddress();
            const aliceBalance: number = 2;
            const allowance: number = 2;
            const depositAmount: number = 2;
            await erc20Mock.balanceOf.whenCalledWith(aliceAddress).returns(aliceBalance);
            await erc20Mock.allowance.whenCalledWith(aliceAddress, dao.address).returns(allowance);
            await erc20Mock.transferFrom.whenCalledWith(aliceAddress, dao.address, depositAmount).returns(true);
            await dao.deposit(depositAmount);
        }

        it("Should not allow to withdraw if sender is participating in proposals", async function() {
            await deposit();
            const withdrawAmount: number = 1;
            const data: Uint8Array = new Uint8Array();
            const description: string = "";
            const proposalId: number = 0;
            const votesFor: boolean = true;
            const aliceAddress: string = await alice.getAddress();

            await dao.addProposal(data, aliceAddress, description);
            await dao.vote(proposalId, votesFor);
            const withdrawTxPromise: Promise<any> = dao.withdraw(withdrawAmount);

            await expect(withdrawTxPromise).to.be.revertedWith("Sender is participating in proposals");
        });

        it("Should not allow to withdraw the amount greater than the sender holds", async function() {
            await deposit();
            const withdrawAmount: number = 3;

            const withdrawTxPromise: Promise<any> = dao.withdraw(withdrawAmount);

            await expect(withdrawTxPromise).to.be.revertedWith("Amount is greater than deposited");
        });

        it("Should not allow to withdraw on failed transfer", async function() {
            await deposit();
            const withdrawAmount: number = 1;
            const aliceAddress: string = await alice.getAddress();
            await erc20Mock.transfer.whenCalledWith(aliceAddress, withdrawAmount).returns(false);

            const withdrawTxPromise: Promise<any> = dao.withdraw(withdrawAmount);

            await expect(withdrawTxPromise).to.be.revertedWith("Transfer failed");
        });
   });

   describe("vote", async function() {
        it("Should not allow to vote if there is no proposal", async function() {
            //todo arefev: implement
        });

        it("Should not allow to vote if the proposal has met deadline", async function() {
            //todo arefev: implement
        });

        it("Should not allow to vote if sender already voted", async function() {
            //todo arefev: implement
        });
   });

   describe("finishProposal", async function() {
        it("Should not allow to finish non-existing proposal", async function() {
            //todo arefev: implement
        });

        it("Should not allow to finish in-progress proposal", async function() {
            //todo arefev: implement
        });

        it("Should emit ProposalFailed if a number of votes does not exceed the minimum quorum", async function() {
            //todo arefev: implement
        });

        it("Should emit ProposalFinished if a call to a target contract succeeded", async function() {
            //todo arefev: implement
        });

        it("Should emit ProposalFailed if a call to a target contract did not succeed", async function() {
            //todo arefev: implement
        });
   });
});