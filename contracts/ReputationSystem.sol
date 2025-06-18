// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract ReputationSystem {
    address public jobContract;
    
    // Rating structure
    struct Rating {
        uint8 score; // 1-5 rating
        uint256 timestamp;
        bool exists;
    }
    
    // User reputation data
    struct UserReputation {
        uint256 totalRatings;
        uint256 totalScore;
        uint256 jobsCompleted;
        mapping(address => Rating) ratingsReceived; // ratings received from others
        mapping(address => Rating) ratingsGiven;    // ratings given to others
        address[] ratingAddresses; // addresses that rated this user
    }
    
    // Mappings
    mapping(address => UserReputation) public userReputations;
    
    // Events
    event RatingSubmitted(
        address indexed rater,
        address indexed ratee,
        uint8 score
    );
    
    event JobCompleted(address indexed worker);
    
    modifier onlyJobContract() {
        require(msg.sender == jobContract, "Only job contract can call");
        _;
    }
    
    constructor(address _jobContract) {
        jobContract = _jobContract;
    }
    
    /**
     * @dev Submit a rating for another user
     * @param ratee The address being rated
     * @param score Rating score (1-5)
     */
    function submitRating(
        address ratee,
        uint8 score
    ) external onlyJobContract {
        require(ratee != address(0), "Invalid ratee address");
        require(score >= 1 && score <= 5, "Score must be 1-5");
        require(!userReputations[ratee].ratingsReceived[tx.origin].exists, "Already rated");
        
        // Create the rating
        userReputations[ratee].ratingsReceived[tx.origin] = Rating({
            score: score,
            timestamp: block.timestamp,
            exists: true
        });
        
        // Record that the rater gave this rating
        userReputations[tx.origin].ratingsGiven[ratee] = Rating({
            score: score,
            timestamp: block.timestamp,
            exists: true
        });
        
        // Update reputation stats
        userReputations[ratee].totalRatings++;
        userReputations[ratee].totalScore += score;
        userReputations[ratee].ratingAddresses.push(tx.origin);
        
        emit RatingSubmitted(tx.origin, ratee, score);
    }
    
    /**
     * @dev Update worker job completion count (existing function)
     */
    function updateWorker(address worker, uint256 jobsCompleted) external onlyJobContract {
        userReputations[worker].jobsCompleted += jobsCompleted;
        emit JobCompleted(worker);
    }
    
    /**
     * @dev Get user's average rating
     */
    function getAverageRating(address user) external view returns (uint256 average, uint256 totalRatings) {
        UserReputation storage rep = userReputations[user];
        if (rep.totalRatings == 0) {
            return (0, 0);
        }
        return (rep.totalScore * 100 / rep.totalRatings, rep.totalRatings); // Return average * 100 for precision
    }
    
    /**
     * @dev Get user's reputation summary
     */
    function getUserReputation(address user) external view returns (
        uint256 averageRating,
        uint256 totalRatings,
        uint256 jobsCompleted
    ) {
        UserReputation storage rep = userReputations[user];
        uint256 average = rep.totalRatings > 0 ? rep.totalScore * 100 / rep.totalRatings : 0;
        return (average, rep.totalRatings, rep.jobsCompleted);
    }
    
    /**
     * @dev Get specific rating between two users
     */
    function getRating(address rater, address ratee) external view returns (
        uint8 score,
        uint256 timestamp,
        bool exists
    ) {
        Rating storage rating = userReputations[ratee].ratingsReceived[rater];
        return (rating.score, rating.timestamp, rating.exists);
    }
    
    /**
     * @dev Get all addresses that rated a user
     */
    function getRatingAddresses(address user) external view returns (address[] memory) {
        return userReputations[user].ratingAddresses;
    }
    
    /**
     * @dev Check if a user has been rated by another user
     */
    function hasBeenRated(address rater, address ratee) external view returns (bool) {
        return userReputations[ratee].ratingsReceived[rater].exists;
    }
}
