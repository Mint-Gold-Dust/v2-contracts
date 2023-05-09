// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.17;

error MGDnftRoyaltyInvalidPercentage();
error MGDnftUnauthorized();
error NumberOfCollaboratorsAndPercentagesNotMatch();
error TheTotalPercentageCantBeGreaterThan100();

interface MintGoldDustNFT {
    function transfer(
        address from,
        address to,
        uint256 tokenId,
        uint256 amount
    ) external;

    function listForAuction(
        uint256 _tokenId,
        uint256 _price,
        uint256 _amount
    ) external;

    function listForSetPrice(
        uint256 _tokenId,
        uint256 _price,
        uint256 _amount
    ) external;

    function purchaseNft(
        uint256 _tokenId,
        address _contract,
        uint256 _amount
    ) external payable;
}
