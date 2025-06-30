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

    mapping(address => bool) public hasRequestedPayment;
    mapping(address => uint256) public paymentRequestTime;
    mapping(address => bool) public hasReceivedAllPayments;
    
    bool public jobEnded = false;
    bool public jobCancelled = false;

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
    event JobCancelled(uint256 refundAmount);
    event PaymentRequested(address indexed worker, uint256 requestTime);
    event PaymentConfirmed(address indexed worker, uint256 amount);

    modifier onlyEmployer() {
        require(msg.sender == employer, "Only employer");
        _;
    }

    modifier onlyAdmin() {
        require(msg.sender == ADMIN, "Only admin");
        _;
    }

    modifier jobNotCancelled() {
        require(!jobCancelled, "Job has been cancelled");
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

    function requestWeeklyPayment() external jobNotCancelled {
        require(payType == PayType.WEEKLY, "Not weekly");
        require(isWorker[msg.sender], "Not assigned");
        require(activeWorker[msg.sender], "Inactive");
        require(block.timestamp >= lastPayoutAt + 1 weeks, "Too soon");
        require(payoutsMade < durationWeeks, "All paid");
        require(!hasRequestedPayment[msg.sender], "Already requested");

        hasRequestedPayment[msg.sender] = true;
        paymentRequestTime[msg.sender] = block.timestamp;

        emit PaymentRequested(msg.sender, block.timestamp);
    }

    function confirmWeeklyPayment(address worker) external onlyEmployer nonReentrant jobNotCancelled {
        require(payType == PayType.WEEKLY, "Not weekly");
        require(isWorker[worker], "Not assigned");
        require(activeWorker[worker], "Inactive");
        require(hasRequestedPayment[worker], "No payment request");
        require(block.timestamp >= lastPayoutAt + 1 weeks, "Too soon");
        require(payoutsMade < durationWeeks, "All paid");

        lastPayoutAt = block.timestamp;
        payoutsMade++;
        hasRequestedPayment[worker] = false;

        uint256 amount = weeklyPay;
        address payable w = payable(worker);

        (bool s,) = w.call{value: amount}("");
        require(s, "Pay failed");

        reputation.updateWorker(w, 1);
        
        // Mark as completed if this is the final payout
        if (payoutsMade == durationWeeks) {
            hasCompletedJob[w] = true;
            hasReceivedAllPayments[w] = true;
        }
        
        emit PaymentConfirmed(w, amount);
        emit PaymentReleased(w, amount);
    }    

    function requestOneOffPayment() external jobNotCancelled {
        require(payType == PayType.ONE_OFF, "Not one-off");
        require(isWorker[msg.sender], "Not assigned");
        require(activeWorker[msg.sender], "Inactive");
        require(!hasRequestedPayment[msg.sender], "Already requested");

        hasRequestedPayment[msg.sender] = true;
        paymentRequestTime[msg.sender] = block.timestamp;

        emit PaymentRequested(msg.sender, block.timestamp);
    }

    function confirmOneOffPayment(address worker) external onlyEmployer nonReentrant jobNotCancelled {
        require(payType == PayType.ONE_OFF, "Not one-off");
        require(isWorker[worker], "Not assigned");
        require(activeWorker[worker], "Inactive");
        require(hasRequestedPayment[worker], "No payment request");

        hasRequestedPayment[worker] = false;

        uint256 amount = totalPay;
        address payable w = payable(worker);

        (bool s,) = w.call{value: amount}("");
        require(s, "Pay failed");

        reputation.updateWorker(w, 1);
        hasCompletedJob[w] = true;
        hasReceivedAllPayments[w] = true;
        
        emit PaymentConfirmed(w, amount);
        emit OneOffPayment(w, amount);
        emit JobCompleted(w);
    }    

    function cancelJob() external onlyEmployer nonReentrant {
        require(!jobCancelled, "Job already cancelled");
        require(assignedWorkers.length == 0, "Cannot cancel job with assigned workers");
        require(payoutsMade == 0, "Cannot cancel job with payments made");

        jobCancelled = true;
        uint256 refundAmount = address(this).balance;

        if (refundAmount > 0) {
            (bool success, ) = payable(employer).call{value: refundAmount}("");
            require(success, "Refund failed");
        }

        emit JobCancelled(refundAmount);
    }

    function canCancelJob() external view returns (bool) {
        return !jobCancelled && 
               assignedWorkers.length == 0 && 
               payoutsMade == 0;
    }

    function rateWorker(
    address worker,
    uint8 score
    ) external onlyEmployer jobNotCancelled {
        require(isWorker[worker], "Not a worker");
        require(hasReceivedAllPayments[worker] || jobEnded, "Worker hasn't received all payments");
        require(!employerHasRatedWorker[worker], "Already rated this worker");
        require(score >= 1 && score <= 5, "Score must be 1-5");

        employerHasRatedWorker[worker] = true;
        reputation.submitRating(worker, score);
        
        emit RatingSubmitted(msg.sender, worker, score);
    }

    function rateEmployer(
        uint8 score
    ) external jobNotCancelled {
        require(isWorker[msg.sender], "Not a worker");
        require(employerHasRatedWorker[msg.sender] || jobEnded, "Employer hasn't rated you yet");
        require(!hasRatedEmployer[msg.sender], "Already rated employer");
        require(score >= 1 && score <= 5, "Score must be 1-5");

        hasRatedEmployer[msg.sender] = true;
        reputation.submitRating(employer, score);
        
        emit RatingSubmitted(msg.sender, employer, score);
    }

    function endJob() external onlyEmployer jobNotCancelled {
        jobEnded = true;
        emit JobEnded();
    }

    function canRateWorker(address worker) external view returns (bool) {
        return !jobCancelled &&
            isWorker[worker] && 
            (hasReceivedAllPayments[worker] || jobEnded) && 
            !employerHasRatedWorker[worker];
    }

    function canRateEmployer(address worker) external view returns (bool) {
        return !jobCancelled &&
            isWorker[worker] && 
            (employerHasRatedWorker[worker] || jobEnded) && 
            !hasRatedEmployer[worker];
    }

    // ==================== APPLICANT FUNCTIONS ====================

    function submitApplication(string memory _application) external jobNotCancelled {
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

    function acceptApplication(address applicant) external onlyEmployer jobNotCancelled {
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

    function declineApplication(address applicant) external onlyEmployer jobNotCancelled {
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

    function batchDeclineApplications(address[] memory applicantList) external onlyEmployer jobNotCancelled {
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

    function batchAcceptApplications(address[] memory applicantList) external onlyEmployer jobNotCancelled {
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

    function getReviewedApplicationsCount() external view returns (uint256) {
        uint256 count = 0;
        for (uint256 i = 0; i < applicantAddresses.length; i++) {
            if (applicants[applicantAddresses[i]].status == ApplicationStatus.REVIEWED) {
                count++;
            }
        }
        return count;
    }

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

    function assignWorkerDirect(address worker) external onlyEmployer jobNotCancelled {
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

    function setActive(bool active) external jobNotCancelled {
        require(isWorker[msg.sender], "Not worker");
        activeWorker[msg.sender] = active;
    }

    function getPaymentRequestStatus(address worker) external view returns (bool hasRequested, uint256 requestTime) {
        return (hasRequestedPayment[worker], paymentRequestTime[worker]);
    }

    function getPendingPaymentRequests() external view returns (address[] memory) {
        uint256 count = 0;
        for (uint256 i = 0; i < assignedWorkers.length; i++) {
            if (hasRequestedPayment[assignedWorkers[i]]) {
                count++;
            }
        }
        
        address[] memory pending = new address[](count);
        uint256 index = 0;
        for (uint256 i = 0; i < assignedWorkers.length; i++) {
            if (hasRequestedPayment[assignedWorkers[i]]) {
                pending[index] = assignedWorkers[i];
                index++;
            }
        }
        
        return pending;
    }

    function openDispute(string calldata reason) external jobNotCancelled {
        uint256 id = disputeDAO.createDispute(address(this), reason);
        emit DisputeOpened(msg.sender, id, reason);
    }
}
