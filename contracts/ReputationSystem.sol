// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

import "@openzeppelin/contracts/access/Ownable.sol";

/// @notice Tracks employer & worker reputation on-chain
contract ReputationSystem is Ownable {
    /// @param initialOwner the address that may call update functions
    constructor(address initialOwner)
        Ownable(initialOwner)
    {}

    mapping(address => uint256) public workerScore;
    mapping(address => uint256) public employerScore;

    event WorkerScoreUpdated(address indexed worker, uint256 newScore);
    event EmployerScoreUpdated(address indexed employer, uint256 newScore);

    function updateWorker(address worker, uint256 delta) external onlyOwner {
        workerScore[worker] += delta;
        emit WorkerScoreUpdated(worker, workerScore[worker]);
    }

    function updateEmployer(address emp, uint256 delta) external onlyOwner {
        employerScore[emp] += delta;
        emit EmployerScoreUpdated(emp, employerScore[emp]);
    }
}
