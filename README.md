## Overview
Crosschain bridge implementation (Ethereum <--> BSC).

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
From the root folder run<br/>``` npx hardhat [task name] --network [rinkeby or bsc] --contract-address [contract address] --argument [argument value] ```<br/>Example:<br/>``` npx hardhat swap --network rinkeby --contract-address 0x36913BEc58a87BfB5eC1Fbb2fdEc6dd78a00B6eC --to 0x12D8F31923Aa0ACC543b96733Bc0ed348Ef44970 --amount 100 --network-id 97 ```

## The list of available tasks
| Task name   | Description                                                         | Options                                                                                                                                                                                                                                                                                                  |
|-------------|---------------------------------------------------------------------|----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| addProposal | Creates a new proposal                                              | --contract-address => An address of a contract</br>--to => The recepient address</br>--amount => The amount of tokens to be swapped</br>--network-id => The target networkId                                                                                                                             |
| deposit     | Transfers the `amount` of tokens from `msg.sender` to that contract | --contract-address => An address of a contract</br>--from => The address of account which triggered the swap</br>--amount => The amount of tokens to be redeemed</br>--nonce => The nonce value issued by the signer backend service</br>--signature => The signature made by the signer backend service |
| finish      | Finishes the proposal with id `proposalId`                          | --contract-address => An address of a contract</br>--from => The address of account which triggered the swap</br>--amount => The amount of tokens to be redeemed</br>--nonce => The nonce value issued by the signer backend service</br>--signature => The signature made by the signer backend service |
| vote        | Registers `msg.sender` vote                                         | --contract-address => An address of a contract</br>--from => The address of account which triggered the swap</br>--amount => The amount of tokens to be redeemed</br>--nonce => The nonce value issued by the signer backend service</br>--signature => The signature made by the signer backend service |
| withdraw    | Transfers the `amount` of tokens from that contract to `msg.sender` | --contract-address => An address of a contract</br>--from => The address of account which triggered the swap</br>--amount => The amount of tokens to be redeemed</br>--nonce => The nonce value issued by the signer backend service</br>--signature => The signature made by the signer backend service |

## How to run tests and evaluate the coverage
From the root folder run ``` npx hardhat coverage ```
## Current test and coverage results for *i7-8550U 1.80GHz/16Gb RAM/WIN10 x64*
```
VotingDao
    deposit
      √ Should not allow to deposit on insufficient balance (61ms)
      √ Should not allow to deposit on insufficient allowance
      √ Should not allow to deposit on failed transfer (42ms)
    withdraw
      √ Should not allow to withdraw if sender is participating in proposals (139ms)
      √ Should not allow to withdraw the amount greater than the sender holds (58ms)
      √ Should not allow for a non-stakeholder to withdraw
      √ Should not allow to withdraw on failed transfer (79ms)
      √ Should allow to withdraw tokens if any (86ms)
    vote
      √ Should not allow to vote if there is no proposal (65ms)
      √ Should not allow to vote if the proposal has met deadline (94ms)
      √ Should not allow to vote if sender already voted (162ms)
    addProposal
      √ Should allow for chairman to create proposal (71ms)
      √ Should not allow for non-chairman to create proposal
      √ Should not allow to create a proposal if recepient is not a contract
    finishProposal
      √ Should not allow to finish non-existing proposal
      √ Should not allow to finish in-progress proposal (53ms)
      √ Should emit ProposalFailed if a number of votes does not exceed the minimum quorum (156ms)
      √ Should emit ProposalFinished if a call to a target contract succeeded (235ms)
      √ Should emit ProposalFailed if a call to a target contract did not succeed (222ms)
      √ Should emit ProposalFailed if a proposal has no votes (110ms)
    misc
      √ Should not allow for non-owner to change debating period duration
      √ Should allow for the owner to change debating period duration (86ms)
      √ Should not allow for non-owner to change minimum quorum (42ms)
      √ Should allow for the owner to change minimum quorum (71ms)
      √ Should not allow to set a minimum quorum greater than 100
      √ Should not return a description for a non-existing proposals
      √ Should return a valid description for an existing proposals (71ms)
      √ Should not allow to construct dao contract with invalid minimum quorum (42ms)

  28 passing (6s)
```
| File             | % Stmts    | % Branch   | % Funcs    | % Lines    | Uncovered Lines  |
|------------------|------------|------------|------------|------------|------------------|
| contracts\       | 100        | 100        | 100        | 100        |                  |
| VotingDao.sol    | 100        | 100        | 100        | 100        |                  |
| ---------------- | ---------- | ---------- | ---------- | ---------- | ---------------- |
| All files        | 100        | 100        | 100        | 100        |                  |


## Project dependencies
* @defi-wonderland/smock#2.0.7
* @m.arefev/nft#1.0.1
* @nomiclabs/ethereumjs-vm#4.2.2
* @nomiclabs/hardhat-ethers#2.0.5
* @nomiclabs/hardhat-etherscan#3.0.3
* @nomiclabs/hardhat-waffle#2.0.3
* @nomiclabs/hardhat-web3#2.0.0
* @openzeppelin/contracts#4.5.0
* @typechain/ethers-v5#10.0.0
* @typechain/hardhat#6.0.0
* @types/chai#4.3.0
* @types/mocha#9.1.0
* @types/node#17.0.23
* @typescript-eslint/eslint-plugin#5.18.0
* @typescript-eslint/parser#5.18.0
* chai#4.3.6
* dotenv#16.0.0
* eslint#8.13.0
* ethereum-waffle#3.4.4
* hardhat#2.9.3
* solhint#3.3.7
* solidity-coverage#0.7.20
* ts-node#10.7.0
* typechain#8.0.0
* typescript#4.6.3
