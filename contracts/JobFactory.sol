// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./ProofOfWorkJob.sol";

interface IDisputeDAO {
    function createDispute(address job) external returns (uint256);
}

contract JobFactory is ReentrancyGuard {
    address payable public platformWallet;
    IDisputeDAO public disputeDAO;

    event JobCreated(address indexed jobAddress, address indexed employer);

    constructor(address _platformWallet, address _disputeDAO) {
        platformWallet = payable(_platformWallet);
        disputeDAO = IDisputeDAO(_disputeDAO);
    }

    function createJob(
        address payable _employee,
        uint256 _totalPay,
        uint256 _duration,
        uint256 _milestoneCount,
        string calldata _title,
        string calldata _description,
        string calldata _requirements,
        string calldata _category
    ) external payable nonReentrant returns (address) {
        require(msg.value == _totalPay, "Incorrect payment");

        ProofOfWorkJob job = (new ProofOfWorkJob){value: _totalPay}(
            payable(msg.sender),
            _employee,
            _totalPay,
            _duration,
            _milestoneCount,
            _title,
            _description,
            _requirements,
            _category,
            address(disputeDAO)
        );

        emit JobCreated(address(job), msg.sender);
        return address(job);
    }
}
