// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./ProofOfWorkJob.sol";

contract ZKResume is ReentrancyGuard {
    struct WorkRecord {
        address jobContract;
        address employer;
        string title;
        string description;
        string[] tags;
        uint256 totalPay;
        uint256 durationWeeks;
        uint8 payType; // 0 = WEEKLY, 1 = ONE_OFF
        uint256 startedAt;
        uint256 completedAt;
        uint8 employerRating; // 1-5 scale, 0 means not rated
        uint8 workerRating; // Worker's rating of the employer
        bool isVerified;
        uint256 recordId;
    }

    struct WorkerStats {
        uint256 totalJobsCompleted;
        uint256 totalEarnings;
        uint256 totalWeeksWorked;
        uint256 averageRating; // Stored as rating * 100 for precision
        uint256 totalRatings;
        string[] skillTags; // Unique tags from completed jobs
        uint256 firstJobDate;
        uint256 lastJobDate;
    }

    // Mappings
    mapping(address => WorkRecord[]) public workerRecords;
    mapping(address => WorkerStats) public workerStats;
    mapping(address => mapping(address => bool)) public hasJobRecord; // worker => jobContract => bool
    mapping(address => bool) public authorizedJobs; // Jobs authorized to add records
    mapping(address => uint256) public nextRecordId;

    // Admin and factory addresses
    address public admin;
    address public jobFactory;

    // Events
    event WorkRecordAdded(
        address indexed worker,
        address indexed jobContract,
        address indexed employer,
        uint256 recordId
    );
    event WorkRecordVerified(address indexed worker, uint256 recordId);
    event JobAuthorized(address indexed jobContract);
    event JobDeauthorized(address indexed jobContract);
    event StatsUpdated(address indexed worker);

    modifier onlyAdmin() {
        require(msg.sender == admin, "Only admin");
        _;
    }

    modifier onlyJobFactory() {
        require(msg.sender == jobFactory, "Only job factory");
        _;
    }

    modifier onlyAuthorizedJob() {
        require(authorizedJobs[msg.sender], "Job not authorized");
        _;
    }

    constructor(address _admin, address _jobFactory) {
        admin = _admin;
        jobFactory = _jobFactory;
    }

    // ==================== ADMIN FUNCTIONS ====================

    function updateAdmin(address _newAdmin) external onlyAdmin {
        require(_newAdmin != address(0), "Invalid admin address");
        admin = _newAdmin;
    }

    function updateJobFactory(address _newJobFactory) external onlyAdmin {
        require(_newJobFactory != address(0), "Invalid job factory address");
        jobFactory = _newJobFactory;
    }

    function authorizeJob(address _jobContract) external onlyJobFactory {
        require(_jobContract != address(0), "Invalid job contract");
        authorizedJobs[_jobContract] = true;
        emit JobAuthorized(_jobContract);
    }

    function deauthorizeJob(address _jobContract) external onlyAdmin {
        authorizedJobs[_jobContract] = false;
        emit JobDeauthorized(_jobContract);
    }

    // ==================== JOB INTEGRATION FUNCTIONS ====================

    function addWorkRecord(
        address _worker,
        address _employer,
        string memory _title,
        string memory _description,
        string[] memory _tags,
        uint256 _totalPay,
        uint256 _durationWeeks,
        uint8 _payType,
        uint256 _startedAt
    ) external onlyAuthorizedJob nonReentrant {
        require(_worker != address(0), "Invalid worker address");
        require(_employer != address(0), "Invalid employer address");
        require(!hasJobRecord[_worker][msg.sender], "Record already exists");

        uint256 recordId = nextRecordId[_worker];
        nextRecordId[_worker]++;

        WorkRecord memory newRecord = WorkRecord({
            jobContract: msg.sender,
            employer: _employer,
            title: _title,
            description: _description,
            tags: _tags,
            totalPay: _totalPay,
            durationWeeks: _durationWeeks,
            payType: _payType,
            startedAt: _startedAt,
            completedAt: block.timestamp,
            employerRating: 0,
            workerRating: 0,
            isVerified: false,
            recordId: recordId
        });

        workerRecords[_worker].push(newRecord);
        hasJobRecord[_worker][msg.sender] = true;

        // Update worker stats
        _updateWorkerStats(_worker, newRecord);

        emit WorkRecordAdded(_worker, msg.sender, _employer, recordId);
    }

    function updateRating(
        address _worker,
        uint8 _employerRating,
        uint8 _workerRating
    ) external onlyAuthorizedJob {
        require(_worker != address(0), "Invalid worker address");
        require(hasJobRecord[_worker][msg.sender], "No record found");

        // Find the record and update ratings
        WorkRecord[] storage records = workerRecords[_worker];
        for (uint256 i = 0; i < records.length; i++) {
            if (records[i].jobContract == msg.sender) {
                if (_employerRating > 0) {
                    records[i].employerRating = _employerRating;
                }
                if (_workerRating > 0) {
                    records[i].workerRating = _workerRating;
                }
                break;
            }
        }

        // Recalculate stats if employer rating was updated
        if (_employerRating > 0) {
            _recalculateWorkerStats(_worker);
        }
    }

    function verifyWorkRecord(address _worker, uint256 _recordId) external onlyAdmin {
        require(_worker != address(0), "Invalid worker address");
        require(_recordId < workerRecords[_worker].length, "Invalid record ID");

        workerRecords[_worker][_recordId].isVerified = true;
        emit WorkRecordVerified(_worker, _recordId);
    }

    // ==================== VIEW FUNCTIONS ====================

    function getWorkerRecords(address _worker) external view returns (WorkRecord[] memory) {
        return workerRecords[_worker];
    }

    function getWorkerRecord(address _worker, uint256 _recordId) external view returns (WorkRecord memory) {
        require(_recordId < workerRecords[_worker].length, "Invalid record ID");
        return workerRecords[_worker][_recordId];
    }

    function getWorkerStats(address _worker) external view returns (WorkerStats memory) {
        return workerStats[_worker];
    }

    function getWorkerRecordCount(address _worker) external view returns (uint256) {
        return workerRecords[_worker].length;
    }

    function getVerifiedRecords(address _worker) external view returns (WorkRecord[] memory) {
        WorkRecord[] storage allRecords = workerRecords[_worker];
        uint256 verifiedCount = 0;

        // Count verified records
        for (uint256 i = 0; i < allRecords.length; i++) {
            if (allRecords[i].isVerified) {
                verifiedCount++;
            }
        }

        // Create array of verified records
        WorkRecord[] memory verifiedRecords = new WorkRecord[](verifiedCount);
        uint256 index = 0;
        for (uint256 i = 0; i < allRecords.length; i++) {
            if (allRecords[i].isVerified) {
                verifiedRecords[index] = allRecords[i];
                index++;
            }
        }

        return verifiedRecords;
    }

    function getRecordsByEmployer(address _worker, address _employer) external view returns (WorkRecord[] memory) {
        WorkRecord[] storage allRecords = workerRecords[_worker];
        uint256 employerCount = 0;

        // Count records for this employer
        for (uint256 i = 0; i < allRecords.length; i++) {
            if (allRecords[i].employer == _employer) {
                employerCount++;
            }
        }

        // Create array of employer records
        WorkRecord[] memory employerRecords = new WorkRecord[](employerCount);
        uint256 index = 0;
        for (uint256 i = 0; i < allRecords.length; i++) {
            if (allRecords[i].employer == _employer) {
                employerRecords[index] = allRecords[i];
                index++;
            }
        }

        return employerRecords;
    }

    function getRecordsBySkill(address _worker, string memory _skill) external view returns (WorkRecord[] memory) {
        WorkRecord[] storage allRecords = workerRecords[_worker];
        uint256 skillCount = 0;

        // Count records with this skill
        for (uint256 i = 0; i < allRecords.length; i++) {
            if (_hasSkill(allRecords[i].tags, _skill)) {
                skillCount++;
            }
        }

        // Create array of skill records
        WorkRecord[] memory skillRecords = new WorkRecord[](skillCount);
        uint256 index = 0;
        for (uint256 i = 0; i < allRecords.length; i++) {
            if (_hasSkill(allRecords[i].tags, _skill)) {
                skillRecords[index] = allRecords[i];
                index++;
            }
        }

        return skillRecords;
    }

    function isJobAuthorized(address _jobContract) external view returns (bool) {
        return authorizedJobs[_jobContract];
    }

    // ==================== INTERNAL FUNCTIONS ====================

    function _updateWorkerStats(address _worker, WorkRecord memory _record) internal {
        WorkerStats storage stats = workerStats[_worker];
        
        stats.totalJobsCompleted++;
        stats.totalEarnings += _record.totalPay;
        stats.totalWeeksWorked += _record.durationWeeks;

        // Update first and last job dates
        if (stats.firstJobDate == 0 || _record.startedAt < stats.firstJobDate) {
            stats.firstJobDate = _record.startedAt;
        }
        if (_record.completedAt > stats.lastJobDate) {
            stats.lastJobDate = _record.completedAt;
        }

        // Update skill tags
        for (uint256 i = 0; i < _record.tags.length; i++) {
            if (!_hasSkill(stats.skillTags, _record.tags[i])) {
                stats.skillTags.push(_record.tags[i]);
            }
        }

        emit StatsUpdated(_worker);
    }

    function _recalculateWorkerStats(address _worker) internal {
        WorkRecord[] storage records = workerRecords[_worker];
        WorkerStats storage stats = workerStats[_worker];

        uint256 totalRating = 0;
        uint256 ratingCount = 0;

        for (uint256 i = 0; i < records.length; i++) {
            if (records[i].employerRating > 0) {
                totalRating += records[i].employerRating;
                ratingCount++;
            }
        }

        if (ratingCount > 0) {
            stats.averageRating = (totalRating * 100) / ratingCount; // Multiply by 100 for precision
            stats.totalRatings = ratingCount;
        }

        emit StatsUpdated(_worker);
    }

    function _hasSkill(string[] memory _skillArray, string memory _skill) internal pure returns (bool) {
        for (uint256 i = 0; i < _skillArray.length; i++) {
            if (keccak256(abi.encodePacked(_skillArray[i])) == keccak256(abi.encodePacked(_skill))) {
                return true;
            }
        }
        return false;
    }

    // ==================== INTEGRATION HELPER FUNCTIONS ====================

    function generateWorkProof(address _worker, uint256 _recordId) external view returns (bytes32) {
        require(_recordId < workerRecords[_worker].length, "Invalid record ID");
        
        WorkRecord memory record = workerRecords[_worker][_recordId];
        
        return keccak256(abi.encodePacked(
            _worker,
            record.jobContract,
            record.employer,
            record.title,
            record.totalPay,
            record.completedAt,
            record.isVerified
        ));
    }

    function verifyWorkProof(
        address _worker,
        uint256 _recordId,
        bytes32 _proof
    ) external view returns (bool) {
        if (_recordId >= workerRecords[_worker].length) {
            return false;
        }

        bytes32 generatedProof = this.generateWorkProof(_worker, _recordId);
        return generatedProof == _proof;
    }
}