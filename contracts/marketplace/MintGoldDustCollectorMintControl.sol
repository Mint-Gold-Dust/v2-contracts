// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.18;

import "./MintGoldDustCompany.sol";

contract MintGoldDustCollectorMintControl {
    constructor(
        address _mintGoldDustSetPriceAddress,
        address _mintGoldDustERC721Address,
        address _mintGoldDustERC1155Address
    ) {
        mintGoldDustSetPriceAddress = _mintGoldDustSetPriceAddress;
        mintGoldDustERC721Address = _mintGoldDustERC721Address;
        mintGoldDustERC1155Address = _mintGoldDustERC1155Address;
    }

    mapping(address => bool) public collectorMintWithOpenedTransaction;

    address private mintGoldDustSetPriceAddress;
    address private mintGoldDustERC721Address;
    address private mintGoldDustERC1155Address;

    function openCollectorMintTransaction(
        address _collector
    ) external isAllowedToOpen {
        require(
            collectorMintWithOpenedTransaction[_collector] == false,
            "Unauthorized"
        );
        collectorMintWithOpenedTransaction[_collector] = true;
    }

    function closeCollectorMintTransaction(
        address _collector
    ) external isAllowedToClose {
        require(
            collectorMintWithOpenedTransaction[_collector] == true,
            "Unauthorized"
        );
        delete collectorMintWithOpenedTransaction[_collector];
    }

    modifier isAllowedToOpen() {
        require(msg.sender == mintGoldDustSetPriceAddress, "Unauthorized");
        _;
    }

    modifier isAllowedToClose() {
        require(
            msg.sender == mintGoldDustERC721Address ||
                msg.sender == mintGoldDustERC1155Address,
            "Unauthorized"
        );
        _;
    }
}
