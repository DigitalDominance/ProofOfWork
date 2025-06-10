// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./ReputationSystem.sol";
import "./DisputeDAO.sol";

/// @notice One job instance managing funds, assignments, payouts, and juror disputes
contract ProofOfWorkJob is ReentrancyGuard {
    enum PayType { WEEKLY, ONE_OFF }

    PayType public immutable payType;
    address public immutable employer;
    uint256 public immutable weeklyPay;
    uint256 public immutable durationWeeks;
    uint256 public immutable totalPay;
    uint256 public immutable createdAt;
    uint256 public lastPayoutAt;
    uint256 public payoutsMade;
    uint256 public positions;

    string public title;
    string public description;

    ReputationSystem public reputation;
    DisputeDAO public disputeDAO;

    address[] public assignedWorkers;
    mapping(address => bool) public isWorker;
    mapping(address => bool) public activeWorker;

    address public constant ADMIN = 0xA0c5048c32870bB66d0BE861643cD6Bb5F66Ada2;

    event WorkerAssigned(address indexed worker);
    event PaymentReleased(address indexed worker, uint256 amount);
    event OneOffPayment(address indexed worker, uint256 amount);
    event JobCompleted(address indexed worker);
    event DisputeOpened(address indexed by, uint256 disputeId);

    modifier onlyEmployer() {
        require(msg.sender == employer, "Only employer");
        _;
    }

    modifier onlyAdmin() {
        require(msg.sender == ADMIN, "Only admin");
        _;
    }

    constructor(
        address _employer,
        uint8 _payType,
        uint256 _weeklyPay,
        uint256 _durationWeeks,
        uint256 _totalPay,
        string memory _title,
        string memory _description,
        uint256 _positions
    ) payable {
        employer = _employer;
        payType = PayType(_payType);
        weeklyPay = _weeklyPay;
        durationWeeks = _durationWeeks;
        totalPay = _totalPay;
        positions = _positions;
        createdAt = block.timestamp;
        lastPayoutAt = block.timestamp;

        title = _title;
        description = _description;

        reputation = new ReputationSystem(address(this));
        disputeDAO = new DisputeDAO(address(this));
    }

    function assignWorker(address worker) external onlyEmployer {
        require(worker != address(0), "Bad worker");
        require(!isWorker[worker], "Already assigned");
        require(assignedWorkers.length < positions, "Max positions filled");

        isWorker[worker] = true;
        activeWorker[worker] = true;
        assignedWorkers.push(worker);

        emit WorkerAssigned(worker);
    }

    function getAssignedWorkers() external view returns (address[] memory) {
        return assignedWorkers;
    }

    function setActive(bool active) external {
        require(isWorker[msg.sender], "Not worker");
        activeWorker[msg.sender] = active;
    }

    function releaseWeekly() external nonReentrant {
        require(payType == PayType.WEEKLY, "Not weekly");
        require(block.timestamp >= lastPayoutAt + 1 weeks, "Too soon");
        require(payoutsMade < durationWeeks, "All paid");

        lastPayoutAt = block.timestamp;
        payoutsMade++;

        uint256 amount = weeklyPay;
        address payable w = payable(msg.sender);
        require(activeWorker[w], "Inactive");

        (bool s,) = w.call{value: amount}("");
        require(s, "Pay failed");

        reputation.updateWorker(w, 1);
        emit PaymentReleased(w, amount);
    }

    function releaseOneOff() external nonReentrant {
        require(payType == PayType.ONE_OFF, "Not one-off");
        require(isWorker[msg.sender], "Not assigned");
        require(activeWorker[msg.sender], "Inactive");

        uint256 amount = totalPay;
        address payable w = payable(msg.sender);

        (bool s,) = w.call{value: amount}("");
        require(s, "Pay failed");

        reputation.updateWorker(w, 1);
        emit OneOffPayment(w, amount);
        emit JobCompleted(w);
    }

    function openDispute() external {
        uint256 id = disputeDAO.createDispute(address(this), 0);
        emit DisputeOpened(msg.sender, id);
    }

    function addJuror(address juror) external onlyAdmin {
        disputeDAO.addJuror(juror);
    }

    function removeJuror(address juror) external onlyAdmin {
        disputeDAO.removeJuror(juror);
    }

    function getJurors() external view returns (address[] memory) {
        return disputeDAO.getJurors();
    }
}
