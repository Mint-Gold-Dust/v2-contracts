// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.18;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";

/// @title An abstract contract responsible to define some general responsibilites related with
/// a marketplace for its childrens.
/// @notice Contain a general function for purchases in primary and secondary sales
/// and also a virtual function that each children should have a specif implementation.
/// @author Mint Gold Dust LLC
/// @custom:contact klvh@mintgolddust.io
contract MintGoldDustEIP712 is Initializable {
  bytes32 DOMAIN_SEPARATOR;

  struct EIPDomain {
    string name;
    string version;
    uint256 chainId;
    address verifyingContract;
  }

  struct CollectorMintDTO {
    address contractAddress;
    string tokenURI;
    uint256 royalty;
    string memoir;
    address[] collaborators;
    uint256[] ownersPercentage;
    uint256 amount;
    address artistSigner;
    uint256 price;
    uint256 collectorMintId;
  }

  function initialize() public initializer {
    DOMAIN_SEPARATOR = hash(
      EIPDomain("MintGoldDust", "1", block.chainid, address(this))
    );
  }

  function hash(EIPDomain memory eip712Domain) internal pure returns (bytes32) {
    return
      keccak256(
        abi.encode(
          keccak256(
            "EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)"
          ),
          keccak256(bytes(eip712Domain.name)),
          keccak256(bytes(eip712Domain.version)),
          eip712Domain.chainId,
          eip712Domain.verifyingContract
        )
      );
  }

  function hash(
    CollectorMintDTO memory _collectorMintDTO
  ) internal pure returns (bytes32) {
    return
      keccak256(
        abi.encode(
          keccak256(
            "CollectorMintDTO(uint256 tokenId,address contractAddress,uint256 amount,uint256 price,uint256 royalty,address payable artistSigner,string tokenURI,string memoir,uint256 collectorMintId,address[] collaborators,uint256[] ownersPercentage)"
          ),
          _collectorMintDTO.contractAddress,
          keccak256(bytes(_collectorMintDTO.tokenURI)),
          _collectorMintDTO.royalty,
          keccak256(bytes(_collectorMintDTO.memoir)),
          abi.encodePacked(_collectorMintDTO.collaborators),
          abi.encodePacked(_collectorMintDTO.ownersPercentage),
          _collectorMintDTO.amount,
          _collectorMintDTO.artistSigner,
          _collectorMintDTO.price,
          _collectorMintDTO.collectorMintId
        )
      );
  }

  function verifyHash(
    CollectorMintDTO memory _collectorMintDTO,
    uint8 v,
    bytes32 r,
    bytes32 s
  ) public view returns (address) {
    bytes32 digest = (
      keccak256(
        abi.encodePacked("\x19\x01", DOMAIN_SEPARATOR, hash(_collectorMintDTO))
      )
    );

    return ecrecover(digest, v, r, s);
  }

  function greet(
    CollectorMintDTO memory _collectorMintDTO,
    address _artistSigner,
    uint8 v,
    bytes32 r,
    bytes32 s
  ) public view {
    require(
      (verifyHash(_collectorMintDTO, v, r, s) == _artistSigner),
      "Invalid signature"
    );
  }
}
