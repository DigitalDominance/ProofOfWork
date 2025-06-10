// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./ProofOfWorkJob.sol";

/// @notice Factory that deploys and tracks all ProofOfWorkJob instances
contract JobFactory is Ownable, ReentrancyGuard {
    event JobCreated(address indexed jobAddress, address indexed employer);

    /// @dev platform fee in basis points (75 = 0.75%)
    uint256 public constant PLATFORM_FEE_BPS = 75;
    address payable public feeRecipient;

    /// @notice All jobs ever created
    address[] public allJobs;
    /// @notice Jobs mapped by employer address
    mapping(address => address[]) public jobsByEmployer;

    /// @param _feeRecipient where fees will accrue
    constructor(address payable _feeRecipient)
        Ownable(msg.sender)
    {
        require(_feeRecipient != address(0), "Bad fee recipient");
        feeRecipient = _feeRecipient;
    }

    /// @notice Update where platform fees accrue
    function setFeeRecipient(address payable _receiver) external onlyOwner {
        require(_receiver != address(0), "Bad address");
        feeRecipient = _receiver;
    }

    /** @notice Create a new job
      * @dev Employer must include locked funds + platform fee
      */
    function createJob(
        uint8 payType,
        uint256 weeklyPay,
        uint256 durationWeeks,
        uint256 totalPay,
        string calldata title,
        string calldata description,
        uint256 numPositions
    )
        external
        payable
        nonReentrant
        returns (address)
    {
        // Calculate lock and fee
        uint256 lockAmount = payType == 0 ? weeklyPay * durationWeeks : totalPay;
        uint256 fee = (lockAmount * PLATFORM_FEE_BPS) / 10000;
        require(msg.value == lockAmount + fee, "Incorrect funds + fee");

        // Transfer platform fee
        (bool sent,) = feeRecipient.call{value: fee}("");
        require(sent, "Fee transfer failed");

        // Deploy job with lockAmount
        ProofOfWorkJob job = new ProofOfWorkJob{value: lockAmount}(
            msg.sender,
            payType,
            weeklyPay,
            durationWeeks,
            totalPay,
            title,
            description,
            numPositions
        );
        address jobAddr = address(job);

        allJobs.push(jobAddr);
        jobsByEmployer[msg.sender].push(jobAddr);

        emit JobCreated(jobAddr, msg.sender);
        return jobAddr;
    }

    /// @notice Total jobs count
    function totalJobs() external view returns (uint256) {
        return allJobs.length;
    }

    /// @notice Jobs by employer
    function getJobsByEmployer(address employer) external view returns (address[] memory) {
        return jobsByEmployer[employer];
    }
}
