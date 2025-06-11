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
        string[] messages;
    }

    mapping(uint256 => Dispute) public disputes;
    uint256 public disputeCount;

    address[] public jurors;
    mapping(address => bool) public isJuror;

    event DisputeCreated(uint256 indexed id, address indexed job, address indexed by);
    event Voted(uint256 indexed id, address indexed juror, bool support);
    event DisputeResolved(uint256 indexed id, bool outcome);
    event MessagePosted(uint256 indexed id, address indexed sender, string message);


    constructor(address initialOwner) Ownable(initialOwner) {
        address[2] memory initialJurors = [
            0xfF817442F4Cc914b0338F197c4c0EfFe2E2707C9,
            0xA0c5048c32870bB66d0BE861643cD6Bb5F66Ada2
        ];
        for (uint i = 0; i < initialJurors.length; i++) {
            address juror = initialJurors[i];
            isJuror[juror] = true;
            jurors.push(juror);
            emit JurorAdded(juror);
        }
    }

    function getJurors() external view returns (address[] memory) {
        return jurors;
    }

    function createDispute(address job) external returns (uint256) {
        address employer = IProofOfWorkJob(job).employer();
        require(msg.sender == employer || msg.sender == tx.origin, "Not authorized");

        Dispute storage d = disputes[disputeCount];
        d.job = job;
        d.initiator = msg.sender;
        d.resolved = false;
        d.votesFor = 0;
        d.votesAgainst = 0;
        emit DisputeCreated(disputeCount, job, msg.sender);
        return disputeCount++;
    }

    function postMessage(uint256 id, string calldata message) external {
        Dispute storage d = disputes[id];
        require(!d.resolved, "Closed");

        address employer = IProofOfWorkJob(d.job).employer();
        require(
            msg.sender == employer || msg.sender == d.initiator || isJuror[msg.sender],
            "Not allowed"
        );

        d.messages.push(message);
        emit MessagePosted(id, msg.sender, message);
    }

    function getMessages(uint256 id) external view returns (string[] memory) {
        return disputes[id].messages;
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
        uint256 votesAgainst
    ) {
        Dispute storage d = disputes[id];
        return (d.job, d.initiator, d.resolved, d.votesFor, d.votesAgainst);
    }

    function getDisputeCount() external view returns (uint256) {
        return disputeCount;
    }

}
