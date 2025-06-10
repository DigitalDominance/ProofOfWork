// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

import "@openzeppelin/contracts/access/Ownable.sol";

/// @notice Tracks employer & worker reputation on-chain
contract ReputationSystem is Ownable {
    /// @param initialOwner The job contract that may update scores
    constructor(address initialOwner) Ownable(initialOwner) {}

    mapping(address => uint256) public workerScore;
    mapping(address => uint256) public employerScore;

    event WorkerScoreUpdated(address indexed worker, uint256 newScore);
    event EmployerScoreUpdated(address indexed employer, uint256 newScore);

    /// @notice Increment a worker’s score
    function updateWorker(address worker, uint256 delta) external onlyOwner {
        workerScore[worker] += delta;
        emit WorkerScoreUpdated(worker, workerScore[worker]);
    }

    /// @notice Increment an employer’s score
    function updateEmployer(address emp, uint256 delta) external onlyOwner {
        employerScore[emp] += delta;
        emit EmployerScoreUpdated(emp, employerScore[emp]);
    }

    /// @notice Fetch both scores in one call
    function getScores(address user) external view returns (uint256 work, uint256 emp) {
        return (workerScore[user], employerScore[user]);
    }
}
