// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";             // ERC-1155 core :contentReference[oaicite:4]{index=4}
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";             // v5 path :contentReference[oaicite:5]{index=5}
import "@openzeppelin/contracts/access/Ownable.sol";

/// @notice Soulbound ERC-1155 for multi-edition “standard” licenses.
contract StandardLicense1155 is ERC1155, Ownable, ReentrancyGuard {
    uint256 private _nextAssetId;  // manual counter instead of Counters.sol

    mapping(uint256 => string)   private _uris;
    mapping(uint256 => uint256)  public  pricePerAsset;
    mapping(uint256 => address)  public  creatorOf;
    mapping(address => uint256[]) private _holderTokens;
    mapping(address => mapping(uint256 => bool)) private _holderTokenExists;

    error TransfersDisabled();
    error NotListed(uint256 id);
    error IncorrectPayment(uint256 required, uint256 provided);

    event AssetRegistered(uint256 indexed id, address indexed creator, string uri, uint256 price);
    event AssetPurchased(address indexed buyer,  uint256 indexed id,     uint256 amount, uint256 price);

    constructor() ERC1155("") {}

    /// @notice Creators list a new standard asset.
    function registerStandardAsset(string calldata uri, uint256 price)
        external
        returns (uint256 id)
    {
        id = _nextAssetId++;
        _uris[id] = uri;
        pricePerAsset[id] = price;
        creatorOf[id] = msg.sender;
        emit AssetRegistered(id, msg.sender, uri, price);
    }

    /// @notice Metadata URI override.
    function uri(uint256 id) public view override returns (string memory) {
        return _uris[id];
    }

    /// @notice Buyers mint unlimited copies under soulbound rules.
    function purchaseStandard(uint256 id, uint256 amount)
        external
        payable
        nonReentrant
    {
        uint256 price = pricePerAsset[id];
        if (price == 0)           revert NotListed(id);
        uint256 total = price * amount;
        if (msg.value != total)   revert IncorrectPayment(total, msg.value);

        if (!_holderTokenExists[msg.sender][id]) {
            _holderTokens[msg.sender].push(id);
            _holderTokenExists[msg.sender][id] = true;
        }

        _mint(msg.sender, id, amount, "");

        // Forward payment
        (bool sent,) = payable(creatorOf[id]).call{value: msg.value}("");
        require(sent, "Payout failed");

        emit AssetPurchased(msg.sender, id, amount, price);
    }

    /// @dev Blocks any transfers (only mints and burns allowed).
    function _beforeTokenTransfer(
        address, address from, address to,
        uint256[] memory, uint256[] memory, bytes memory
    ) internal virtual override {
        super._beforeTokenTransfer(msg.sender, from, to, new uint256, new uint256, "");
        if (from != address(0) && to != address(0)) revert TransfersDisabled();
    }

    /// @notice List of asset IDs owned by `account`.
    function tokensOfHolder(address account) external view returns (uint256[] memory) {
        return _holderTokens[account];
    }
}
