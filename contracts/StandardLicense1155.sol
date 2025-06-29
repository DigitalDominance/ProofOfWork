// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

/// @title StandardLicense1155
/// @dev Soulbound ERC-1155 for multi-edition “standard” licenses.
contract StandardLicense1155 is ERC1155, Ownable, ReentrancyGuard {
    /// @dev Tracks which token IDs each holder owns.
    mapping(address => uint256[]) private _holderTokens;
    /// @dev Prevents duplicate entries in _holderTokens.
    mapping(address => mapping(uint256 => bool)) private _holderTokenExists;

    /// @dev Emitted when a new token ID is minted.
    event StandardMint(address indexed to, uint256 indexed id, uint256 amount);

    /// @param uri_ base metadata URI (may use `{id}` substitution)
    constructor(string memory uri_) ERC1155(uri_) {}

    /// @notice Mint `amount` of token `id` to `to`, set URI for future metadata.
    function mintStandard(
        address to,
        uint256 id,
        uint256 amount,
        bytes memory data
    ) external onlyOwner nonReentrant {
        if (!_holderTokenExists[to][id]) {
            _holderTokens[to].push(id);
            _holderTokenExists[to][id] = true;
        }
        _mint(to, id, amount, data);
        emit StandardMint(to, id, amount);
    }

    /// @dev Soulbound enforcement: disallow any transfer (and approvals) after mint.
    function _beforeTokenTransfer(
        address operator,
        address from,
        address to,
        uint256[] memory ids,
        uint256[] memory amounts,
        bytes memory data
    ) internal virtual override {
        super._beforeTokenTransfer(operator, from, to, ids, amounts, data);
        // allow only mint (from == 0) or burn (to == 0)
        if (from != address(0) && to != address(0)) {
            revert("SL: transfers disabled");
        }
    }

    /// @notice Get list of token IDs held by `account`.
    function tokensOfHolder(address account) external view returns (uint256[] memory) {
        return _holderTokens[account];
    }
}
