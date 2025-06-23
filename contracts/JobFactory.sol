// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./ProofOfWorkJob.sol";

contract JobFactory is ReentrancyGuard {
    address public admin;
    address payable public feeRecipient = payable(0xA0c5048c32870bB66d0BE861643cD6Bb5F66Ada2);
    address public disputeDAOAddress;
    address[] public allJobs;
    
    // Minimum job posting amount (5 KAS)
    uint256 public constant MINIMUM_JOB_AMOUNT = 5 ether;

    event JobCreated(address indexed jobAddress, address indexed employer);
    event MinimumJobAmountUpdated(uint256 newAmount);

    modifier onlyAdmin() {
        require(msg.sender == admin, "Not admin");
        _;
    }

    constructor(address _admin, address _disputeDAO) {
        admin = _admin;
        disputeDAOAddress = _disputeDAO;
    }

    /**
     * @dev Create a new job posting
     * @param _employer Address of the employer
     * @param _payType Type of payment (0 = WEEKLY, 1 = ONE_OFF)
     * @param _weeklyPay Weekly payment amount (for weekly jobs)
     * @param _durationWeeks Duration in weeks (for weekly jobs)
     * @param _totalPay Total payment amount
     * @param _title Job title
     * @param _description Job description
     * @param _positions Number of positions available
     * @param _tags Array of job tags
     */
    function createJob(
        address _employer,
        uint8 _payType,
        uint256 _weeklyPay,
        uint256 _durationWeeks,
        uint256 _totalPay,
        string memory _title,
        string memory _description,
        uint256 _positions,
        string[] memory _tags
    ) external payable returns (address) {
        require(_totalPay >= MINIMUM_JOB_AMOUNT, "Job amount below minimum");
        
        uint256 fee = (_totalPay * 75) / 10000; // 0.75% fee
        require(msg.value == _totalPay + fee, "Incorrect payment");

        // Send fee to fee recipient
        (bool sent, ) = feeRecipient.call{value: fee}("");
        require(sent, "Fee payment failed");

        // Create new job contract with the total pay amount
        ProofOfWorkJob job = (new ProofOfWorkJob){value: _totalPay}(
            _employer,
            _payType,
            _weeklyPay,
            _durationWeeks,
            _totalPay,
            _title,
            _description,
            _positions,
            disputeDAOAddress,
            _tags
        );

        allJobs.push(address(job));
        emit JobCreated(address(job), _employer);
        return address(job);
    }

    /**
     * @dev Get all created jobs
     */
    function getAllJobs() external view returns (address[] memory) {
        return allJobs;
    }

    /**
     * @dev Get the current minimum job amount
     */
    function getMinimumJobAmount() external pure returns (uint256) {
        return MINIMUM_JOB_AMOUNT;
    }

    /**
     * @dev Calculate the total cost for creating a job (including fee)
     * @param _totalPay The total payment amount for the job
     * @return totalCost The total cost including fee
     * @return fee The fee amount
     */
    function calculateJobCost(uint256 _totalPay) external pure returns (uint256 totalCost, uint256 fee) {
        require(_totalPay >= MINIMUM_JOB_AMOUNT, "Job amount below minimum");
        
        fee = (_totalPay * 75) / 10000; // 0.75% fee
        totalCost = _totalPay + fee;
        
        return (totalCost, fee);
    }

    /**
     * @dev Get total number of jobs created
     */
    function getTotalJobsCount() external view returns (uint256) {
        return allJobs.length;
    }

    /**
     * @dev Update admin address (only current admin)
     * @param _newAdmin New admin address
     */
    function updateAdmin(address _newAdmin) external onlyAdmin {
        require(_newAdmin != address(0), "Invalid admin address");
        admin = _newAdmin;
    }

    /**
     * @dev Update fee recipient address (only admin)
     * @param _newFeeRecipient New fee recipient address
     */
    function updateFeeRecipient(address payable _newFeeRecipient) external onlyAdmin {
        require(_newFeeRecipient != address(0), "Invalid fee recipient address");
        feeRecipient = _newFeeRecipient;
    }

    /**
     * @dev Update dispute DAO address (only admin)
     * @param _newDisputeDAO New dispute DAO address
     */
    function updateDisputeDAO(address _newDisputeDAO) external onlyAdmin {
        require(_newDisputeDAO != address(0), "Invalid dispute DAO address");
        disputeDAOAddress = _newDisputeDAO;
    }
}
