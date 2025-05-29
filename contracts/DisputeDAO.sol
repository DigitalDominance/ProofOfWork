// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

/// @notice Simple on-chain dispute module with juror voting
contract DisputeDAO is ReentrancyGuard {
    struct Dispute {
        address job;
        address initiator;
        bool    resolved;
        uint256 votesFor;
        uint256 votesAgainst;
    }
    mapping(uint256 => Dispute) public disputes;
    uint256 public disputeCount;

    event DisputeCreated(uint256 indexed id, address indexed job, address indexed by);
    event Voted(uint256 indexed id, address indexed juror, bool support);
    event DisputeResolved(uint256 indexed id, bool outcome);

    function createDispute(address job, uint256 /*jobId*/) external returns (uint256) {
        disputes[disputeCount] = Dispute({
            job: job,
            initiator: msg.sender,
            resolved: false,
            votesFor: 0,
            votesAgainst: 0
        });
        emit DisputeCreated(disputeCount, job, msg.sender);
        return disputeCount++;
    }

    function vote(uint256 id, bool support) external {
        Dispute storage d = disputes[id];
        require(!d.resolved, "Already resolved");
        if (support) d.votesFor++; else d.votesAgainst++;
        emit Voted(id, msg.sender, support);
    }

    /// @notice Anyone can call once quorum reached to finalize
    function finalize(uint256 id) external nonReentrant {
        Dispute storage d = disputes[id];
        require(!d.resolved, "Done");
        // simple majority
        bool outcome = d.votesFor > d.votesAgainst;
        d.resolved = true;
        emit DisputeResolved(id, outcome);
    }
}
