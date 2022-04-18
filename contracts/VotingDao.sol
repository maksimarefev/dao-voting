pragma solidity ^0.8.0;

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
        mapping(address => bool) voters;
    }

    address public chairman;
    IERC20 public voteToken;
    uint256 public minimumQuorum;
    uint256 public debatingPeriodDuration;
    Counters.Counter private proposalIdGenerator;
    mapping(uint256 => Proposal) private proposals;
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
        chairman = _chairman;
        voteToken = IERC20(_voteToken);
        minimumQuorum = _minimumQuorum;
        debatingPeriodDuration = _debatingPeriodDuration;
    }

    //todo arefev: balanceOf?
    function deposit(uint256 amount) public {
        require(voteToken.allowance(msg.sender, address(this)) >= amount, "Not enough allowance");
        require(voteToken.transferFrom(msg.sender, address(this), amount), "Transfer failed");
        stakeholdersToDeposits[msg.sender] += amount;
    }

    //todo arefev: forbid withdrawing if there are corresponding proposals in place
    //todo arefev: seems like i have no other way rather than keep an array of voted proposals for the voter
    function withdraw(uint256 amount) public onlyStakeholder {
        require(stakeholdersToDeposits[msg.sender] >= amount, "Amount is greater than deposited");
        require(voteToken.transfer(msg.sender, amount), "Transfer failed");
        stakeholdersToDeposits[msg.sender] -= amount;
    }

    //todo arefev: what is description?
    function addProposal(bytes memory data, address recipient, string memory description) public onlyChairman {
        uint256 nextProposalId = proposalIdGenerator.current();
        proposalIdGenerator.increment();
        proposals[nextProposalId] = Proposal({
        data : data,
        recipient : recipient,
        description : description,
        votesFor : 0,
        votesAgainst : 0,
        deadline : block.timestamp + debatingPeriodDuration
        });
    }

    function vote(uint256 proposalId, bool votesFor) public onlyStakeholder {
        Proposal storage proposal = proposals[proposalId];

        require(proposal.recipient != address(0), "Proposal not found");
        require(!proposal.voters[msg.sender], "Already voted");

        proposal.voters[msg.sender] = true;

        if (votesFor) {
            proposal.votesFor += stakeholdersToDeposits;
        } else {
            proposal.votesAgainst += stakeholdersToDeposits;
        }
    }

    function finishProposal(uint256 proposalId) public {
        Proposal memory proposal = proposals[proposalId];

        require(proposal.recipient != address(0), "Proposal not found");
        require(block.timestamp >= proposal.deadline, "Proposal is still in progress");

        //todo arefev: should we remember the original minimumQuorum?
        if ((proposal.votesAgainst + proposal.votesAgainst) / voteToken.balanceOf(address(this)) < minimumQuorum) {
            emit ProposalFailed("Minimum quorum is not reached");
        } else if (proposal.votesFor > proposal.votesAgainst) {
            (bool success,) = proposal.recipient.call{value : 0}(proposal.data);

            if (success) {
                emit ProposalFinished(proposal.votesFor > proposal.votesAgainst);
            } else {
                emit ProposalFailed("Function call failed");
            }
        }

        delete proposals[proposalId];
    }

    function setMinimumQuorum(uint256 _minimumQuorum) public onlyOwner {
        minimumQuorum = _minimumQuorum;
    }

    function setDebatingPeriodDuration(uint256 _debatingPeriodDuration) public onlyOwner {
        debatingPeriodDuration = _debatingPeriodDuration;
    }
}
