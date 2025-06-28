// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./ReputationSystem.sol";
import "./DisputeDAO.sol";

contract ProofOfWorkJob is ReentrancyGuard {
    enum PayType { WEEKLY, ONE_OFF }
    enum ApplicationStatus { PENDING, REVIEWED, REJECTED, ACCEPTED }
    enum PaymentRequestStatus { NONE, PENDING, APPROVED, REJECTED }

    // Custom Errors
    error OnlyEmployer();
    error OnlyAdmin();
    error JobCancelled();
    error JobAlreadyCancelled();
    error CannotCancelWithWorkers();
    error CannotCancelWithPayments();
    error RefundFailed();
    error NotAWorker();
    error WorkerNotCompleted();
    error AlreadyRated();
    error InvalidScore();
    error NotAssignedWorker();
    error NotCompletedJob();
    error EmptyApplication();
    error AlreadyApplied();
    error AlreadyWorker();
    error PositionsFilled();
    error NoApplication();
    error ApplicationNotActive();
    error MaxPositionsFilled();
    error BadWorker();
    error AlreadyAssigned();
    error NotWeeklyJob();
    error InactiveWorker();
    error PendingRequestExists();
    error TooSoonForPayment();
    error AllPaymentsCompleted();
    error WorkDescriptionRequired();
    error WeekAlreadyClaimed();
    error NotOneOffJob();
    error PaymentAlreadyClaimed();
    error NoPendingRequest();
    error RejectionReasonRequired();
    error PaymentTransferFailed();
    error NoFundsToWithdraw();
    error EmergencyWithdrawalFailed();

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
    event JobWasCancelled(uint256 refundAmount);

    modifier onlyEmployer() {
        if (msg.sender != employer) revert OnlyEmployer();
        _;
    }

    modifier onlyAdmin() {
        if (msg.sender != ADMIN) revert OnlyAdmin();
        _;
    }

    modifier jobNotCancelled() {
        if (jobCancelled) revert JobCancelled();
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
        if (jobCancelled) revert JobAlreadyCancelled();
        if (assignedWorkers.length != 0) revert CannotCancelWithWorkers();
        if (payoutsMade != 0) revert CannotCancelWithPayments();

        jobCancelled = true;
        uint256 refundAmount = address(this).balance;

        if (refundAmount > 0) {
            (bool success, ) = payable(employer).call{value: refundAmount}("");
            if (!success) revert RefundFailed();
        }

        emit JobWasCancelled(refundAmount);
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
        if (!isWorker[worker]) revert NotAWorker();
        if (!hasCompletedJob[worker] && !jobEnded) revert WorkerNotCompleted();
        if (employerHasRatedWorker[worker]) revert AlreadyRated();
        if (score < 1 || score > 5) revert InvalidScore();

        employerHasRatedWorker[worker] = true;
        reputation.submitRating(worker, score);
        
        emit RatingSubmitted(msg.sender, worker, score);
    }

    function rateEmployer(
        uint8 score
    ) external jobNotCancelled {
        if (!isWorker[msg.sender]) revert NotAWorker();
        if (!hasCompletedJob[msg.sender] && !jobEnded) revert NotCompletedJob();
        if (hasRatedEmployer[msg.sender]) revert AlreadyRated();
        if (score < 1 || score > 5) revert InvalidScore();

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
        if (bytes(_application).length == 0) revert EmptyApplication();
        if (hasApplied[msg.sender]) revert AlreadyApplied();
        if (isWorker[msg.sender]) revert AlreadyWorker();
        if (assignedWorkers.length >= positions) revert PositionsFilled();

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
        if (!hasApplied[msg.sender]) revert NoApplication();
        if (!applicants[msg.sender].isActive) revert ApplicationNotActive();
        if (isWorker[msg.sender]) revert AlreadyWorker();

        applicants[msg.sender].isActive = false;

        emit ApplicationWithdrawn(msg.sender);
    }

    function acceptApplication(address applicant) external onlyEmployer jobNotCancelled {
        if (!hasApplied[applicant]) revert NoApplication();
        if (!applicants[applicant].isActive) revert ApplicationNotActive();
        if (isWorker[applicant]) revert AlreadyWorker();
        if (assignedWorkers.length >= positions) revert MaxPositionsFilled();

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
        if (!hasApplied[applicant]) revert NoApplication();
        if (!applicants[applicant].isActive) revert ApplicationNotActive();
        if (isWorker[applicant]) revert AlreadyWorker();

        applicants[applicant].status = ApplicationStatus.REVIEWED;
        applicants[applicant].reviewedAt = block.timestamp;
        applicants[applicant].isActive = false;
        applicants[applicant].wasAccepted = false;

        emit ApplicationDeclined(applicant);
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

    function getApplicationStatusString(address _applicant) external view returns (string memory) {
        if (!hasApplied[_applicant]) revert NoApplication();
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
        if (worker == address(0)) revert BadWorker();
        if (isWorker[worker]) revert AlreadyAssigned();
        if (assignedWorkers.length >= positions) revert MaxPositionsFilled();

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
        if (payType != PayType.WEEKLY) revert NotWeeklyJob();
        if (!isWorker[msg.sender]) revert NotAssignedWorker();
        if (!activeWorker[msg.sender]) revert InactiveWorker();
        if (currentPaymentRequest[msg.sender].status != PaymentRequestStatus.NONE) revert PendingRequestExists();
        if (block.timestamp < lastPayoutAt + 1 weeks) revert TooSoonForPayment();
        if (payoutsMade >= durationWeeks) revert AllPaymentsCompleted();
        if (bytes(workDescription).length == 0) revert WorkDescriptionRequired();

        uint256 currentWeek = payoutsMade + 1;
        if (weeklyPaymentClaimed[msg.sender][currentWeek]) revert WeekAlreadyClaimed();

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
        if (payType != PayType.ONE_OFF) revert NotOneOffJob();
        if (!isWorker[msg.sender]) revert NotAssignedWorker();
        if (!activeWorker[msg.sender]) revert InactiveWorker();
        if (currentPaymentRequest[msg.sender].status != PaymentRequestStatus.NONE) revert PendingRequestExists();
        if (oneOffPaymentClaimed[msg.sender]) revert PaymentAlreadyClaimed();
        if (bytes(workDescription).length == 0) revert WorkDescriptionRequired();

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
        if (!isWorker[worker]) revert NotAssignedWorker();
        if (currentPaymentRequest[worker].status != PaymentRequestStatus.PENDING) revert NoPendingRequest();

        PaymentRequest storage request = currentPaymentRequest[worker];
        request.status = PaymentRequestStatus.APPROVED;
        request.processedAt = block.timestamp;

        uint256 amount = request.amount;
        
        if (payType == PayType.WEEKLY) {
            if (block.timestamp < lastPayoutAt + 1 weeks) revert TooSoonForPayment();
            if (payoutsMade >= durationWeeks) revert AllPaymentsCompleted();
            if (weeklyPaymentClaimed[worker][request.weekNumber]) revert WeekAlreadyClaimed();
            
            weeklyPaymentClaimed[worker][request.weekNumber] = true;
            lastPayoutAt = block.timestamp;
            payoutsMade++;
            
            if (payoutsMade == durationWeeks) {
                hasCompletedJob[worker] = true;
            }
        } else {
            if (oneOffPaymentClaimed[worker]) revert PaymentAlreadyClaimed();
            oneOffPaymentClaimed[worker] = true;
            hasCompletedJob[worker] = true;
        }

        (bool success, ) = payable(worker).call{value: amount}("");
        if (!success) revert PaymentTransferFailed();

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
        if (!isWorker[worker]) revert NotAssignedWorker();
        if (currentPaymentRequest[worker].status != PaymentRequestStatus.PENDING) revert NoPendingRequest();
        if (bytes(reason).length == 0) revert RejectionReasonRequired();

        PaymentRequest storage request = currentPaymentRequest[worker];
        request.status = PaymentRequestStatus.REJECTED;
        request.processedAt = block.timestamp;
        request.rejectionReason = reason;

        paymentRequestHistory.push(request);
        delete currentPaymentRequest[worker];

        emit PaymentRequestRejected(worker, reason);
    }

    function cancelPaymentRequest() external jobNotCancelled {
        if (!isWorker[msg.sender]) revert NotAssignedWorker();
        if (currentPaymentRequest[msg.sender].status != PaymentRequestStatus.PENDING) revert NoPendingRequest();

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
        if (!isWorker[msg.sender]) revert NotAWorker();
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
        if (balance == 0) revert NoFundsToWithdraw();
        
        (bool success, ) = payable(ADMIN).call{value: balance}("");
        if (!success) revert EmergencyWithdrawalFailed();
    }

    receive() external payable {
    }
}
