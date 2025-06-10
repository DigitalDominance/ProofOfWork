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

    constructor(address payable _feeRecipient) {
        require(_feeRecipient != address(0), "Bad fee recipient");
        feeRecipient = _feeRecipient;
    }

    /// @notice Create a new ProofOfWorkJob
    function createJob(
        uint256 minStake,
        uint256 duration,
        uint256 reward,
        address payable worker,
        address payable employer
    ) external nonReentrant onlyOwner returns (address) {
        ProofOfWorkJob job = new ProofOfWorkJob(
            minStake,
            duration,
            reward,
            worker,
            employer,
            feeRecipient
        );
        address jobAddr = address(job);
        jobsByEmployer[msg.sender].push(jobAddr);
        allJobs.push(jobAddr);
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

    // Internal storage
    address[] internal allJobs;
    mapping(address => address[]) internal jobsByEmployer;
}
