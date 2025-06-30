// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";            // ERC-1155 core
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";            // v5 guard
import "@openzeppelin/contracts/access/Ownable.sol";

/// @notice Soulbound ERC-1155 for multi-edition “standard” licenses.
contract StandardLicense1155 is ERC1155, Ownable, ReentrancyGuard {
    uint256 private _nextAssetId;

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

    constructor() ERC1155("") Ownable(msg.sender) {}

    /// @notice Creator lists a new standard asset.
    function registerStandardAsset(string calldata metadataUri, uint256 price)
        external
        returns (uint256 id)
    {
        id = _nextAssetId++;
        _uris[id]         = metadataUri;
        pricePerAsset[id] = price;
        creatorOf[id]     = msg.sender;
        emit AssetRegistered(id, msg.sender, metadataUri, price);
    }

    /// @notice Returns metadata URI for `id`.
    function uri(uint256 id) public view override returns (string memory) {
        return _uris[id];
    }

    /// @notice Buyers mint unlimited soulbound copies by calling this.
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

        (bool sent, ) = payable(creatorOf[id]).call{value: msg.value}("");
        require(sent, "Payout failed");

        emit AssetPurchased(msg.sender, id, amount, price);
    }

    /// @dev Blocks any transfer after mint; only mint (from==0) or burn (to==0) allowed.
    function _beforeTokenTransfer(
        address operator,
        address from,
        address to,
        uint256[] memory ids,
        uint256[] memory amounts,
        bytes memory data
    ) internal virtual override {
        super._beforeTokenTransfer(operator, from, to, ids, amounts, data);
        if (from != address(0) && to != address(0)) {
            revert TransfersDisabled();
        }
    }

    /// @notice Returns all asset IDs that `account` has ever purchased.
    function tokensOfHolder(address account) external view returns (uint256[] memory) {
        return _holderTokens[account];
    }
}
