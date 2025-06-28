// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./ReputationSystem.sol";
import "./DisputeDAO.sol";

contract ProofOfWorkJob is ReentrancyGuard {
    enum PayType { WEEKLY, ONE_OFF }
    enum ApplicationStatus { PENDING, REVIEWED, REJECTED, ACCEPTED }
    enum PaymentRequestStatus { NONE, PENDING, APPROVED, REJECTED }

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

    mapping(address => bool) public hasCompletedJob;
    mapping(address => bool) public hasRatedEmployer;
    mapping(address => bool) public employerHasRatedWorker;
    
    bool public jobEnded = false;
    bool public jobCancelled = false;

    struct PaymentRequest {
        address worker;
        uint256 amount;
        uint256 requestedAt;
        uint256 weekNumber;
        string workDescription;
        PaymentRequestStatus status;
        uint256 processedAt;
        string rejectionReason;
    }

    mapping(address => PaymentRequest) public currentPaymentRequest;
    mapping(address => mapping(uint256 => bool)) public weeklyPaymentClaimed;
    mapping(address => bool) public oneOffPaymentClaimed;
    
    PaymentRequest[] public paymentRequestHistory;

    struct Applicant {
        address applicantAddress;
        string application;
        uint256 appliedAt;
        bool isActive;
        ApplicationStatus status;
        uint256 reviewedAt;
        bool wasAccepted;
    }

    address[] public applicantAddresses;
    mapping(address => Applicant) public applicants;
    mapping(address => bool) public hasApplied;

    address[] public assignedWorkers;
    mapping(address => bool) public isWorker;
    mapping(address => bool) public activeWorker;

    address public constant ADMIN = 0xA0c5048c32870bB66d0BE861643cD6Bb5F66Ada2;

    event ApplicationSubmitted(address indexed applicant, string application);
    event ApplicationWithdrawn(address indexed applicant);
    event ApplicationAccepted(address indexed applicant);
    event ApplicationDeclined(address indexed applicant);
    event WorkerAssigned(address indexed worker);
    event PaymentRequested(address indexed worker, uint256 amount, uint256 weekNumber, string workDescription);
    event PaymentRequestApproved(address indexed worker, uint256 amount);
    event PaymentRequestRejected(address indexed worker, string reason);
    event PaymentReleased(address indexed worker, uint256 amount);
    event OneOffPayment(address indexed worker, uint256 amount);
    event JobCompleted(address indexed worker);
    event DisputeOpened(address indexed by, uint256 disputeId, string reason);
    event RatingSubmitted(address indexed rater, address indexed ratee, uint8 score);
    event JobEnded();
    event JobCancelled(uint256 refundAmount);

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

        for (uint i = 0; i < _tags.length; i++) {
            tags.push(_tags[i]);
        }        

        reputation = new ReputationSystem{value: 0}(address(this));
        disputeDAO = DisputeDAO(_disputeDAO);
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
        require(hasCompletedJob[worker] || jobEnded, "Worker hasn't completed job");
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
        require(hasCompletedJob[msg.sender] || jobEnded, "Haven't completed job");
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
               (hasCompletedJob[worker] || jobEnded) && 
               !employerHasRatedWorker[worker];
    }

    function canRateEmployer(address worker) external view returns (bool) {
        return !jobCancelled &&
               isWorker[worker] && 
               (hasCompletedJob[worker] || jobEnded) && 
               !hasRatedEmployer[worker];
    }

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

    function acceptApplication(address applicant) external onlyEmployer jobNotCancelled {
        require(hasApplied[applicant], "No application found");
        require(applicants[applicant].isActive, "Application not active");
        require(!isWorker[applicant], "Already assigned as worker");
        require(assignedWorkers.length < positions, "Max positions filled");

        applicants[applicant].status = ApplicationStatus.REVIEWED;
        applicants[applicant].reviewedAt = block.timestamp;
        applicants[applicant].isActive = false;
        applicants[applicant].wasAccepted = true;

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

        applicants[applicant].status = ApplicationStatus.REVIEWED;
        applicants[applicant].reviewedAt = block.timestamp;
        applicants[applicant].isActive = false;
        applicants[applicant].wasAccepted = false;

        emit ApplicationDeclined(applicant);
    }

    function getApplicationsByStatus(ApplicationStatus status) external view returns (address[] memory) {
        uint256 count = 0;
        for (uint256 i = 0; i < applicantAddresses.length; i++) {
            if (applicants[applicantAddresses[i]].status == status) {
                count++;
            }
        }

        address[] memory result = new address[](count);
        uint256 index = 0;
        for (uint256 i = 0; i < applicantAddresses.length; i++) {
            address applicantAddr = applicantAddresses[i];
            if (applicants[applicantAddr].status == status) {
                result[index] = applicantAddr;
                index++;
            }
        }
        return result;
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

    function getActiveApplicationsCount() external view returns (uint256) {
        uint256 count = 0;
        for (uint256 i = 0; i < applicantAddresses.length; i++) {
            if (applicants[applicantAddresses[i]].isActive && !isWorker[applicantAddresses[i]]) {
                count++;
            }
        }
        return count;
    }

    function assignWorkerDirect(address worker) external onlyEmployer jobNotCancelled {
        require(worker != address(0), "Bad worker");
        require(!isWorker[worker], "Already assigned");
        require(assignedWorkers.length < positions, "Max positions filled");

        isWorker[worker] = true;
        activeWorker[worker] = true;
        assignedWorkers.push(worker);

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

    function requestWeeklyPayment(string memory workDescription) external jobNotCancelled {
        require(payType == PayType.WEEKLY, "Not weekly job");
        require(isWorker[msg.sender], "Not assigned worker");
        require(activeWorker[msg.sender], "Inactive worker");
        require(currentPaymentRequest[msg.sender].status == PaymentRequestStatus.NONE, "Pending request exists");
        require(block.timestamp >= lastPayoutAt + 1 weeks, "Too soon for next payment");
        require(payoutsMade < durationWeeks, "All payments completed");
        require(bytes(workDescription).length > 0, "Work description required");

        uint256 currentWeek = payoutsMade + 1;
        require(!weeklyPaymentClaimed[msg.sender][currentWeek], "Week already claimed");

        currentPaymentRequest[msg.sender] = PaymentRequest({
            worker: msg.sender,
            amount: weeklyPay,
            requestedAt: block.timestamp,
            weekNumber: currentWeek,
            workDescription: workDescription,
            status: PaymentRequestStatus.PENDING,
            processedAt: 0,
            rejectionReason: ""
        });

        emit PaymentRequested(msg.sender, weeklyPay, currentWeek, workDescription);
    }

    function requestOneOffPayment(string memory workDescription) external jobNotCancelled {
        require(payType == PayType.ONE_OFF, "Not one-off job");
        require(isWorker[msg.sender], "Not assigned worker");
        require(activeWorker[msg.sender], "Inactive worker");
        require(currentPaymentRequest[msg.sender].status == PaymentRequestStatus.NONE, "Pending request exists");
        require(!oneOffPaymentClaimed[msg.sender], "Payment already claimed");
        require(bytes(workDescription).length > 0, "Work description required");

        currentPaymentRequest[msg.sender] = PaymentRequest({
            worker: msg.sender,
            amount: totalPay,
            requestedAt: block.timestamp,
            weekNumber: 0,
            workDescription: workDescription,
            status: PaymentRequestStatus.PENDING,
            processedAt: 0,
            rejectionReason: ""
        });

        emit PaymentRequested(msg.sender, totalPay, 0, workDescription);
    }

    function approvePaymentRequest(address worker) external onlyEmployer nonReentrant jobNotCancelled {
        require(isWorker[worker], "Not assigned worker");
        require(currentPaymentRequest[worker].status == PaymentRequestStatus.PENDING, "No pending request");

        PaymentRequest storage request = currentPaymentRequest[worker];
        request.status = PaymentRequestStatus.APPROVED;
        request.processedAt = block.timestamp;

        uint256 amount = request.amount;
        
        if (payType == PayType.WEEKLY) {
            require(block.timestamp >= lastPayoutAt + 1 weeks, "Too soon for payment");
            require(payoutsMade < durationWeeks, "All payments completed");
            require(!weeklyPaymentClaimed[worker][request.weekNumber], "Week already claimed");
            
            weeklyPaymentClaimed[worker][request.weekNumber] = true;
            lastPayoutAt = block.timestamp;
            payoutsMade++;
            
            if (payoutsMade == durationWeeks) {
                hasCompletedJob[worker] = true;
            }
        } else {
            require(!oneOffPaymentClaimed[worker], "Payment already claimed");
            oneOffPaymentClaimed[worker] = true;
            hasCompletedJob[worker] = true;
        }

        (bool success, ) = payable(worker).call{value: amount}("");
        require(success, "Payment transfer failed");

        reputation.updateWorker(worker, 1);

        paymentRequestHistory.push(request);
        delete currentPaymentRequest[worker];

        emit PaymentRequestApproved(worker, amount);
        emit PaymentReleased(worker, amount);
        
        if (payType == PayType.ONE_OFF) {
            emit OneOffPayment(worker, amount);
            emit JobCompleted(worker);
        }
    }

    function rejectPaymentRequest(address worker, string memory reason) external onlyEmployer jobNotCancelled {
        require(isWorker[worker], "Not assigned worker");
        require(currentPaymentRequest[worker].status == PaymentRequestStatus.PENDING, "No pending request");
        require(bytes(reason).length > 0, "Rejection reason required");

        PaymentRequest storage request = currentPaymentRequest[worker];
        request.status = PaymentRequestStatus.REJECTED;
        request.processedAt = block.timestamp;
        request.rejectionReason = reason;

        paymentRequestHistory.push(request);
        delete currentPaymentRequest[worker];

        emit PaymentRequestRejected(worker, reason);
    }

    function cancelPaymentRequest() external jobNotCancelled {
        require(isWorker[msg.sender], "Not assigned worker");
        require(currentPaymentRequest[msg.sender].status == PaymentRequestStatus.PENDING, "No pending request");

        delete currentPaymentRequest[msg.sender];
    }

    function getPendingPaymentRequests() external view returns (address[] memory) {
        uint256 count = 0;
        for (uint256 i = 0; i < assignedWorkers.length; i++) {
            address worker = assignedWorkers[i];
            if (currentPaymentRequest[worker].status == PaymentRequestStatus.PENDING) {
                count++;
            }
        }

        address[] memory pendingWorkers = new address[](count);
        uint256 index = 0;
        for (uint256 i = 0; i < assignedWorkers.length; i++) {
            address worker = assignedWorkers[i];
            if (currentPaymentRequest[worker].status == PaymentRequestStatus.PENDING) {
                pendingWorkers[index] = worker;
                index++;
            }
        }

        return pendingWorkers;
    }

    function canRequestPayment(address worker) external view returns (bool, string memory) {
        if (!isWorker[worker]) {
            return (false, "Not assigned worker");
        }
        
        if (!activeWorker[worker]) {
            return (false, "Inactive worker");
        }
        
        if (currentPaymentRequest[worker].status == PaymentRequestStatus.PENDING) {
            return (false, "Payment request already pending");
        }
        
        if (payType == PayType.WEEKLY) {
            if (block.timestamp < lastPayoutAt + 1 weeks) {
                return (false, "Too soon for next weekly payment");
            }
            if (payoutsMade >= durationWeeks) {
                return (false, "All weekly payments completed");
            }
            uint256 nextWeek = payoutsMade + 1;
            if (weeklyPaymentClaimed[worker][nextWeek]) {
                return (false, "Week already claimed");
            }
        } else {
            if (oneOffPaymentClaimed[worker]) {
                return (false, "One-off payment already claimed");
            }
        }
        
        return (true, "Can request payment");
    }

    function setActive(bool active) external jobNotCancelled {
        require(isWorker[msg.sender], "Not worker");
        activeWorker[msg.sender] = active;
    }

    function openDispute(string calldata reason) external jobNotCancelled {
        uint256 id = disputeDAO.createDispute(address(this), reason);
        emit DisputeOpened(msg.sender, id, reason);
    }

    function getJobSummary() external view returns (
        address jobEmployer,
        PayType jobPayType,
        uint256 jobWeeklyPay,
        uint256 jobTotalPay,
        uint256 jobDurationWeeks,
        uint256 jobPositions,
        uint256 jobPayoutsMade,
        bool jobIsEnded,
        bool jobIsCancelled,
        uint256 jobCreatedAt
    ) {
        return (
            employer,
            payType,
            weeklyPay,
            totalPay,
            durationWeeks,
            positions,
            payoutsMade,
            jobEnded,
            jobCancelled,
            createdAt
        );
    }

    function getWorkerStatus(address worker) external view returns (
        bool isAssignedWorker,
        bool isActiveWorker,
        bool hasCompleted,
        bool hasRatedEmployerBool,
        bool employerHasRatedWorkerBool,
        PaymentRequestStatus currentRequestStatus
    ) {
        return (
            isWorker[worker],
            activeWorker[worker],
            hasCompletedJob[worker],
            hasRatedEmployer[worker],
            employerHasRatedWorker[worker],
            currentPaymentRequest[worker].status
        );
    }

    function getPaymentStatus(address worker) external view returns (
        bool canRequest,
        uint256 nextWeekNumber,
        bool hasClaimedOneOff,
        uint256 totalWeeksClaimed
    ) {
        (bool canReq, ) = this.canRequestPayment(worker);
        uint256 weeksClaimed = 0;
        if (payType == PayType.WEEKLY) {
            for (uint256 i = 1; i <= durationWeeks; i++) {
                if (weeklyPaymentClaimed[worker][i]) {
                    weeksClaimed++;
                }
            }
        }
        return (
            canReq,
            payoutsMade + 1,
            oneOffPaymentClaimed[worker],
            weeksClaimed
        );
    }

    function getContractBalance() external view returns (uint256) {
        return address(this).balance;
    }

    function getTags() external view returns (string[] memory) {
        return tags;
    }

    function getRemainingPayment() external view returns (uint256) {
        if (payType == PayType.WEEKLY) {
            uint256 remainingWeeks = durationWeeks - payoutsMade;
            return remainingWeeks * weeklyPay;
        } else {
            for (uint256 i = 0; i < assignedWorkers.length; i++) {
                if (oneOffPaymentClaimed[assignedWorkers[i]]) {
                    return 0;
                }
            }
            return totalPay;
        }
    }

    function emergencyWithdraw() external onlyAdmin nonReentrant {
        uint256 balance = address(this).balance;
        require(balance > 0, "No funds to withdraw");
        
        (bool success, ) = payable(ADMIN).call{value: balance}("");
        require(success, "Emergency withdrawal failed");
    }

    receive() external payable {
    }
}
