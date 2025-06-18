// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

interface IProofOfWorkJob {
    function employer() external view returns (address);
}

contract DisputeDAO is Ownable, ReentrancyGuard {
    struct Dispute {
        address job;
        address initiator;
        bool resolved;
        uint256 votesFor;
        uint256 votesAgainst;
        string reason;
    }

    mapping(uint256 => Dispute) public disputes;
    uint256 public disputeCount;

    address[] public jurors;
    mapping(address => bool) public isJuror;

    event DisputeCreated(uint256 indexed id, address indexed job, address indexed by, string reason);
    event Voted(uint256 indexed id, address indexed juror, bool support);
    event DisputeResolved(uint256 indexed id, bool outcome);

    constructor(address initialOwner) Ownable(initialOwner) {
        address juror1 = 0xfF817442F4Cc914b0338F197c4c0EfFe2E2707C9;
        address juror2 = 0xA0c5048c32870bB66d0BE861643cD6Bb5F66Ada2;
        jurors.push(juror1);
        jurors.push(juror2);
        isJuror[juror1] = true;
        isJuror[juror2] = true;
    }

    function getJurors() external view returns (address[] memory) {
        return jurors;
    }

    function createDispute(address job, string calldata reason) external returns (uint256) {
        require(bytes(reason).length > 0, "Reason cannot be empty");
        
        address employer = IProofOfWorkJob(job).employer();
        require(msg.sender == employer || msg.sender == tx.origin, "Not authorized");

        Dispute storage d = disputes[disputeCount];
        d.job = job;
        d.initiator = msg.sender;
        d.resolved = false;
        d.votesFor = 0;
        d.votesAgainst = 0;
        d.reason = reason;
        
        emit DisputeCreated(disputeCount, job, msg.sender, reason);
        return disputeCount++;
    }

    function vote(uint256 id, bool support) external {
        require(isJuror[msg.sender], "Not juror");
        Dispute storage d = disputes[id];
        require(!d.resolved, "Already resolved");

        if (support) d.votesFor++;
        else d.votesAgainst++;

        emit Voted(id, msg.sender, support);
    }

    function finalize(uint256 id) external nonReentrant {
        Dispute storage d = disputes[id];
        require(!d.resolved, "Already done");
        d.resolved = true;
        bool outcome = d.votesFor > d.votesAgainst;
        emit DisputeResolved(id, outcome);
    }

    function getDisputeSummary(uint256 id) external view returns (
        address job,
        address initiator,
        bool resolved,
        uint256 votesFor,
        uint256 votesAgainst,
        string memory reason
    ) {
        Dispute storage d = disputes[id];
        return (d.job, d.initiator, d.resolved, d.votesFor, d.votesAgainst, d.reason);
    }

    function getDisputeCount() external view returns (uint256) {
        return disputeCount;
    }

    function getDisputeReason(uint256 id) external view returns (string memory) {
        return disputes[id].reason;
    }
}
