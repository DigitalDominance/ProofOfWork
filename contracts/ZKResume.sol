// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

interface IZKVerifier {
    function verifyProof(bytes calldata proof, uint256[] calldata pubSignals) external view returns (bool);
}

/// @notice Workers submit ZK proofs of weeks worked without revealing pay
contract ZKResume {
    IZKVerifier public immutable verifier;
    mapping(address => bytes) public proofs;

    event ResumeProofSubmitted(address indexed worker);

    constructor(address verifierAddr) {
        verifier = IZKVerifier(verifierAddr);
    }

    function submitProof(bytes calldata proof, uint256[] calldata pubSignals) external {
        require(verifier.verifyProof(proof, pubSignals), "Invalid proof");
        proofs[msg.sender] = proof;
        emit ResumeProofSubmitted(msg.sender);
    }
}
