pragma solidity ^0.8.0;

import "./IERC20WithFees.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

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

    /**
     * @dev EOA responsible for proposals creation
     */
    address public chairman; //todo arefev: add possibility to change chairman
    IERC20WithFees public voteToken;

    /**
     * @dev The minimum amount of votes needed to consider a proposal to be successful. Quorum = (votes / dao total supply) * 100.
     */
    uint256 public minimumQuorum;

    /**
     * @dev EOA responsible for proposals creation
     */
    uint256 public debatingPeriodDuration;

    Counters.Counter private proposalIdGenerator;
    mapping(uint256 => Proposal) private proposals;
    mapping(address => uint256) private proposalCounters;
    mapping(uint256 => mapping(address => bool)) private proposalsToVoters; //since the compiler does not allow us to assign structs with nested mappings :(
    mapping(address => uint256) private stakeholdersToDeposits;

    /**
     * @dev Emitted when the proposal was successfully finished
     */
    event ProposalFinished(uint256 indexed proposalId, string description, bool approved);

    /**
     * @dev Emitted when the proposal was failed
     */
    event ProposalFailed(uint256 indexed proposalId, string description, string reason);

    modifier onlyChairman() {
        require(msg.sender == chairman, "Not a chairman");
        _;
    }

    modifier onlyStakeholder() {
        require(stakeholdersToDeposits[msg.sender] != 0, "Not a stakeholder");
        _;
    }

    constructor(address _chairman, address _voteToken, uint256 _minimumQuorum, uint256 _debatingPeriodDuration) public {
        require(_minimumQuorum <= 100, "Minimum quorum can not be > 100");
        chairman = _chairman;
        voteToken = IERC20WithFees(_voteToken);
        minimumQuorum = _minimumQuorum;
        debatingPeriodDuration = _debatingPeriodDuration;
    }

    /**
     * @notice transfers the `amount` of tokens from `msg.sender` to that contract
     */
    function deposit(uint256 amount) public {
        require(voteToken.balanceOf(msg.sender) >= amount, "Not enough balance");
        require(voteToken.allowance(msg.sender, address(this)) >= amount, "Not enough allowance");
        require(voteToken.transferFrom(msg.sender, address(this), amount), "Transfer failed");
        stakeholdersToDeposits[msg.sender] += amount;
    }

    /**
     * @notice transfers the `amount` of tokens from that contract to `msg.sender`
     */
    function withdraw(uint256 amount) public onlyStakeholder {
        require(proposalCounters[msg.sender] == 0, "There are ongoing proposals");
        require(stakeholdersToDeposits[msg.sender] >= amount, "Amount is greater than deposited");
        stakeholdersToDeposits[msg.sender] -= amount;
        require(voteToken.transfer(msg.sender, amount), "Transfer failed");
    }

    /**
     * @notice creates a new proposal
     * @return created proposal id
     */
    function addProposal(bytes memory data, address recipient, string memory _description) public onlyChairman returns(uint256) {
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

        return nextProposalId;
    }

    /**
     * @notice registers `msg.sender` vote
     */
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

    /**
     * @notice finishes the proposal with id `proposalId`
     */
    function finishProposal(uint256 proposalId) public {
        Proposal storage proposal = proposals[proposalId];

        require(proposal.recipient != address(0), "Proposal not found");
        require(block.timestamp >= proposal.deadline, "Proposal is still in progress");

        if (proposal.votesFor == 0 && proposal.votesAgainst == 0) {
            emit ProposalFailed(proposalId, proposal.description, "No votes for proposal");
        } else if ((proposal.votesFor + proposal.votesAgainst) * 100 / voteToken.balanceOf(address(this)) >= minimumQuorum) {
            if (proposal.votesFor > proposal.votesAgainst) {
                (bool success,) = proposal.recipient.call{value : 0}(proposal.data);

                if (success) {
                    emit ProposalFinished(proposalId, proposal.description, true);
                } else {
                    emit ProposalFailed(proposalId, proposal.description, "Function call failed");
                }
            } else {
                emit ProposalFinished(proposalId, proposal.description, false);
            }
        } else {
            emit ProposalFailed(proposalId, proposal.description, "Minimum quorum is not reached");
        }

        for (uint256 i = 0; i < proposal.voters.length; i++) {
            delete proposalsToVoters[proposalId][proposal.voters[i]];
            proposalCounters[proposal.voters[i]] -= 1;
        }
        delete proposals[proposalId];
    }

    function setMinimumQuorum(uint256 _minimumQuorum) public onlyOwner {
        require(_minimumQuorum <= 100, "Minimum quorum can not be > 100");
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
}
