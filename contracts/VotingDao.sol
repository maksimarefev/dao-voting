pragma solidity ^0.8.0;

import "./IERC20WithFees.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

//todo arefev: add docs
contract VotingDao is Ownable {
    using Counters for Counters.Counter;

    struct Proposal {
        bytes data;
        address recipient;
        string description;
        uint256 votesFor;
        uint256 votesAgainst;
        uint256 deadline;
        address[] voters;
    }

    address public chairman;
    IERC20WithFees public voteToken;
    uint256 public minimumQuorum;
    uint256 public debatingPeriodDuration;
    Counters.Counter private proposalIdGenerator;
    mapping(uint256 => Proposal) private proposals;
    mapping(address => uint256) proposalCounters;
    mapping(uint256 => mapping(address => bool)) proposalsToVoters; //since the compiler does not allow us to assign structs with nested mappings :(
    mapping(address => uint256) private stakeholdersToDeposits;

    event ProposalFinished(bool votedFor);

    event ProposalFailed(string description);

    modifier onlyChairman() {
        require(msg.sender == chairman, "Not a chairman");
        _;
    }

    modifier onlyStakeholder() {
        require(stakeholdersToDeposits[msg.sender] != 0, "Not a stakeholder");
        _;
    }

    constructor(address _chairman, address _voteToken, uint256 _minimumQuorum, uint256 _debatingPeriodDuration) public {
        require(_minimumQuorum <= 100, "Minimum quorum can not exceed 100%");
        chairman = _chairman;
        voteToken = IERC20WithFees(_voteToken);
        minimumQuorum = _minimumQuorum;
        debatingPeriodDuration = _debatingPeriodDuration;
    }

    function deposit(uint256 amount) public {
        require(voteToken.balanceOf(msg.sender) >= amount, "Not enough balance");
        require(voteToken.allowance(msg.sender, address(this)) >= amount, "Not enough allowance");
        require(voteToken.transferFrom(msg.sender, address(this), amount), "Transfer failed");
        stakeholdersToDeposits[msg.sender] += amount;
    }

    function withdraw(uint256 amount) public onlyStakeholder {
        require(proposalCounters[msg.sender] == 0, "Sender is participating in proposals");
        require(stakeholdersToDeposits[msg.sender] >= amount, "Amount is greater than deposited");
        require(voteToken.transfer(msg.sender, amount), "Transfer failed");
        stakeholdersToDeposits[msg.sender] -= amount;
    }

    function addProposal(bytes memory data, address recipient, string memory _description) public onlyChairman {
        uint32 codeSize;
        assembly {
            codeSize := extcodesize(recipient)
        }
        require(codeSize > 0, "Recipient is not a contract");

        uint256 nextProposalId = proposalIdGenerator.current();
        proposalIdGenerator.increment();

        Proposal storage newProposal = proposals[nextProposalId];
        newProposal.data = data;
        newProposal.recipient = recipient;
        newProposal.description = _description;
        newProposal.deadline = block.timestamp + debatingPeriodDuration;
        proposals[nextProposalId] = newProposal;
    }

    function vote(uint256 proposalId, bool votesFor) public onlyStakeholder {
        Proposal storage proposal = proposals[proposalId];

        require(proposal.recipient != address(0), "Proposal not found");
        require(proposal.deadline > block.timestamp, "Proposal is finished");
        require(!proposalsToVoters[proposalId][msg.sender], "Already voted");

        proposalsToVoters[proposalId][msg.sender] = true;
        proposalCounters[msg.sender] += 1;
        proposal.voters.push(msg.sender);

        if (votesFor) {
            proposal.votesFor += stakeholdersToDeposits[msg.sender];
        } else {
            proposal.votesAgainst += stakeholdersToDeposits[msg.sender];
        }
    }

    function finishProposal(uint256 proposalId) public {
        Proposal storage proposal = proposals[proposalId];

        require(proposal.recipient != address(0), "Proposal not found");
        require(block.timestamp >= proposal.deadline, "Proposal is still in progress");

        if (isQuorumReached(proposal)) {
            (bool success,) = proposal.recipient.call{value : 0}(proposal.data);

            if (success) {
                emit ProposalFinished(proposal.votesFor > proposal.votesAgainst);
            } else {
                emit ProposalFailed("Function call failed");
            }
        } else {
            emit ProposalFailed("Minimum quorum is not reached");
        }

        for (uint256 i = 0; i < proposal.voters.length; i++) {
            delete proposalsToVoters[proposalId][proposal.voters[i]];
            proposalCounters[proposal.voters[i]] -= 1;
        }
        delete proposals[proposalId];
    }

    function setMinimumQuorum(uint256 _minimumQuorum) public onlyOwner {
        require(_minimumQuorum <= 100, "Minimum quorum can not exceed 100%");
        minimumQuorum = _minimumQuorum;
    }

    function setDebatingPeriodDuration(uint256 _debatingPeriodDuration) public onlyOwner {
        debatingPeriodDuration = _debatingPeriodDuration;
    }

    function description(uint256 proposalId) public view returns (string memory) {
        require(proposals[proposalId].recipient != address(0), "Proposal not found");
        return proposals[proposalId].description;
    }

    function deposited(address stakeholder) public view returns(uint256) {
        return stakeholdersToDeposits[stakeholder];
    }

    //todo arefev: what if there is no supply? is that possible? yes, it is possible
    function isQuorumReached(Proposal storage proposal) private returns (bool) {
        return (proposal.votesFor + proposal.votesAgainst) / voteToken.balanceOf(address(this)) * 100 >= minimumQuorum;
    }
}
