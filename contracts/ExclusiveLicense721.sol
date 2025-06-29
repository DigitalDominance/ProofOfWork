// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

// ERC-721 core + enumerable extension
import "@openzeppelin/contracts/token/ERC721/ERC721.sol";                  
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";               
import "@openzeppelin/contracts/utils/Counters.sol"; 

/// @notice Soulbound ERC-721 for “exclusive” licenses (one sale only).
contract ExclusiveLicense721 is ERC721, ERC721Enumerable, Ownable, ReentrancyGuard {
    using Counters for Counters.Counter;
    Counters.Counter private _assetIdCounter;

    mapping(uint256 => string)  private _tokenURIs;
    mapping(uint256 => uint256) public  pricePerAsset;
    mapping(uint256 => address) public  creatorOf;
    mapping(uint256 => bool)    public  isListed;

    error TransfersDisabled();
    error NotListed(uint256 id);
    error IncorrectPayment(uint256 required, uint256 provided);

    event AssetRegisteredExclusive(
        uint256 indexed id,
        address indexed creator,
        string uri,
        uint256 price
    );
    event ExclusivePurchased(address indexed buyer, uint256 indexed id, uint256 price);

    constructor(string memory name_, string memory symbol_)
        ERC721(name_, symbol_)
    {}

    /// @notice Creator lists a new exclusive asset.
    function registerExclusiveAsset(string calldata uri, uint256 price)
        external
        returns (uint256 id)
    {
        id = _assetIdCounter.current();
        _assetIdCounter.increment();

        _tokenURIs[id]    = uri;
        pricePerAsset[id] = price;
        creatorOf[id]     = msg.sender;
        isListed[id]      = true;

        emit AssetRegisteredExclusive(id, msg.sender, uri, price);
    }

    /// @inheritdoc ERC721
    function tokenURI(uint256 tokenId)
        public
        view
        override
        returns (string memory)
    {
        return _tokenURIs[tokenId];
    }

    /// @notice One-time purchase → soulbound mint.
    function purchaseExclusive(uint256 id)
        external
        payable
        nonReentrant
    {
        if (!isListed[id])       revert NotListed(id);
        uint256 price = pricePerAsset[id];
        if (msg.value != price)  revert IncorrectPayment(price, msg.value);

        isListed[id] = false;
        _safeMint(msg.sender, id);

        (bool sent,) = payable(creatorOf[id]).call{value: msg.value}("");
        require(sent, "Payout failed");

        emit ExclusivePurchased(msg.sender, id, price);
    }

    /// @dev Blocks any transfer except mint (from=0) or burn (to=0).
    function _beforeTokenTransfer(
        address from, address to, uint256 tokenId, uint256 batchSize
    ) internal override(ERC721, ERC721Enumerable) {
        super._beforeTokenTransfer(from, to, tokenId, batchSize);
        if (from != address(0) && to != address(0)) revert TransfersDisabled();
    }

    /// @inheritdoc ERC721Enumerable
    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC721, ERC721Enumerable)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }

    /// @notice List of token IDs owned by `ownerAddr`.
    function tokensOfOwner(address ownerAddr)
        external
        view
        returns (uint256[] memory)
    {
        uint256 count = balanceOf(ownerAddr);
        uint256[] memory result = new uint256[](count);
        for (uint256 i = 0; i < count; i++) {
            result[i] = tokenOfOwnerByIndex(ownerAddr, i);
        }
        return result;
    }
}
