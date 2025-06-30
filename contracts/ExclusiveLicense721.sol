// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/// @notice Soulbound ERC-721 for one-off “exclusive” licenses.
contract ExclusiveLicense721 is ERC721, Ownable, ReentrancyGuard {
    uint256 private _nextAssetId;

    mapping(uint256 => string)   private _tokenUris;
    mapping(uint256 => uint256)  public  pricePerAsset;
    mapping(uint256 => address)  public  creatorOf;
    mapping(uint256 => bool)     public  isListed;
    mapping(address => uint256[]) private _ownerTokens;

    error TransfersDisabled();
    error NotListed(uint256 id);
    error IncorrectPayment(uint256 required, uint256 provided);

    event AssetRegisteredExclusive(uint256 indexed id, address indexed creator, string uri, uint256 price);
    event ExclusivePurchased(address indexed buyer, uint256 indexed id, uint256 price);

    constructor(string memory name_, string memory symbol_)
        ERC721(name_, symbol_)
        Ownable(msg.sender)
    {}

    /// @notice Creator lists a new exclusive asset.
    function registerExclusiveAsset(string calldata uri, uint256 price)
        external
        returns (uint256 id)
    {
        id = _nextAssetId++;
        _tokenUris[id]     = uri;
        pricePerAsset[id] = price;
        creatorOf[id]      = msg.sender;
        isListed[id]       = true;
        emit AssetRegisteredExclusive(id, msg.sender, uri, price);
    }

    /// @inheritdoc ERC721
    function tokenURI(uint256 id) public view override returns (string memory) {
        return _tokenUris[id];
    }

    /// @notice Buyers mint the single soulbound NFT by paying `price`.
    function purchaseExclusive(uint256 id) external payable nonReentrant {
        if (!isListed[id])      revert NotListed(id);
        uint256 price = pricePerAsset[id];
        if (msg.value != price) revert IncorrectPayment(price, msg.value);

        isListed[id] = false;
        _safeMint(msg.sender, id);
        _ownerTokens[msg.sender].push(id);

        (bool sent, ) = payable(creatorOf[id]).call{value: msg.value}("");
        require(sent, "Payout failed");

        emit ExclusivePurchased(msg.sender, id, price);
    }

    /// @dev Soulbound: block all transfers by overriding internal _transfer.
    function _transfer(address, address, uint256) internal pure override {
        revert TransfersDisabled();
    }

    /// @dev Also block approvals.
    function approve(address, uint256) public pure override {
        revert TransfersDisabled();
    }
    function setApprovalForAll(address, bool) public pure override {
        revert TransfersDisabled();
    }

    /// @notice Enumerate all exclusive token IDs owned by `ownerAddr`.
    function tokensOfOwner(address ownerAddr) external view returns (uint256[] memory) {
        return _ownerTokens[ownerAddr];
    }
}
