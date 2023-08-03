// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.18;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC1155/ERC1155Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC1155/extensions/ERC1155URIStorageUpgradeable.sol";
import "./MintGoldDustCompany.sol";
import "./MintGoldDustNFT.sol";

contract MintGoldDustERC1155 is
  Initializable,
  ERC1155Upgradeable,
  ERC1155URIStorageUpgradeable,
  MintGoldDustNFT
{
  // Add your custom code and functions here
  /**
   *
   * @notice that the MintGoldDustERC1155 is composed by other contract.
   * @param _mintGoldDustCompany The contract responsible to MGD management features.
   */
  function initializeChild(
    address _mintGoldDustCompany,
    string calldata baseURI
  ) external initializer {
    __ERC1155_init(baseURI);
    __ERC1155URIStorage_init();
    MintGoldDustNFT.initialize(_mintGoldDustCompany);
  }

  using Counters for Counters.Counter;
  Counters.Counter public _tokenIds;

  function uri(
    uint256 tokenId
  )
    public
    view
    virtual
    override(ERC1155Upgradeable, ERC1155URIStorageUpgradeable)
    returns (string memory)
  {
    return super.uri(tokenId);
  }

  /**
   * @dev The transfer function wraps the safeTransferFrom function of ERC1155.
   * @param from Sender of the token.
   * @param to Token destination.
   * @param tokenId ID of the token.
   * @param amount Amount of tokens to be transferred.
   */
  function transfer(
    address from,
    address to,
    uint256 tokenId,
    uint256 amount
  ) external override nonReentrant {
    safeTransferFrom(from, to, tokenId, amount, "");
  }

  /**
   * Mints a new Mint Gold Dust token.
   * @notice Fails if artist is not whitelisted or if the royalty surpass the max royalty limit
   * setted on MintGoldDustCompany smart contract.
   * @dev tokenIdArtist keeps track of the work of each artist and tokenIdRoyaltyPercent the royalty
   * percent for each art work.
   * @param _tokenURI The uri of the token metadata.
   * @param _royaltyPercent The royalty percentage for this art work.
   * @param _amount The amount of tokens to be minted.
   */
  function executeMintFlow(
    string calldata _tokenURI,
    uint256 _royaltyPercent,
    uint256 _amount,
    address _sender,
    uint256 _collectorMintId,
    bytes calldata _memoir
  ) internal override isZeroAddress(_sender) returns (uint256) {
    _tokenIds.increment();
    uint256 newTokenId = _tokenIds.current();
    _mint(_sender, newTokenId, _amount, "");
    _setURI(newTokenId, _tokenURI);
    tokenIdArtist[newTokenId] = _sender;
    tokenIdRoyaltyPercent[newTokenId] = _royaltyPercent;
    tokenIdMemoir[newTokenId] = _memoir;

    emit MintGoldDustNFTMinted(
      newTokenId,
      _tokenURI,
      _sender,
      _royaltyPercent,
      _amount,
      false,
      _collectorMintId,
      _memoir
    );

    return newTokenId;
  }
}
