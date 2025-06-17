// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./ReputationSystem.sol";
import "./DisputeDAO.sol";

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

    string[] public tags;

    ReputationSystem public reputation;
    DisputeDAO public disputeDAO;

    // Applicant structure
    struct Applicant {
        address applicantAddress;
        string application;
        uint256 appliedAt;
        bool isActive; // To track if application is still valid
    }

    // Applicant mappings and arrays
    address[] public applicantAddresses;
    mapping(address => Applicant) public applicants;
    mapping(address => bool) public hasApplied;

    // Worker mappings (existing)
    address[] public assignedWorkers;
    mapping(address => bool) public isWorker;
    mapping(address => bool) public activeWorker;

    address public constant ADMIN = 0xA0c5048c32870bB66d0BE861643cD6Bb5F66Ada2;

    // Events
    event ApplicationSubmitted(address indexed applicant, string application);
    event ApplicationWithdrawn(address indexed applicant);
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
        uint256 _positions,
        address _disputeDAO,
        string[] memory _tags
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

        // Add tags from constructor parameter
        for (uint i = 0; i < _tags.length; i++) {
            tags.push(_tags[i]);
        }        

        reputation = new ReputationSystem(address(this));
        disputeDAO = DisputeDAO(_disputeDAO);
    }

    // ==================== APPLICANT FUNCTIONS ====================

    /**
     * @dev Submit an application for the job
     * @param _application The application text from the applicant
     */
    function submitApplication(string memory _application) external {
        require(bytes(_application).length > 0, "Application cannot be empty");
        require(!hasApplied[msg.sender], "Already applied");
        require(!isWorker[msg.sender], "Already assigned as worker");
        require(assignedWorkers.length < positions, "All positions filled");

        // Create applicant struct
        applicants[msg.sender] = Applicant({
            applicantAddress: msg.sender,
            application: _application,
            appliedAt: block.timestamp,
            isActive: true
        });

        hasApplied[msg.sender] = true;
        applicantAddresses.push(msg.sender);

        emit ApplicationSubmitted(msg.sender, _application);
    }

    /**
     * @dev Withdraw an application (only by the applicant)
     */
    function withdrawApplication() external {
        require(hasApplied[msg.sender], "No application found");
        require(applicants[msg.sender].isActive, "Application already inactive");
        require(!isWorker[msg.sender], "Already assigned as worker");

        applicants[msg.sender].isActive = false;

        emit ApplicationWithdrawn(msg.sender);
    }

    /**
     * @dev Get all applicant addresses
     */
    function getAllApplicants() external view returns (address[] memory) {
        return applicantAddresses;
    }

    /**
     * @dev Get active applicants only
     */
    function getActiveApplicants() external view returns (address[] memory) {
        uint256 activeCount = 0;
        
        // First pass: count active applicants
        for (uint256 i = 0; i < applicantAddresses.length; i++) {
            if (applicants[applicantAddresses[i]].isActive && !isWorker[applicantAddresses[i]]) {
                activeCount++;
            }
        }

        // Second pass: populate array
        address[] memory activeApplicants = new address[](activeCount);
        uint256 index = 0;
        
        for (uint256 i = 0; i < applicantAddresses.length; i++) {
            address applicantAddr = applicantAddresses[i];
            if (applicants[applicantAddr].isActive && !isWorker[applicantAddr]) {
                activeApplicants[index] = applicantAddr;
                index++;
            }
        }

        return activeApplicants;
    }

    /**
     * @dev Get applicant details by address
     */
    function getApplicant(address _applicant) external view returns (
        address applicantAddress,
        string memory application,
        uint256 appliedAt,
        bool isActive
    ) {
        require(hasApplied[_applicant], "No application found");
        
        Applicant memory applicant = applicants[_applicant];
        return (
            applicant.applicantAddress,
            applicant.application,
            applicant.appliedAt,
            applicant.isActive
        );
    }

    /**
     * @dev Get total number of applications (including inactive)
     */
    function getTotalApplications() external view returns (uint256) {
        return applicantAddresses.length;
    }

    /**
     * @dev Get number of active applications
     */
    function getActiveApplicationsCount() external view returns (uint256) {
        uint256 count = 0;
        for (uint256 i = 0; i < applicantAddresses.length; i++) {
            if (applicants[applicantAddresses[i]].isActive && !isWorker[applicantAddresses[i]]) {
                count++;
            }
        }
        return count;
    }

    // ==================== WORKER ASSIGNMENT FUNCTIONS ====================

    /**
     * @dev Assign a worker from applicants (only employer)
     * @param worker The address of the applicant to assign as worker
     */
    function assignWorker(address worker) external onlyEmployer {
        require(worker != address(0), "Bad worker");
        require(!isWorker[worker], "Already assigned");
        require(assignedWorkers.length < positions, "Max positions filled");
        
        // Worker must have applied (optional check - you can remove if you want to assign anyone)
        require(hasApplied[worker], "Must apply first");
        require(applicants[worker].isActive, "Application not active");

        isWorker[worker] = true;
        activeWorker[worker] = true;
        assignedWorkers.push(worker);

        // Mark application as inactive since they're now assigned
        applicants[worker].isActive = false;

        emit WorkerAssigned(worker);
    }

    /**
     * @dev Assign worker directly without requiring application (employer only)
     * @param worker The address to assign as worker
     */
    function assignWorkerDirect(address worker) external onlyEmployer {
        require(worker != address(0), "Bad worker");
        require(!isWorker[worker], "Already assigned");
        require(assignedWorkers.length < positions, "Max positions filled");

        isWorker[worker] = true;
        activeWorker[worker] = true;
        assignedWorkers.push(worker);

        // If they had applied, mark application as inactive
        if (hasApplied[worker]) {
            applicants[worker].isActive = false;
        }

        emit WorkerAssigned(worker);
    }

    // ==================== EXISTING FUNCTIONS ====================

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
        uint256 id = disputeDAO.createDispute(address(this));
        emit DisputeOpened(msg.sender, id);
    }
}
