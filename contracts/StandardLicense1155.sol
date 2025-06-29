// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

// ERC-1155 core
import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";         
// Reentrancy guard (now under utils in v5)
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";            
// Counters library
import "@openzeppelin/contracts/utils/Counters.sol";                   
// Ownable
import "@openzeppelin/contracts/access/Ownable.sol";

/// @notice Soulbound ERC-1155 for “standard” licenses (unlimited mints).
contract StandardLicense1155 is ERC1155, Ownable, ReentrancyGuard {
    using Counters for Counters.Counter;
    Counters.Counter private _assetIdCounter;

    mapping(uint256 => string)   private _uris;
    mapping(uint256 => uint256)  public  pricePerAsset;
    mapping(uint256 => address)  public  creatorOf;
    mapping(address => uint256[]) private _holderTokens;
    mapping(address => mapping(uint256 => bool)) private _holderTokenExists;

    error TransfersDisabled();
    error NotListed(uint256 id);
    error IncorrectPayment(uint256 required, uint256 provided);

    event AssetRegistered(uint256 indexed id, address indexed creator, string uri, uint256 price);
    event AssetPurchased(uint256 indexed buyer,  uint256 indexed id,     uint256 amount, uint256 price);

    constructor() ERC1155("") {}

    /// @notice Creator lists a new standard asset.
    function registerStandardAsset(string calldata uri, uint256 price)
        external
        returns (uint256 id)
    {
        id = _assetIdCounter.current();
        _assetIdCounter.increment();

        _uris[id]         = uri;
        pricePerAsset[id] = price;
        creatorOf[id]     = msg.sender;

        emit AssetRegistered(id, msg.sender, uri, price);
    }

    /// @notice Metadata URI override.
    function uri(uint256 id) public view override returns (string memory) {
        return _uris[id];
    }

    /// @notice Unlimited-supply purchase → soulbound mint.
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

        // forward funds
        (bool sent,) = payable(creatorOf[id]).call{value: msg.value}("");
        require(sent, "Payout failed");

        emit AssetPurchased(msg.sender, id, amount, price);
    }

    /// @dev Blocks any transfer except mint (from=0) or burn (to=0).
    function _beforeTokenTransfer(
        address, address from, address to,
        uint256[] memory, uint256[] memory, bytes memory
    ) internal virtual override {
        super._beforeTokenTransfer(msg.sender, from, to, new uint256, new uint256, "");
        if (from != address(0) && to != address(0)) revert TransfersDisabled();
    }

    /// @notice List of asset IDs owned by `account`.
    function tokensOfHolder(address account)
        external
        view
        returns (uint256[] memory)
    {
        return _holderTokens[account];
    }
}
