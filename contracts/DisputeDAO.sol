// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/// @notice On-chain dispute module with appointed jurors
contract DisputeDAO is Ownable, ReentrancyGuard {
    struct Dispute {
        address job;
        address initiator;
        bool    resolved;
        uint256 votesFor;
        uint256 votesAgainst;
    }

    mapping(uint256 => Dispute) public disputes;
    uint256 public disputeCount;

    address[] public jurors;
    mapping(address => bool) public isJuror;

    event JurorAdded(address indexed juror);
    event JurorRemoved(address indexed juror);
    event DisputeCreated(uint256 indexed id, address indexed job, address indexed by);
    event Voted(uint256 indexed id, address indexed juror, bool support);
    event DisputeResolved(uint256 indexed id, bool outcome);

    /// @param initialOwner typically the ProofOfWorkJob contract
    constructor(address initialOwner) Ownable(initialOwner) {}

    /// @notice Add a juror (only owner)
    function addJuror(address _juror) external onlyOwner {
        require(_juror != address(0) && !isJuror[_juror], "Bad juror");
        isJuror[_juror] = true;
        jurors.push(_juror);
        emit JurorAdded(_juror);
    }

    /// @notice Remove a juror (only owner)
    function removeJuror(address _juror) external onlyOwner {
        require(isJuror[_juror], "Not juror");
        isJuror[_juror] = false;
        for (uint i = 0; i < jurors.length; i++) {
            if (jurors[i] == _juror) {
                jurors[i] = jurors[jurors.length - 1];
                jurors.pop();
                break;
            }
        }
        emit JurorRemoved(_juror);
    }

    /// @notice List all jurors
    function getJurors() external view returns (address[] memory) {
        return jurors;
    }

    /// @notice Initiate a dispute (anyone)
    function createDispute(address job, uint256 /*jobId*/) external returns (uint256) {
        Dispute storage d = disputes[disputeCount];
        d.job        = job;
        d.initiator  = msg.sender;
        d.resolved   = false;
        d.votesFor   = 0;
        d.votesAgainst = 0;
        emit DisputeCreated(disputeCount, job, msg.sender);
        return disputeCount++;
    }

    /// @notice Cast a vote (appointed jurors only)
    function vote(uint256 id, bool support) external {
        require(isJuror[msg.sender], "Not juror");
        Dispute storage d = disputes[id];
        require(!d.resolved, "Already resolved");
        if (support) d.votesFor++; else d.votesAgainst++;
        emit Voted(id, msg.sender, support);
    }

    /// @notice Finalize once voting is complete
    function finalize(uint256 id) external nonReentrant {
        Dispute storage d = disputes[id];
        require(!d.resolved, "Done");
        d.resolved = true;
        bool outcome = d.votesFor > d.votesAgainst;
        emit DisputeResolved(id, outcome);
    }
}
