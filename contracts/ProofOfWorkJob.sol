// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./ReputationSystem.sol";
import "./DisputeDAO.sol";

/// @notice One job instance managing funds, assignments, and payouts
contract ProofOfWorkJob is ReentrancyGuard {
    enum PayType { WEEKLY, ONE_OFF }
    PayType   public immutable payType;
    address   public immutable employer;
    uint256   public immutable weeklyPay;
    uint256   public immutable durationWeeks;
    uint256   public immutable totalPay;
    uint256   public immutable createdAt;
    uint256   public lastPayoutAt;
    uint256   public payoutsMade;
    uint256   public positions;
    uint256   public platformFeeBps;
    address payable public feeRecipient;

    ReputationSystem public reputation;
    DisputeDAO       public disputeDAO;

    mapping(address => bool)   public isWorker;
    mapping(address => bool)   public activeWorker;

    event WorkerAssigned(address indexed worker);
    event PaymentReleased(address indexed worker, uint256 amount);
    event OneOffPayment(address indexed worker, uint256 amount);
    event JobCompleted(address indexed worker);
    event DisputeOpened(address indexed by, uint256 disputeId);

    modifier onlyEmployer() {
        require(msg.sender == employer, "Only employer");
        _;
    }

    constructor(
        address _employer,
        uint8 _payType,
        uint256 _weeklyPay,
        uint256 _durationWeeks,
        uint256 _totalPay,
        string memory /*title*/,
        string memory /*description*/,
        uint256 _positions,
        address payable _feeRecipient,
        uint256 _platformFeeBps
    ) payable {
        employer       = _employer;
        payType        = PayType(_payType);
        weeklyPay      = _weeklyPay;
        durationWeeks  = _durationWeeks;
        totalPay       = _totalPay;
        positions      = _positions;
        createdAt      = block.timestamp;
        lastPayoutAt   = block.timestamp;
        platformFeeBps = _platformFeeBps;
        feeRecipient   = _feeRecipient;

        // deploy or link shared modules
        reputation = new ReputationSystem(address(this));
        disputeDAO = new DisputeDAO();
    }

    /// @notice Employer assigns a worker to one of the positions
    function assignWorker(address worker) external onlyEmployer {
        require(worker != address(0), "Bad worker");
        require(!isWorker[worker], "Already assigned");
        require(payoutsMade < positions, "All positions full");
        isWorker[worker] = true;
        activeWorker[worker] = true;
        emit WorkerAssigned(worker);
    }

    /// @notice Worker or employer can mark active/inactive
    function setActive(bool active) external {
        require(isWorker[msg.sender], "Not a worker");
        activeWorker[msg.sender] = active;
    }

    /// @notice Release weekly payouts (for WEEKLY jobs)
    function releaseWeekly() external nonReentrant {
        require(payType == PayType.WEEKLY, "Not weekly job");
        require(block.timestamp >= lastPayoutAt + 1 weeks, "Too soon");
        require(payoutsMade < durationWeeks, "All payouts done");

        uint256 gross = weeklyPay;
        uint256 fee   = (gross * platformFeeBps) / 10_000;
        uint256 net   = gross - fee;

        lastPayoutAt = block.timestamp;
        payoutsMade++;

        // send platform fee
        (bool f1, ) = feeRecipient.call{value: fee}("");
        require(f1, "Fee send fail");

        // send worker payment
        address payable worker = payable(msg.sender);
        require(activeWorker[worker], "Not active");
        (bool s1, ) = worker.call{value: net}("");
        require(s1, "Pay fail");

        reputation.updateWorker(worker, 1);
        emit PaymentReleased(worker, net);
    }

    /// @notice Release one-off payment (for ONE_OFF jobs)
    function releaseOneOff() external nonReentrant {
        require(payType == PayType.ONE_OFF, "Not one-off job");
        require(isWorker[msg.sender], "Not assigned");
        require(activeWorker[msg.sender], "Not active");

        uint256 gross = totalPay;
        uint256 fee   = (gross * platformFeeBps) / 10_000;
        uint256 net   = gross - fee;

        // prevent reentrancy
        totalPay == 0;

        // send platform fee
        (bool f2, ) = feeRecipient.call{value: fee}("");
        require(f2, "Fee send fail");

        // send rest to worker
        address payable w = payable(msg.sender);
        (bool s2, ) = w.call{value: net}("");
        require(s2, "Pay fail");

        reputation.updateWorker(w, 1);
        emit OneOffPayment(w, net);
        emit JobCompleted(w);
    }

    /// @notice Anyone can open a dispute; DAO handles resolution
    function openDispute() external {
        uint256 id = disputeDAO.createDispute(address(this), 0);
        emit DisputeOpened(msg.sender, id);
    }
}
