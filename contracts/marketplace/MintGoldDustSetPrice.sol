// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.18;

import {MintGoldDustNFT} from "./MintGoldDustNFT.sol";
import {CollectorMintDTO, DelistDTO, ListDTO, ManagePrimarySale, MarketItem, SaleDTO} from "../libraries/MgdMarketPlaceDataTypes.sol";
import {MintGoldDustMarketplace} from "./MintGoldDustMarketplace.sol";
import {IERC721} from "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import {IERC1155} from "@openzeppelin/contracts/token/ERC1155/IERC1155.sol";
import {IERC1155Receiver} from "@openzeppelin/contracts/token/ERC1155/IERC1155Receiver.sol";
import {ECDSA} from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import {IERC165} from "@openzeppelin/contracts/utils/introspection/IERC165.sol";

contract MintGoldDustSetPrice is MintGoldDustMarketplace {
    using ECDSA for bytes32;

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
     * @param amount the quantity to be delisted.
     * @param seller the seller of this tokenId.
     * @param contractAddress the MintGoldDustERC1155 or the MintGoldDustERC721 address.
     */
    event NftQuantityDelisted(
        uint256 indexed tokenId,
        uint256 amount,
        address seller,
        address contractAddress
    );

    error RoyaltyInvalidPercentage();
    error UnauthorizedOnNFT(string message);
    error Log(bytes32 domain, bytes encoded, bytes32 _eip712Hash);
    error ListPriceMustBeGreaterThanZero();

    /// @notice that his function will check if the parameters for the collector mint flow are valid.
    /// @param _artistAddress is the artist address that used collector mint.
    /// @param percentage is the percentage chosen by the artist for its royalty.
    modifier checkParameters(address _artistAddress, uint256 percentage) {
        if (
            !mintGoldDustCompany.isArtistApproved(_artistAddress) ||
            _artistAddress == address(0)
        ) {
            revert UnauthorizedOnNFT("ARTIST");
        }
        if (percentage > mintGoldDustCompany.maxRoyalty()) {
            revert RoyaltyInvalidPercentage();
        }
        _;
    }

    mapping(uint256 => bool) public collectorMintIdUsed;

    /**
     *
     * @notice MGDAuction is a children of MintGoldDustMarketplace and this one is
     * composed by other two contracts.
     * @param mintGoldDustCompany_ The contract responsible to MGD management features.
     * @param mintGoldDustERC721Address_ The MGD ERC721.
     * @param mintGoldDustERC1155Address_ The MGD ERC721.
     */
    function initializeChild(
        address mintGoldDustCompany_,
        address payable mintGoldDustERC721Address_,
        address payable mintGoldDustERC1155Address_
    ) external initializer {
        MintGoldDustMarketplace.initialize(
            mintGoldDustCompany_,
            mintGoldDustERC721Address_,
            mintGoldDustERC1155Address_
        );
    }

    function supportsInterface(
        bytes4 interfaceId
    ) external pure returns (bool) {
        return interfaceId == type(IERC165).interfaceId;
    }

    /**
     *
     * @notice that is function to list a MintGoldDustNFT for the marketplace set price market.
     * @dev This is an implementation of a virtual function declared in the father
     *      contract. Here we're listing an NFT to the MintGoldDustSetPrice market that the item has
     *      a fixed price. After that the user can update the price of this item or if necessary
     *      delist it. After delist is possible to list again here of for auction or another set price.
     *    @notice that here we call the more generic list function passing the correct params for the set price market.
     * @param tokenId: The tokenId of the marketItem.
     * @param amount: The quantity of tokens to be listed for an MintGoldDustERC1155.
     *    @dev For MintGoldDustERC721 the amout must be always one.
     * @param nft: The MintGoldDustERC1155 or the MintGoldDustERC721 address.
     * @param price: The price or reserve price for the item.
     */
    function list(
        uint256 tokenId,
        uint256 amount,
        MintGoldDustNFT nft,
        uint256 price
    ) external override whenNotPaused {
        _mustBeMintGoldDustERC721Or1155(address(nft));

        _isNotListed(tokenId, address(nft), msg.sender);

        if (price == 0) {
            revert ListPriceMustBeGreaterThanZero();
        }

        ListDTO memory listDTO = ListDTO(tokenId, amount, nft, price);

        _list(listDTO, 0, msg.sender);

        emit MintGoldDustNftListedToSetPrice(
            tokenId,
            msg.sender,
            price,
            address(nft) == mintGoldDustERC721Address ? 1 : amount,
            address(nft)
        );
    }

    /**
     * Updates an already listed NFT
     * @notice Only seller can call this function and this item must be
     * listed.
     * @dev The intention here is allow a user update the price of a
     * Market Item struct.
     * @param tokenId The token ID of the the token to update.
     * @param price The price of the NFT.
     * @param nft: The MintGoldDustERC1155 or the MintGoldDustERC721 address.
     * @param seller The seller of the marketItem.
     */
    function updateListedNft(
        uint256 tokenId,
        uint256 price,
        address nft,
        address seller
    ) external {
        _mustBeMintGoldDustERC721Or1155(nft);
        _isTokenListed(tokenId, nft, seller);
        _isSeller(tokenId, nft, seller);

        if (price <= 0) {
            revert ListPriceMustBeGreaterThanZero();
        }

        idMarketItemsByContractByOwner[nft][tokenId][seller].price = price;

        emit MintGoldDustNftListedItemUpdated(tokenId, msg.sender, price, nft);
    }

    /**
     * Delist NFT from marketplace
     * @notice Only seller can call this function
     * @dev Here we transfer back the token id to the seller that is
     * really the owner of the item. And set the sold attribute to true.
     * This in conjunction with the fact that this contract address is not more the
     * owner of the item, means that the item is not listed.
     * @param delistDTO The DelistDTO parameter to use.
     *                 It consists of the following fields:
     *                    - tokenid: The tokenId of the marketItem.
     *                    - amount: The quantity of tokens to be delisted for an MintGoldDustERC1155.
     *                    - contractAddress: The MintGoldDustERC1155 or the MintGoldDustERC721 address.
     */
    function delistNft(DelistDTO memory delistDTO) external nonReentrant {
        _mustBeMintGoldDustERC721Or1155(address(delistDTO.nft));
        _isTokenListed(delistDTO.tokenId, address(delistDTO.nft), msg.sender);
        _isSeller(delistDTO.tokenId, address(delistDTO.nft), msg.sender);

        uint realAmount = 1;

        if (address(delistDTO.nft) == mintGoldDustERC1155Address) {
            realAmount = delistDTO.amount;
            _hasEnoughAmountListed(
                delistDTO.tokenId,
                address(delistDTO.nft),
                address(this),
                delistDTO.amount,
                msg.sender
            );
        }

        MarketItem memory marketItem = idMarketItemsByContractByOwner[
            address(delistDTO.nft)
        ][delistDTO.tokenId][msg.sender];

        marketItem.tokenAmount = marketItem.tokenAmount - realAmount;

        delistDTO.nft.transfer(
            address(this),
            msg.sender,
            delistDTO.tokenId,
            delistDTO.amount
        );

        if (marketItem.tokenAmount == 0) {
            delete idMarketItemsByContractByOwner[address(delistDTO.nft)][
                delistDTO.tokenId
            ][msg.sender];
        }

        emit NftQuantityDelisted(
            delistDTO.tokenId,
            delistDTO.amount,
            msg.sender,
            address(delistDTO.nft)
        );
    }

    /**
     * @notice that is a function responsilble by start the collector (lazy) mint process on chain.
     * @param collectorMintDTO is the CollectorMintDTO struct
     *                It consists of the following fields:
     *                    - contractAddress: The MintGoldDustERC1155 or the MintGoldDustERC721 address.
     *                    - tokenURI: The tokenURI of the marketItem.
     *                    - royalty: The royalty of the marketItem.
     *                    - memoir: The memoir of the marketItem.
     *                    - collaborators: The collaborators of the marketItem.
     *                    - ownersPercentage: The ownersPercentage of the marketItem.
     *                    - amount: The quantity of tokens to be listed for an MintGoldDustERC1155. For
     *                              MintGoldDustERC721 the amout must be always one.
     *                    - artistSigner: The artistSigner of the marketItem.
     *                    - price: The price or reserve price for the item.
     *                    - collectorMintId: Is the collector mint id generated off chain.
     * @param eip712HashOffChain is the hash of the eip712 object generated off chain.
     * @param signature is the signature of the eip712 object generated off chain.
     * @param mintGoldDustSignature is the signature using mintGoldDustCompany private key.
     * @param amountToBuy is the amount of tokens to buy.
     * @dev See that we have some steps here:
     *      1. Verify if the artist signer address is not a zero address.
     *      2. Verify if contract address is a MintGoldDustERC721 or a MintGoldDustERC1155.
     *      3. Verify if the eip712 hash generated on chain match with the eip712 hash generated off chain.
     *      4. Verify if the collector mint dto hash generated on chain match with the collector mint dto hash generated off chain.
     *      5. Verify if signatures comes from our platform using the public keys.
     *      6. Verify if artist signatures are valid.
     */
    function collectorMintPurchase(
        CollectorMintDTO calldata collectorMintDTO,
        bytes32 eip712HashOffChain,
        bytes memory signature,
        bytes memory mintGoldDustSignature,
        uint256 amountToBuy
    )
        external
        payable
        nonReentrant
        checkParameters(collectorMintDTO.artistSigner, collectorMintDTO.royalty)
        whenNotPaused
    {
        _mustBeMintGoldDustERC721Or1155(address(collectorMintDTO.nft));

        require(collectorMintDTO.amount > 0, "Invalid amount to mint");
        require(amountToBuy > 0, "Invalid amount to buy");

        require(
            collectorMintIdUsed[collectorMintDTO.collectorMintId] == false,
            "Collector Mint Id already used"
        );

        collectorMintIdUsed[collectorMintDTO.collectorMintId] = true;

        uint256 realAmount = collectorMintDTO.amount;

        if (address(collectorMintDTO.nft) == mintGoldDustERC721Address) {
            realAmount = 1;
        }

        require(amountToBuy <= realAmount, "Invalid amount to buy");

        bytes32 eip712HashOnChain = _generateEIP712Hash(collectorMintDTO);
        require(eip712HashOnChain == eip712HashOffChain, "Invalid hash");

        require(
            _verifySignature(
                mintGoldDustCompany.publicKey(),
                eip712HashOffChain,
                mintGoldDustSignature
            ),
            "Invalid signature"
        );

        require(
            _verifySignature(
                collectorMintDTO.artistSigner,
                eip712HashOffChain,
                signature
            ),
            "Invalid signature"
        );

        uint256 tokenId;

        if (collectorMintDTO.collaborators.length == 0) {
            tokenId = collectorMintDTO.nft.collectorMint(
                collectorMintDTO,
                msg.sender
            );
        } else {
            tokenId = collectorMintDTO.nft.collectorSplitMint(
                collectorMintDTO,
                msg.sender
            );
        }

        ListDTO memory listDTO = ListDTO(
            tokenId,
            collectorMintDTO.amount,
            collectorMintDTO.nft,
            collectorMintDTO.price
        );

        _list(listDTO, 0, collectorMintDTO.artistSigner);

        emit MintGoldDustNftListedToSetPrice(
            listDTO.tokenId,
            collectorMintDTO.artistSigner,
            listDTO.price,
            collectorMintDTO.amount,
            address(collectorMintDTO.nft)
        );

        _callPurchase(
            tokenId,
            amountToBuy,
            address(collectorMintDTO.nft),
            collectorMintDTO.artistSigner,
            msg.value
        );
    }

    /**
     * Acquire a listed NFT to Set Price market
     * @notice function will fail if the market item does has the auction property to true.
     * @notice function will fail if the token was not listed to the set price market.
     * @notice function will fail if the contract address is not a MintGoldDustERC721 neither a MintGoldDustERC1155.
     * @notice function will fail if the amount paid by the buyer does not cover the purshace amount required.
     * @dev This function is specific for the set price market.
     * For the auction market we have a second purchaseAuctionNft function. See below.
     * @param saleDTO The SaleDTO struct parameter to use.
     *                 It consists of the following fields:
     *                    - tokenid: The tokenId of the marketItem.
     *                    - amount: The quantity of tokens to be listed for an MintGoldDustERC1155. For
     *                              MintGoldDustERC721 the amout must be always one.
     *                    - contractAddress: The MintGoldDustERC1155 or the MintGoldDustERC721 address.
     *                    - seller: The seller of the marketItem.
     */
    function purchaseNft(SaleDTO memory saleDTO) external payable nonReentrant {
        _executePurchaseNftFlow(saleDTO, msg.sender, msg.value);
    }

    /// @notice that is a function responsible by handling the call to the purchase function.
    function _callPurchase(
        uint256 tokenId,
        uint256 amount,
        address nft,
        address artistSigner,
        uint256 value
    ) private {
        SaleDTO memory saleDTO = SaleDTO(
            tokenId,
            amount,
            MintGoldDustNFT(nft),
            artistSigner
        );
        _executePurchaseNftFlow(saleDTO, msg.sender, value);
    }

    /**
     * @notice that function is responsible by verify a signature on top of the eip712 object hash.
     * @param expectedSigner is the signer address.
     *    @dev in this case is the artist signer address.
     * @param eip712Hash is the signature of the eip712 object generated off chain.
     * @param signature is the collector mint id generated off chain.
     */
    function _verifySignature(
        address expectedSigner,
        bytes32 eip712Hash,
        bytes memory signature
    ) private pure returns (bool) {
        bytes32 prefixedHash = keccak256(
            abi.encodePacked("\x19Ethereum Signed Message:\n32", eip712Hash)
        );

        bytes32 r;
        bytes32 s;
        uint8 v;

        require(signature.length == 65, "Invalid signature length");

        assembly {
            r := mload(add(signature, 32))
            s := mload(add(signature, 64))
            v := byte(0, mload(add(signature, 96)))
        }

        if (v < 27) {
            v += 27;
        }

        address signer = ecrecover(prefixedHash, v, r, s);
        return signer == expectedSigner;
    }

    /**
     * @notice that is a function that will generate the hash of the eip712 object on chain.
     * @param collectorMintDTO is the CollectorMintDTO struct
     *                It consists of the following fields:
     *                    - contractAddress: The MintGoldDustERC1155 or the MintGoldDustERC721 address.
     *                    - tokenURI: The tokenURI of the marketItem.
     *                    - royalty: The royalty of the marketItem.
     *                    - memoir: The memoir of the marketItem.
     *                    - collaborators: The collaborators of the marketItem.
     *                    - ownersPercentage: The ownersPercentage of the marketItem.
     *                    - amount: The quantity of tokens to be listed for an MintGoldDustERC1155. For
     *                              MintGoldDustERC721 the amout must be always one.
     *                    - artistSigner: The artistSigner of the marketItem.
     *                    - price: The price or reserve price for the item.
     * @notice that this function depends on another two functions:
     *      1. encodeDomainSeparator: that will encode the domain separator.
     *      2. encodeData: that will encode the collectorMintDTO.
     */
    function _generateEIP712Hash(
        CollectorMintDTO memory collectorMintDTO
    ) private view returns (bytes32) {
        bytes memory encodedData = _encodeData(collectorMintDTO);
        bytes32 domainSeparator = _encodeDomainSeparator();

        bytes32 encodedDataHash = keccak256(
            abi.encode(bytes1(0x19), bytes1(0x01), domainSeparator, encodedData)
        );

        bytes32 hashBytes32 = bytes32(encodedDataHash);

        return (hashBytes32);
    }

    /**
     * @notice that is a function that will create and encode the domain separator of the eip712 object on chain.
     */
    function _encodeDomainSeparator() private view returns (bytes32) {
        bytes32 domainTypeHash = keccak256(
            abi.encodePacked(
                "EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)"
            )
        );

        bytes32 nameHash = keccak256(bytes("MintGoldDustSetPrice"));
        bytes32 versionHash = keccak256(bytes("1.0.0"));

        bytes32 domainSeparator = keccak256(
            abi.encode(
                domainTypeHash,
                nameHash,
                versionHash,
                block.chainid,
                address(this)
            )
        );

        return domainSeparator;
    }

    /**
     * @notice that is a function that will encode the collectorMintDTO for the eip712 object on chain.
     * @param collectorMintDTO is the CollectorMintDTO struct
     *                It consists of the following fields:
     *                    - contractAddress: The MintGoldDustERC1155 or the MintGoldDustERC721 address.
     *                    - tokenURI: The tokenURI of the marketItem.
     *                    - royalty: The royalty of the marketItem.
     *                    - memoir: The memoir of the marketItem.
     *                    - collaborators: The collaborators of the marketItem.
     *                    - ownersPercentage: The ownersPercentage of the marketItem.
     *                    - amount: The quantity of tokens to be listed for an MintGoldDustERC1155. For
     *                              MintGoldDustERC721 the amout must be always one.
     *                    - artistSigner: The artistSigner of the marketItem.
     *                    - price: The price or reserve price for the item.
     */
    function _encodeData(
        CollectorMintDTO memory collectorMintDTO
    ) private pure returns (bytes memory) {
        bytes memory encodedData = abi.encode(
            address(collectorMintDTO.nft),
            collectorMintDTO.tokenURI,
            collectorMintDTO.royalty,
            collectorMintDTO.memoir,
            collectorMintDTO.collaborators,
            collectorMintDTO.ownersPercentage,
            collectorMintDTO.amount,
            collectorMintDTO.artistSigner,
            collectorMintDTO.price,
            collectorMintDTO.collectorMintId
        );

        return encodedData;
    }
}
