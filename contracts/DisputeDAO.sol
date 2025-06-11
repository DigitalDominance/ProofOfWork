
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract DisputeDAO {
    address public immutable jobFactory;
    address[] public jurors;
    address[] public allDisputes;

    mapping(address => bool) public isJuror;
    mapping(uint256 => Dispute) public disputes;
    uint256 public disputeCount;

    struct Dispute {
        address job;
        address openedBy;
        uint256 openedAt;
        bool resolved;
        address resolvedBy;
        bool rulingInFavorOfWorker;
    }

    event DisputeCreated(uint256 indexed id, address indexed job, address indexed openedBy);
    event DisputeResolved(uint256 indexed id, address indexed resolvedBy, bool inFavorOfWorker);
    event JurorAdded(address indexed juror);
    event JurorRemoved(address indexed juror);

    modifier onlyJuror() {
        require(isJuror[msg.sender], "Not a juror");
        _;
    }

    constructor(address _jobFactory) {
        jobFactory = _jobFactory;
        address juror1 = 0xA0c5048c32870bB66d0BE861643cD6Bb5F66Ada2;
        address juror2 = 0x5B9F69a7D2D73A1CdAe17412F57A6fBeC7e6f61D;
        _addJuror(juror1);
        _addJuror(juror2);
    }

    function _addJuror(address juror) internal {
        require(juror != address(0), "Invalid address");
        if (!isJuror[juror]) {
            jurors.push(juror);
            isJuror[juror] = true;
            emit JurorAdded(juror);
        }
    }

    function addJuror(address juror) external onlyJuror {
        _addJuror(juror);
    }

    function removeJuror(address juror) external onlyJuror {
        require(isJuror[juror], "Not a juror");
        isJuror[juror] = false;
        emit JurorRemoved(juror);
    }

    function getJurors() external view returns (address[] memory) {
        return jurors;
    }

    function createDispute(address job, uint256 dummy) external returns (uint256) {
        disputes[disputeCount] = Dispute({
            job: job,
            openedBy: msg.sender,
            openedAt: block.timestamp,
            resolved: false,
            resolvedBy: address(0),
            rulingInFavorOfWorker: false
        });
        allDisputes.push(job);
        emit DisputeCreated(disputeCount, job, msg.sender);
        return disputeCount++;
    }

    function resolveDispute(uint256 id, bool inFavorOfWorker) external onlyJuror {
        Dispute storage d = disputes[id];
        require(!d.resolved, "Already resolved");
        d.resolved = true;
        d.resolvedBy = msg.sender;
        d.rulingInFavorOfWorker = inFavorOfWorker;
        emit DisputeResolved(id, msg.sender, inFavorOfWorker);
    }

    function getAllDisputes() external view returns (address[] memory) {
        return allDisputes;
    }
}
