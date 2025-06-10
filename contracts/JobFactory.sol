// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./ProofOfWorkJob.sol";

contract JobFactory is Ownable, ReentrancyGuard {
    event JobCreated(address indexed jobAddress, address indexed employer);

    constructor() Ownable(msg.sender) {}

    function createJob(
        address _employer,
        uint8 _payType,
        uint256 _weeklyPay,
        uint256 _durationWeeks,
        uint256 _totalPay,
        string memory _title,
        string memory _description,
        uint256 _positions
    ) external onlyOwner returns (address) {
        ProofOfWorkJob job = new ProofOfWorkJob(
            _employer,
            _payType,
            _weeklyPay,
            _durationWeeks,
            _totalPay,
            _title,
            _description,
            _positions
        );
        allJobs.push(address(job));
        emit JobCreated(address(job), _employer);
        return address(job);
    }

    // Internal storage
    address[] internal allJobs;
}
