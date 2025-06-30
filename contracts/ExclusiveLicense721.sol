// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";                     // :contentReference[oaicite:3]{index=3}
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/// @notice Soulbound ERC-721 for one-off “exclusive” licenses.
contract ExclusiveLicense721 is ERC721, ERC721Enumerable, Ownable, ReentrancyGuard {
    uint256 private _nextAssetId;                       // manual counter :contentReference[oaicite:4]{index=4}

    mapping(uint256 => string)  private _tokenURIs;
    mapping(uint256 => uint256) public  pricePerAsset;
    mapping(uint256 => address) public  creatorOf;
    mapping(uint256 => bool)    public  isListed;

    error TransfersDisabled();
    error NotListed(uint256 id);
    error IncorrectPayment(uint256 required, uint256 provided);

    event AssetRegisteredExclusive(uint256 indexed id, address indexed creator, string uri, uint256 price);
    event ExclusivePurchased(address indexed buyer, uint256 indexed id, uint256 price);

    /// @dev Deployer becomes owner.
    constructor(string memory name_, string memory symbol_)
        ERC721(name_, symbol_)
        Ownable(msg.sender)
    {}

    /// @notice Creator lists a new exclusive‐only asset.
    function registerExclusiveAsset(string calldata uri, uint256 price)
        external
        returns (uint256 id)
    {
        id = _nextAssetId++;
        _tokenURIs[id]    = uri;
        pricePerAsset[id] = price;
        creatorOf[id]     = msg.sender;
        isListed[id]      = true;
        emit AssetRegisteredExclusive(id, msg.sender, uri, price);
    }

    /// @inheritdoc ERC721
    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        return _tokenURIs[tokenId];
    }

    /// @notice One‐time soulbound mint on purchase.
    function purchaseExclusive(uint256 id) external payable nonReentrant {
        if (!isListed[id])       revert NotListed(id);
        uint256 price = pricePerAsset[id];
        if (msg.value != price)  revert IncorrectPayment(price, msg.value);

        isListed[id] = false;
        _safeMint(msg.sender, id);

        (bool sent,) = payable(creatorOf[id]).call{value: msg.value}("");
        require(sent, "Payout failed");

        emit ExclusivePurchased(msg.sender, id, price);
    }

    /// @dev Block any non-mint/burn soul transfers by overriding `_update`.
    function _update(address to, uint256 tokenId, address auth)
        internal
        virtual
        override(ERC721Enumerable)
        returns (address)
    {
        address prevOwner = super._update(to, tokenId, auth);
        if (prevOwner != address(0) && to != address(0)) revert TransfersDisabled();
        return prevOwner;
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

    /// @notice Enumerate all exclusive token IDs owned by `ownerAddr`.
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
