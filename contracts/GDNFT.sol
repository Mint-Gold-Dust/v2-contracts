// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.17;

import "hardhat/console.sol";
import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/utils/Counters.sol";

contract GDNFT is ERC721URIStorage {
    using Counters for Counters.Counter;
    Counters.Counter private _tokenCount;

    address private _owner;

    constructor() ERC721("Gold Dust NFT", "GDNFT") {
        _owner = msg.sender;
    }

    function getTokenCount() public view returns (uint256) {
        return _tokenCount.current();
    }

    function mint(string memory tokenURI) external returns (uint) {
        _tokenCount.increment();
        uint256 newTokenId = _tokenCount.current();
        _safeMint(msg.sender, newTokenId);
        _setTokenURI(newTokenId, tokenURI);
        return (newTokenId);
    }
}
