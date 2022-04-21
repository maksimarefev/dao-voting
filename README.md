## Overview
Implementation of Decentralized Autonomous Organization. Provides ability for stakeholders to vote on calling contract's function.

## Configuring a secret
In the root folder create *.env* file and fill it the following properties:<br/>
```
{
    ALCHEMY_API_KEY=[ALCHEMY API KEY]
    PRIVATE_KEY=[YOUR ACCOUNT's PRIVATE KEY]
    ETHERSCAN_API_KEY=[YOUR ETHERSCAN APY KEY]
}
```

## How to deploy
1. From the root folder run ``` npm run deploy ```
2. Save the contract addresses for future interactions

## How to run a task
From the root folder run<br/>``` npx hardhat [task name] --network rinkeby --contract-address [contract address] --argument [argument value] ```<br/>Example:<br/>``` npx hardhat addProposal --network rinkeby --contract-address 0x3c829995384010bdc623b6adebd40155d284fe00 --data 0x6a1db1bf000000000000000000000000000000000000000000000000000000000000000a --recipient 0x96de77CaE6f32F3e030e1da63F6C989152aBAf4E --description "Voting for call" ```

## The list of available tasks
| Task name   | Description                                                         | Options                                                                                                                                                                        |
|-------------|---------------------------------------------------------------------|--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| addProposal | Creates a new proposal                                              | --contract-address => An address of a contract</br>--data => Calldata for target function</br>--recipient => Callee contract address</br>--description => Proposal description |
| deposit     | Transfers the `amount` of tokens from `msg.sender` to that contract | --contract-address => An address of a contract</br>--amount =>  Tokens to transfer                                                                                             |
| finish      | Finishes the proposal with id `proposalId`                          | --contract-address => An address of a contract</br>--proposal-id => Proposal id                                                                                                |
| vote        | Registers `msg.sender` vote                                         | --contract-address => An address of a contract</br>--proposal-id => Proposal id</br>--votesFor => Flag which specifies whether a sender votes `for` or `against`               |
| withdraw    | Transfers the `amount` of tokens from that contract to `msg.sender` | --contract-address => An address of a contract</br>--amount => Tokens to withdraw                                                                                              |

## How to run tests and evaluate the coverage
From the root folder run ``` npx hardhat coverage ```
## Current test and coverage results for *i7-8550U 1.80GHz/16Gb RAM/WIN10 x64*
```
VotingDao
    deposit
      √ Should not allow to deposit on insufficient balance (53ms)
      √ Should not allow to deposit on insufficient allowance
      √ Should not allow to deposit on failed transfer
    withdraw
      √ Should not allow to withdraw if sender is participating in proposals (136ms)
      √ Should not allow to withdraw the amount greater than the sender holds (60ms)
      √ Should not allow for a non-stakeholder to withdraw
      √ Should not allow to withdraw on failed transfer (81ms)
      √ Should allow to withdraw tokens if any (115ms)
    vote
      √ Should not allow to vote if there is no proposal (62ms)
      √ Should not allow to vote if the proposal has met deadline (95ms)
      √ Should not allow to vote if sender already voted (138ms)
    addProposal
      √ Should allow for chairman to create proposal (77ms)
      √ Should not allow for non-chairman to create proposal
      √ Should not allow to create a proposal if recepient is not a contract
      √ Should emit ProposalCreated event (39ms)
    finishProposal
      √ Should not allow to finish non-existing proposal
      √ Should not allow to finish in-progress proposal (57ms)
      √ Should emit ProposalFailed if a number of votes does not exceed the minimum quorum (103ms)
      √ Should emit ProposalFinished if a call to a target contract succeeded (204ms)
      √ Should emit ProposalFailed if a call to a target contract did not succeed (140ms)
      √ Should emit ProposalFailed if a proposal has no votes (62ms)
      √ Should emit ProposalFinished if number of `against` votes exceeds a number of `for` votes (188ms)
    misc
      √ Should not allow for non-owner to change debating period duration
      √ Should allow for the owner to change debating period duration
      √ Should not allow for non-owner to change minimum quorum
      √ Should allow for the owner to change minimum quorum
      √ Should not allow to set a minimum quorum greater than 100
      √ Should not return a description for a non-existing proposals
      √ Should return a valid description for an existing proposals (57ms)
      √ Should not allow to construct dao contract with invalid minimum quorum (46ms)
    changeChairman
      √ Should not allow for non-chairman to change the chairman
      √ Should allow for chairman to change the chairman (50ms)
      √ Should not allow to assign zero address as the chairman

  33 passing (5s)
```
| File             | % Stmts    | % Branch   | % Funcs    | % Lines    | Uncovered Lines  |
|------------------|------------|------------|------------|------------|------------------|
| contracts\       | 100        | 100        | 100        | 100        |                  |
| VotingDao.sol    | 100        | 100        | 100        | 100        |                  |
| ---------------- | ---------- | ---------- | ---------- | ---------- | ---------------- |
| All files        | 100        | 100        | 100        | 100        |                  |


## Project dependencies
* @defi-wonderland/smock#2.0.7
* @nomiclabs/ethereumjs-vm#4.2.2
* @nomiclabs/hardhat-ethers#2.0.5
* @nomiclabs/hardhat-etherscan#3.0.3
* @nomiclabs/hardhat-waffle#2.0.3
* @nomiclabs/hardhat-web3#2.0.0
* @openzeppelin/contracts#4.5.0
* @typechain/ethers-v5#10.0.0
* @typechain/hardhat#6.0.0
* @types/chai#4.3.1
* @types/mocha#9.1.0
* @types/node#17.0.25
* @typescript-eslint/eslint-plugin#5.20.0
* @typescript-eslint/parser#5.20.0
* chai#4.3.6
* dotenv#16.0.0
* eslint#8.13.0
* ethereum-waffle#3.4.4
* hardhat#2.9.3
* solhint#3.3.7
* solidity-coverage#0.7.20
* ts-node#10.7.0
* typechain#8.0.0
* typescript#4.6.
