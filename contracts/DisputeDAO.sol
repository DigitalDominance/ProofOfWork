// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract DisputeDAO {
    struct Dispute {
        address job;
        address initiator;
        bool    resolved;
        uint256 votesFor;
        uint256 votesAgainst;
        string[] messages;
        address[] messageSenders;
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
    event MessageAdded(uint256 indexed id, address indexed from, string message);

    constructor() {
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
        require(msg.sender == ProofOfWorkJob(job).employer() || ProofOfWorkJob(job).isWorker(msg.sender), "Not authorized");

        Dispute storage d = disputes[disputeCount];
        d.job        = job;
        d.initiator  = msg.sender;
        emit DisputeCreated(disputeCount, job, msg.sender);
        return disputeCount++;
    }

    function vote(uint256 id, bool support) external {
        require(isJuror[msg.sender], "Not juror");
        Dispute storage d = disputes[id];
        require(!d.resolved, "Resolved");
        if (support) d.votesFor++; else d.votesAgainst++;
        emit Voted(id, msg.sender, support);
    }

    function finalize(uint256 id) external {
        Dispute storage d = disputes[id];
        require(!d.resolved, "Already resolved");
        d.resolved = true;
        bool outcome = d.votesFor > d.votesAgainst;
        emit DisputeResolved(id, outcome);
    }

    function sendMessage(uint256 id, string calldata msgContent) external {
        Dispute storage d = disputes[id];
        require(!d.resolved, "Resolved");
        require(
            msg.sender == d.initiator ||
            isJuror[msg.sender] ||
            msg.sender == ProofOfWorkJob(d.job).employer() ||
            ProofOfWorkJob(d.job).isWorker(msg.sender),
            "Unauthorized"
        );
        d.messages.push(msgContent);
        d.messageSenders.push(msg.sender);
        emit MessageAdded(id, msg.sender, msgContent);
    }

    function getDispute(uint256 id) external view returns (
        address job,
        address initiator,
        bool resolved,
        uint256 votesFor,
        uint256 votesAgainst,
        string[] memory messages,
        address[] memory senders
    ) {
        Dispute storage d = disputes[id];
        return (
            d.job,
            d.initiator,
            d.resolved,
            d.votesFor,
            d.votesAgainst,
            d.messages,
            d.messageSenders
        );
    }
}

interface ProofOfWorkJob {
    function employer() external view returns (address);
    function isWorker(address user) external view returns (bool);
}
