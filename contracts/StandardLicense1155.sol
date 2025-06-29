// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/// @notice Soulbound ERC-1155 for multi-edition “standard” licenses.
contract StandardLicense1155 is ERC1155, Ownable, ReentrancyGuard {
    using Counters for Counters.Counter;
    Counters.Counter private _assetIdCounter;

    /// @dev Metadata URI per asset ID.
    mapping(uint256 => string) private _uris;
    /// @dev Price (in wei) per asset ID.
    mapping(uint256 => uint256) public pricePerAsset;
    /// @dev Creator address per asset ID.
    mapping(uint256 => address) public creatorOf;
    /// @dev Holder enumeration.
    mapping(address => uint256[]) private _holderTokens;
    mapping(address => mapping(uint256 => bool)) private _holderTokenExists;

    /// @dev Thrown on transfer attempts.
    error TransfersDisabled();
    /// @dev Thrown when asset isn’t listed.
    error NotListed(uint256 id);
    /// @dev Thrown on incorrect payment.
    error IncorrectPayment(uint256 required, uint256 provided);

    event AssetRegistered(uint256 indexed id, address indexed creator, string uri, uint256 price);
    event AssetPurchased(address indexed buyer, uint256 indexed id, uint256 amount, uint256 price);

    constructor() ERC1155("") {}

    /// @notice Creators call to list a new standard asset.
    function registerStandardAsset(string calldata uri, uint256 price)
        external
        returns (uint256 id)
    {
        id = _assetIdCounter.current();
        _assetIdCounter.increment();

        _uris[id] = uri;
        pricePerAsset[id] = price;
        creatorOf[id] = msg.sender;

        emit AssetRegistered(id, msg.sender, uri, price);
    }

    /// @notice Returns metadata URI for `id`.
    function uri(uint256 id) public view override returns (string memory) {
        return _uris[id];
    }

    /// @notice Buyers call to mint `amount` licenses; unlimited supply.
    function purchaseStandard(uint256 id, uint256 amount)
        external
        payable
        nonReentrant
    {
        uint256 price = pricePerAsset[id];
        if (price == 0) revert NotListed(id);  // asset must be listed :contentReference[oaicite:5]{index=5}
        uint256 total = price * amount;
        if (msg.value != total) revert IncorrectPayment(total, msg.value);

        // Record holder for enumeration
        if (!_holderTokenExists[msg.sender][id]) {
            _holderTokens[msg.sender].push(id);
            _holderTokenExists[msg.sender][id] = true;
        }

        // Soulbound mint
        _mint(msg.sender, id, amount, "");

        // Forward payment to creator
        (bool sent,) = payable(creatorOf[id]).call{value: msg.value}("");
        require(sent, "Payout failed");

        emit AssetPurchased(msg.sender, id, amount, price);
    }

    /// @dev Disables all transfers after mint; allows only mint (from==0) or burn (to==0) :contentReference[oaicite:6]{index=6}
    function _beforeTokenTransfer(
        address operator,
        address from,
        address to,
        uint256[] memory ids,
        uint256[] memory amounts,
        bytes memory data
    ) internal virtual override {
        super._beforeTokenTransfer(operator, from, to, ids, amounts, data);
        if (from != address(0) && to != address(0)) revert TransfersDisabled();
    }

    /// @notice View enrolled asset IDs for `account`.
    function tokensOfHolder(address account)
        external
        view
        returns (uint256[] memory)
    {
        return _holderTokens[account];
    }
}
