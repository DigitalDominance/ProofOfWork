// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./ReputationSystem.sol";
import "./DisputeDAO.sol";

contract ProofOfWorkJob is ReentrancyGuard {
    enum PayType { WEEKLY, ONE_OFF }
    enum ApplicationStatus { PENDING, REVIEWED, REJECTED, ACCEPTED }

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

    // Job completion tracking for ratings
    mapping(address => bool) public hasCompletedJob;
    mapping(address => bool) public hasRatedEmployer;
    mapping(address => bool) public employerHasRatedWorker;
    
    bool public jobEnded = false;

    // Enhanced Applicant structure
    struct Applicant {
        address applicantAddress;
        string application;
        uint256 appliedAt;
        bool isActive;
        ApplicationStatus status;
        uint256 reviewedAt;
        bool wasAccepted; // Track if application was accepted (for reviewed applications)
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
    event ApplicationAccepted(address indexed applicant);
    event ApplicationDeclined(address indexed applicant);
    event WorkerAssigned(address indexed worker);
    event PaymentReleased(address indexed worker, uint256 amount);
    event OneOffPayment(address indexed worker, uint256 amount);
    event JobCompleted(address indexed worker);
    event DisputeOpened(address indexed by, uint256 disputeId, string reason);
    event RatingSubmitted(address indexed rater, address indexed ratee, uint8 score);
    event JobEnded();

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

    // ==================== RATING FUNCTIONS ====================

    /**
     * @dev Rate a worker (only employer can rate workers)
     * @param worker The worker's address
     * @param score Rating score (1-5)
     */
    function rateWorker(
        address worker,
        uint8 score
    ) external onlyEmployer {
        require(isWorker[worker], "Not a worker");
        require(hasCompletedJob[worker] || jobEnded, "Worker hasn't completed job");
        require(!employerHasRatedWorker[worker], "Already rated this worker");
        require(score >= 1 && score <= 5, "Score must be 1-5");

        employerHasRatedWorker[worker] = true;
        reputation.submitRating(worker, score);
        
        emit RatingSubmitted(msg.sender, worker, score);
    }

    /**
     * @dev Rate the employer (only workers can rate employer)
     * @param score Rating score (1-5)
     */
    function rateEmployer(
        uint8 score
    ) external {
        require(isWorker[msg.sender], "Not a worker");
        require(hasCompletedJob[msg.sender] || jobEnded, "Haven't completed job");
        require(!hasRatedEmployer[msg.sender], "Already rated employer");
        require(score >= 1 && score <= 5, "Score must be 1-5");

        hasRatedEmployer[msg.sender] = true;
        reputation.submitRating(employer, score);
        
        emit RatingSubmitted(msg.sender, employer, score);
    }

    /**
     * @dev End the job (allows all parties to rate even if job not fully completed)
     */
    function endJob() external onlyEmployer {
        jobEnded = true;
        emit JobEnded();
    }

    /**
     * @dev Check if employer can rate a worker
     */
    function canRateWorker(address worker) external view returns (bool) {
        return isWorker[worker] && 
               (hasCompletedJob[worker] || jobEnded) && 
               !employerHasRatedWorker[worker];
    }

    /**
     * @dev Check if worker can rate employer
     */
    function canRateEmployer(address worker) external view returns (bool) {
        return isWorker[worker] && 
               (hasCompletedJob[worker] || jobEnded) && 
               !hasRatedEmployer[worker];
    }

    // ==================== APPLICANT FUNCTIONS ====================

    function submitApplication(string memory _application) external {
        require(bytes(_application).length > 0, "Application cannot be empty");
        require(!hasApplied[msg.sender], "Already applied");
        require(!isWorker[msg.sender], "Already assigned as worker");
        require(assignedWorkers.length < positions, "All positions filled");

        applicants[msg.sender] = Applicant({
            applicantAddress: msg.sender,
            application: _application,
            appliedAt: block.timestamp,
            isActive: true,
            status: ApplicationStatus.PENDING,
            reviewedAt: 0,
            wasAccepted: false
        });

        hasApplied[msg.sender] = true;
        applicantAddresses.push(msg.sender);

        emit ApplicationSubmitted(msg.sender, _application);
    }

    function withdrawApplication() external {
        require(hasApplied[msg.sender], "No application found");
        require(applicants[msg.sender].isActive, "Application already inactive");
        require(!isWorker[msg.sender], "Already assigned as worker");

        applicants[msg.sender].isActive = false;

        emit ApplicationWithdrawn(msg.sender);
    }

    // ==================== APPLICATION REVIEW FUNCTIONS ====================

    /**
     * @dev Accept an application (only employer)
     * @param applicant The applicant's address
     */
    function acceptApplication(address applicant) external onlyEmployer {
        require(hasApplied[applicant], "No application found");
        require(applicants[applicant].isActive, "Application not active");
        require(!isWorker[applicant], "Already assigned as worker");
        require(assignedWorkers.length < positions, "Max positions filled");

        // Set status to REVIEWED and mark as accepted
        applicants[applicant].status = ApplicationStatus.REVIEWED;
        applicants[applicant].reviewedAt = block.timestamp;
        applicants[applicant].isActive = false;
        applicants[applicant].wasAccepted = true;

        // Assign as worker
        isWorker[applicant] = true;
        activeWorker[applicant] = true;
        assignedWorkers.push(applicant);

        emit ApplicationAccepted(applicant);
        emit WorkerAssigned(applicant);
    }

    /**
     * @dev Decline/Reject an application (only employer)
     * @param applicant The applicant's address
     */
    function declineApplication(address applicant) external onlyEmployer {
        require(hasApplied[applicant], "No application found");
        require(applicants[applicant].isActive, "Application not active");
        require(!isWorker[applicant], "Already assigned as worker");

        // Set status to REVIEWED and mark as not accepted
        applicants[applicant].status = ApplicationStatus.REVIEWED;
        applicants[applicant].reviewedAt = block.timestamp;
        applicants[applicant].isActive = false;
        applicants[applicant].wasAccepted = false;

        emit ApplicationDeclined(applicant);
    }

    /**
     * @dev Decline multiple applications at once (only employer)
     * @param applicantList Array of applicant addresses to decline
     */
    function batchDeclineApplications(address[] memory applicantList) external onlyEmployer {
        for (uint256 i = 0; i < applicantList.length; i++) {
            address applicant = applicantList[i];
            if (hasApplied[applicant] && applicants[applicant].isActive && !isWorker[applicant]) {
                applicants[applicant].status = ApplicationStatus.REVIEWED;
                applicants[applicant].reviewedAt = block.timestamp;
                applicants[applicant].isActive = false;
                applicants[applicant].wasAccepted = false;

                emit ApplicationDeclined(applicant);
            }
        }
    }

    /**
     * @dev Batch accept multiple applications
     * @param applicantList Array of applicant addresses to accept
     */
    function batchAcceptApplications(address[] memory applicantList) external onlyEmployer {
        for (uint256 i = 0; i < applicantList.length; i++) {
            address applicant = applicantList[i];
            if (hasApplied[applicant] && 
                applicants[applicant].isActive && 
                !isWorker[applicant] && 
                assignedWorkers.length < positions) {
                
                // Set status to REVIEWED and mark as accepted
                applicants[applicant].status = ApplicationStatus.REVIEWED;
                applicants[applicant].reviewedAt = block.timestamp;
                applicants[applicant].isActive = false;
                applicants[applicant].wasAccepted = true;

                // Assign as worker
                isWorker[applicant] = true;
                activeWorker[applicant] = true;
                assignedWorkers.push(applicant);

                emit ApplicationAccepted(applicant);
                emit WorkerAssigned(applicant);
            }
        }
    }

    /**
     * @dev Get applications by status
     * @param status The status to filter by
     */
    function getApplicationsByStatus(ApplicationStatus status) external view returns (address[] memory) {
        uint256 count = 0;
        
        // Count matching applications
        for (uint256 i = 0; i < applicantAddresses.length; i++) {
            if (applicants[applicantAddresses[i]].status == status) {
                count++;
            }
        }

        address[] memory result = new address[](count);
        uint256 index = 0;
        
        // Fill result array
        for (uint256 i = 0; i < applicantAddresses.length; i++) {
            address applicantAddr = applicantAddresses[i];
            if (applicants[applicantAddr].status == status) {
                result[index] = applicantAddr;
                index++;
            }
        }

        return result;
    }

    /**
     * @dev Get reviewed applications that were accepted
     */
    function getAcceptedApplications() external view returns (address[] memory) {
        uint256 count = 0;
        
        // Count accepted applications
        for (uint256 i = 0; i < applicantAddresses.length; i++) {
            if (applicants[applicantAddresses[i]].status == ApplicationStatus.REVIEWED && 
                applicants[applicantAddresses[i]].wasAccepted) {
                count++;
            }
        }

        address[] memory result = new address[](count);
        uint256 index = 0;
        
        // Fill result array
        for (uint256 i = 0; i < applicantAddresses.length; i++) {
            address applicantAddr = applicantAddresses[i];
            if (applicants[applicantAddr].status == ApplicationStatus.REVIEWED && 
                applicants[applicantAddr].wasAccepted) {
                result[index] = applicantAddr;
                index++;
            }
        }

        return result;
    }

    /**
     * @dev Get reviewed applications that were declined
     */
    function getDeclinedApplications() external view returns (address[] memory) {
        uint256 count = 0;
        
        // Count declined applications
        for (uint256 i = 0; i < applicantAddresses.length; i++) {
            if (applicants[applicantAddresses[i]].status == ApplicationStatus.REVIEWED && 
                !applicants[applicantAddresses[i]].wasAccepted) {
                count++;
            }
        }

        address[] memory result = new address[](count);
        uint256 index = 0;
        
        // Fill result array
        for (uint256 i = 0; i < applicantAddresses.length; i++) {
            address applicantAddr = applicantAddresses[i];
            if (applicants[applicantAddr].status == ApplicationStatus.REVIEWED && 
                !applicants[applicantAddr].wasAccepted) {
                result[index] = applicantAddr;
                index++;
            }
        }

        return result;
    }

    /**
     * @dev Get pending applications count
     */
    function getPendingApplicationsCount() external view returns (uint256) {
        uint256 count = 0;
        for (uint256 i = 0; i < applicantAddresses.length; i++) {
            if (applicants[applicantAddresses[i]].status == ApplicationStatus.PENDING && 
                applicants[applicantAddresses[i]].isActive) {
                count++;
            }
        }
        return count;
    }

    /**
     * @dev Get reviewed applications count
     */
    function getReviewedApplicationsCount() external view returns (uint256) {
        uint256 count = 0;
        for (uint256 i = 0; i < applicantAddresses.length; i++) {
            if (applicants[applicantAddresses[i]].status == ApplicationStatus.REVIEWED) {
                count++;
            }
        }
        return count;
    }

    /**
     * @dev Get accepted applications count
     */
    function getAcceptedApplicationsCount() external view returns (uint256) {
        uint256 count = 0;
        for (uint256 i = 0; i < applicantAddresses.length; i++) {
            if (applicants[applicantAddresses[i]].status == ApplicationStatus.REVIEWED && 
                applicants[applicantAddresses[i]].wasAccepted) {
                count++;
            }
        }
        return count;
    }

    /**
     * @dev Get declined applications count
     */
    function getDeclinedApplicationsCount() external view returns (uint256) {
        uint256 count = 0;
        for (uint256 i = 0; i < applicantAddresses.length; i++) {
            if (applicants[applicantAddresses[i]].status == ApplicationStatus.REVIEWED && 
                !applicants[applicantAddresses[i]].wasAccepted) {
                count++;
            }
        }
        return count;
    }

    function getAllApplicants() external view returns (address[] memory) {
        return applicantAddresses;
    }

    function getActiveApplicants() external view returns (address[] memory) {
        uint256 activeCount = 0;
        
        for (uint256 i = 0; i < applicantAddresses.length; i++) {
            if (applicants[applicantAddresses[i]].isActive && !isWorker[applicantAddresses[i]]) {
                activeCount++;
            }
        }

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

    function getApplicant(address _applicant) external view returns (
        address applicantAddress,
        string memory application,
        uint256 appliedAt,
        bool isActive,
        ApplicationStatus status,
        uint256 reviewedAt,
        bool wasAccepted
    ) {
        require(hasApplied[_applicant], "No application found");
        
        Applicant memory applicant = applicants[_applicant];
        return (
            applicant.applicantAddress,
            applicant.application,
            applicant.appliedAt,
            applicant.isActive,
            applicant.status,
            applicant.reviewedAt,
            applicant.wasAccepted
        );
    }

    /**
     * @dev Get application status as string for frontend display
     */
    function getApplicationStatusString(address _applicant) external view returns (string memory) {
        require(hasApplied[_applicant], "No application found");
        
        ApplicationStatus status = applicants[_applicant].status;
        
        if (status == ApplicationStatus.PENDING) return "Pending";
        if (status == ApplicationStatus.REVIEWED) {
            return applicants[_applicant].wasAccepted ? "Accepted" : "Declined";
        }
        
        return "Unknown";
    }

    function getTotalApplications() external view returns (uint256) {
        return applicantAddresses.length;
    }

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
     * @dev Direct worker assignment without application (only employer)
     * @param worker The worker's address to assign directly
     */
    function assignWorkerDirect(address worker) external onlyEmployer {
        require(worker != address(0), "Bad worker");
        require(!isWorker[worker], "Already assigned");
        require(assignedWorkers.length < positions, "Max positions filled");

        isWorker[worker] = true;
        activeWorker[worker] = true;
        assignedWorkers.push(worker);

        // If they had applied, mark as reviewed and accepted
        if (hasApplied[worker]) {
            applicants[worker].status = ApplicationStatus.REVIEWED;
            applicants[worker].isActive = false;
            applicants[worker].wasAccepted = true;
            if (applicants[worker].reviewedAt == 0) {
                applicants[worker].reviewedAt = block.timestamp;
            }
            emit ApplicationAccepted(worker);
        }

        emit WorkerAssigned(worker);
    }

    // ==================== WORKER FUNCTIONS ====================

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
        
        // Mark as completed if this is the final payout
        if (payoutsMade == durationWeeks) {
            hasCompletedJob[w] = true;
        }
        
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
        hasCompletedJob[w] = true;
        
        emit OneOffPayment(w, amount);
        emit JobCompleted(w);
    }

    function openDispute(string calldata reason) external {
        uint256 id = disputeDAO.createDispute(address(this), reason);
        emit DisputeOpened(msg.sender, id, reason);
    }
}
