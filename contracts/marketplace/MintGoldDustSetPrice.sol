// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.18;

import "./MintGoldDustMarketplace.sol";
import "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/token/ERC1155/IERC1155.sol";
import "@openzeppelin/contracts/token/ERC1155/IERC1155Receiver.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";

error YouCannotDelistMoreThanListed();

contract MintGoldDustSetPrice is
    MintGoldDustMarketplace,
    ReentrancyGuardUpgradeable,
    IERC1155Receiver
{
    bytes4 private constant ERC165_ID = 0x01ffc9a7; //ERC165

    function supportsInterface(
        bytes4 interfaceId
    ) public pure override returns (bool) {
        return interfaceId == ERC165_ID;
    }

    struct DelistDTO {
        uint256 tokenId;
        address contractAddress;
    }

    /// contract -> tokenId -> seller -> amount
    mapping(address => mapping(uint256 => mapping(address => uint256)))
        public tokenIdOffChainAmountByContractByOwner;

    /**
     *
     * @notice MGDAuction is a children of MintGoldDustMarketplace and this one is
     * composed by other two contracts.
     * @param _mgdCompany The contract responsible to MGD management features.
     * @param _mintGoldDustERC721Address The MGD ERC721.
     * @param _mintGoldDustERC1155Address The MGD ERC721.
     */
    function initializeChild(
        address _mgdCompany,
        address payable _mintGoldDustERC721Address,
        address payable _mintGoldDustERC1155Address
    ) public initializer {
        MintGoldDustMarketplace.initialize(
            _mgdCompany,
            _mintGoldDustERC721Address,
            _mintGoldDustERC1155Address
        );
    }

    function onERC1155Received(
        address operator,
        address from,
        uint256 id,
        uint256 value,
        bytes calldata data
    ) external override returns (bytes4) {
        return this.onERC1155Received.selector;
    }

    function onERC1155BatchReceived(
        address operator,
        address from,
        uint256[] calldata ids,
        uint256[] calldata values,
        bytes calldata data
    ) external override returns (bytes4) {
        return this.onERC1155BatchReceived.selector;
    }

    /**
     * @notice that this event show the info about a new listing to the set price market.
     * @dev this event will be triggered when a MintGoldDustNFT is listed for the set price marketplace.
     * @param tokenId the sequence number for the item.
     * @param seller the seller of this tokenId.
     * @param price the price for this item sale.
     *    @dev it cannot be zero.
     * @param amount the quantity of tokens to be listed for an MintGoldDustERC1155.
     *    @dev For MintGoldDustERC721 the amout must be always one.
     * @param contractAddress the MintGoldDustERC1155 or the MintGoldDustERC721 address.
     */
    event MintGoldDustNftListedToSetPrice(
        uint256 indexed tokenId,
        address seller,
        uint256 price,
        uint256 amount,
        address contractAddress
    );

    /**
     * @notice that this event show the info when a market item has its price updated.
     * @dev this event will be triggered when a market item has its price updated.
     * @param tokenId the sequence number for the item.
     * @param seller the seller of this tokenId.
     * @param price the new price for this item sale.
     *    @dev it cannot be zero.
     * @param contractAddress the MintGoldDustERC1155 or the MintGoldDustERC721 address.
     */
    event MintGoldDustNftListedItemUpdated(
        uint256 indexed tokenId,
        address seller,
        uint256 price,
        address contractAddress
    );

    /**
     * @notice that this event show the info about a delisting.
     * @dev this event will be triggered when a market item is delisted from the marketplace.
     * @param tokenId the sequence number for the item.
     * @param seller the seller of this tokenId.
     * @param contractAddress the MintGoldDustERC1155 or the MintGoldDustERC721 address.
     */
    event MintGoldDustNftRemovedFromMarketplace(
        uint256 indexed tokenId,
        address seller,
        address contractAddress
    );

    /**
     *
     * @notice that is function to list a MintGoldDustNFT for the marketplace set price market.
     * @dev This is an implementation of a virtual function declared in the father
     *      contract. Here we're listing an NFT to the MintGoldDustSetPrice market that the item has
     *      a fixed price. After that the user can update the price of this item or if necessary
     *      delist it. After delist is possible to list again here of for auction or another set price.
     *    @notice that here we call the more generic list function passing the correct params for the set price market.
     * @param _tokenId: The tokenId of the marketItem.
     * @param _amount: The quantity of tokens to be listed for an MintGoldDustERC1155.
     *    @dev For MintGoldDustERC721 the amout must be always one.
     * @param _contractAddress: The MintGoldDustERC1155 or the MintGoldDustERC721 address.
     * @param _price: The price or reserve price for the item.
     */
    function list(
        uint256 _tokenId,
        uint256 _amount,
        address _contractAddress,
        uint256 _price
    ) public override whenNotPaused {
        SaleDTO memory _saleDTO = SaleDTO(
            _tokenId,
            _amount,
            _contractAddress,
            msg.sender
        );

        ListDTO memory _listDTO = ListDTO(_saleDTO, _price);

        list(_listDTO, false, address(this), 0);

        emit MintGoldDustNftListedToSetPrice(
            _listDTO.saleDTO.tokenId,
            msg.sender,
            _listDTO.price,
            _contractAddress == mintGoldDustERC721Address ? 1 : _amount,
            _contractAddress
        );
    }

    /**
     * Updates an already listed NFT
     * @notice Only seller can call this function and this item must be
     * listed.
     * @dev The intention here is allow a user update the price of a
     * Market Item struct.
     * @param _tokenId The token ID of the the token to update.
     * @param _price The price of the NFT.
     * @param _contractAddress: The MintGoldDustERC1155 or the MintGoldDustERC721 address.
     * @param _seller The seller of the marketItem.
     */
    function updateListedNft(
        uint256 _tokenId,
        uint256 _price,
        address _contractAddress,
        address _seller
    ) public whenNotPaused {
        mustBeMintGoldDustERC721Or1155(_contractAddress);
        isTokenIdListed(_tokenId, _contractAddress);
        isSeller(_tokenId, _contractAddress, _seller);

        if (_price <= 0) {
            revert MintGoldDustListPriceMustBeGreaterThanZero();
        }

        MarketItem memory _marketItem = idMarketItemsByContractByOwner[
            _contractAddress
        ][_tokenId][_seller];

        idMarketItemsByContractByOwner[_contractAddress][_tokenId][
            _seller
        ] = MarketItem(
            _marketItem.tokenId,
            _marketItem.seller,
            _price,
            _marketItem.sold,
            _marketItem.isAuction,
            _marketItem.isSecondarySale,
            _marketItem.isERC721,
            _marketItem.tokenAmount,
            _marketItem.auctionProps
        );

        emit MintGoldDustNftListedItemUpdated(
            _tokenId,
            msg.sender,
            _price,
            _contractAddress
        );
    }

    /**
     * Delist NFT from marketplace
     * @notice Only seller can call this function
     * @dev Here we transfer back the token id to the seller that is
     * really the owner of the item. And set the sold attribute to true.
     * This in conjunction with the fact that this contract address is not more the
     * owner of the item, means that the item is not listed.
     * @param _delistDTO The DelistDTO parameter to use.
     *                 It consists of the following fields:
     *                    - tokenid: The tokenId of the marketItem.
     *                    - contractAddress: The MintGoldDustERC1155 or the MintGoldDustERC721 address.
     *                    - seller: The seller of the marketItem.
     */
    function delistNft(
        DelistDTO memory _delistDTO
    ) public nonReentrant whenNotPaused {
        mustBeMintGoldDustERC721Or1155(_delistDTO.contractAddress);
        isTokenIdListed(_delistDTO.tokenId, _delistDTO.contractAddress);
        isSeller(_delistDTO.tokenId, _delistDTO.contractAddress, msg.sender);
        MarketItem memory _marketItem = idMarketItemsByContractByOwner[
            _delistDTO.contractAddress
        ][_delistDTO.tokenId][msg.sender];

        // if (_marketItem.sold) {
        //   revert MGDMarketplaceItemIsNotListed();
        // }
        bool isERC721 = false;
        if (_delistDTO.contractAddress == mintGoldDustERC721Address) {
            isERC721 = true;
        }

        MintGoldDustNFT _mintGoldDustNFT = getERC1155OrERC721(
            _marketItem.isERC721
        );

        idMarketItemsByContractByOwner[_delistDTO.contractAddress][
            _delistDTO.tokenId
        ][msg.sender].sold = true;

        /**
         * @dev Here we have an external call to the MGD ERC721 contract
         * because of that we have the try catch.
         */
        try
            _mintGoldDustNFT.transfer(
                address(this),
                msg.sender,
                _delistDTO.tokenId,
                _marketItem.tokenAmount
            )
        {
            emit MintGoldDustNftRemovedFromMarketplace(
                _delistDTO.tokenId,
                msg.sender,
                _delistDTO.contractAddress
            );
        } catch {
            idMarketItemsByContractByOwner[_delistDTO.contractAddress][
                _delistDTO.tokenId
            ][msg.sender].sold = false;
            revert MintGoldDustErrorToTransfer("At set price delist!");
        }
    }

    /**
     * @notice Explain to an end user what this does
     * @dev Explain to a developer any extra details
     * @param _collectorMintDTO is the CollectorMintDTO struct
     *                It consists of the following fields:
     *                    - tokenid: The tokenId of the marketItem.
     *                    - amount: The quantity of tokens to be listed for an MintGoldDustERC1155. For
     *                              MintGoldDustERC721 the amout must be always one.
     *                    - contractAddress: The MintGoldDustERC1155 or the MintGoldDustERC721 address.
     *                    - seller: The seller of the marketItem.
     * @param _messageHash is the hash of the _collectorMintDTO
     * @param _artistSignature is the signature of the artist on top of the _messageHash
     */
    function collectorMintPurchase(
        CollectorMintDTO memory _collectorMintDTO,
        bytes32 _messageHash,
        bytes memory _artistSignature
    ) public payable whenNotPaused {
        mustBeMintGoldDustERC721Or1155(_collectorMintDTO.contractAddress);

        MintGoldDustNFT _mintGoldDustNFT;

        if (_collectorMintDTO.contractAddress == mintGoldDustERC721Address) {
            _mintGoldDustNFT = MintGoldDustNFT(mintGoldDustERC721Address);
        } else {
            _mintGoldDustNFT = MintGoldDustNFT(mintGoldDustERC1155Address);
        }

        verifyHash(_collectorMintDTO, _messageHash);

        uint8 v;
        bytes32 r;
        bytes32 s;

        // Split the signature into its components
        assembly {
            r := mload(add(_artistSignature, 32))
            s := mload(add(_artistSignature, 64))
            v := byte(0, mload(add(_artistSignature, 96)))
        }

        // Recover the signer address
        address signer = ecrecover(_messageHash, v, r, s);
        //require(signer == address(0), "Invalid signature");

        uint256 _tokenId;

        if (_collectorMintDTO.collaborators.length == 0) {
            _tokenId = _mintGoldDustNFT.collectorMint(
                _collectorMintDTO.tokenURI,
                _collectorMintDTO.royalty,
                _collectorMintDTO.amount,
                _collectorMintDTO.artistSigner,
                _collectorMintDTO.memoir,
                _collectorMintDTO.collectorMintId
            );
        } else {
            _tokenId = _mintGoldDustNFT.collectorSplitMint(
                _collectorMintDTO.tokenURI,
                _collectorMintDTO.royalty,
                _collectorMintDTO.collaborators,
                _collectorMintDTO.ownersPercentage,
                _collectorMintDTO.amount,
                _collectorMintDTO.artistSigner,
                _collectorMintDTO.memoir,
                _collectorMintDTO.collectorMintId
            );
        }

        SaleDTO memory _saleDTO = SaleDTO(
            _tokenId,
            _collectorMintDTO.amount,
            _collectorMintDTO.contractAddress,
            _collectorMintDTO.artistSigner
        );

        ListDTO memory _listDTO = ListDTO(_saleDTO, _collectorMintDTO.price);

        list(_listDTO, false, address(this), 0);

        emit MintGoldDustNftListedToSetPrice(
            _listDTO.saleDTO.tokenId,
            _collectorMintDTO.artistSigner,
            _listDTO.price,
            _collectorMintDTO.amount,
            _collectorMintDTO.contractAddress
        );

        callPurchase(
            _tokenId,
            _collectorMintDTO.amount,
            _collectorMintDTO.contractAddress,
            _collectorMintDTO.artistSigner,
            msg.value
        );
    }

    function callPurchase(
        uint256 _tokenId,
        uint256 _amount,
        address _contractAddress,
        address _artistSigner,
        uint256 _value
    ) private {
        SaleDTO memory _saleDTO = SaleDTO(
            _tokenId,
            _amount,
            _contractAddress,
            _artistSigner
        );

        collectorPurchaseNft(_saleDTO, msg.sender, _value);
    }
}
