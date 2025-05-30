// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./ProofOfWorkJob.sol";

/// @notice Factory that deploys new ProofOfWorkJob instances
contract JobFactory is Ownable, ReentrancyGuard {
    event JobCreated(address indexed jobAddress, address indexed employer);

    /// @dev platform fee in basis points (75 = 0.75%)
    uint256 public constant PLATFORM_FEE_BPS = 75;
    address payable public feeRecipient;

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

    /// @notice Create a new job.  
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
        if (payType == 0) {
            require(weeklyPay > 0 && durationWeeks > 0, "Bad weekly params");
            require(msg.value == weeklyPay * durationWeeks, "Incorrect ETH for weekly");
        } else {
            require(payType == 1, "Bad payType");
            require(totalPay > 0, "Bad totalPay");
            require(msg.value == totalPay, "Incorrect ETH for one-off");
        }

        ProofOfWorkJob job = new ProofOfWorkJob{value: msg.value}(
            msg.sender,
            payType,
            weeklyPay,
            durationWeeks,
            totalPay,
            title,
            description,
            numPositions,
            feeRecipient,
            PLATFORM_FEE_BPS
        );

        emit JobCreated(address(job), msg.sender);
        return address(job);
    }
}
