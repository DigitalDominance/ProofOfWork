// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./ProofOfWorkJob.sol";

contract JobFactory is ReentrancyGuard {
    address public admin;
    address payable public feeRecipient = payable(0xA0c5048c32870bB66d0BE861643cD6Bb5F66Ada2);
    address[] public allJobs;

    event JobCreated(address indexed jobAddress, address indexed employer);

    modifier onlyAdmin() {
        require(msg.sender == admin, "Not admin");
        _;
    }

    constructor(address _admin) {
        admin = _admin;
    }

    function createJob(
        address _employer,
        uint8 _payType,
        uint256 _weeklyPay,
        uint256 _durationWeeks,
        uint256 _totalPay,
        string memory _title,
        string memory _description,
        uint256 _positions
    ) external payable returns (address) {
        uint256 fee = (_totalPay * 75) / 10000;
        require(msg.value == _totalPay + fee, "Incorrect payment");

        // Forward the fee
        (bool sent, ) = feeRecipient.call{value: fee}("");
        require(sent, "Fee payment failed");

        // Deploy the job with only the totalPay value
        ProofOfWorkJob job = (new ProofOfWorkJob){value: _totalPay}(
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
}
