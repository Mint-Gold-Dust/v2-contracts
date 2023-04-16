// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.18;

import "@openzeppelin/contracts/utils/Counters.sol";

error UseThisFunctionForEOA();
error UseThisFunctionForContract();
error YouCannotUpdateThisMemoir();

/// @title A contract responsible by allow new address to create a memoir.
/// A memoir is a form of expression that the artist or any user of the platform can use
/// to show your feelings related to art or the current moment.
/// @author Mint Gold Dust LLC
/// @custom:contact klvh@mintgolddust.io
contract MGDMemoir {
    mapping(address => mapping(uint256 => bytes)) public contractTokenIdMemoirs;
    mapping(address => mapping(uint256 => bytes)) public userCounterMemoirs;
    mapping(address => uint256) public userCounter;

    /**
     *
     * @notice that function creates a new memoir for some token id related with some contract address.
     *
     * @param _contract is the address of the contract that contains the token id that
     * the memoir will be related with.
     * @param _tokenId is the token id that will be linked with the memoir.
     * @param _memoir is the string that represents the memoir.
     * @notice that this string is calldata type because we don't have a limit of
     * length for this memoir. So we handle this string inside our function.
     *
     * @dev This function must be used only for Contract address.
     *    - Verification:
     *        - Verify if the address is really a Contract. If not reverts with
     *          the UseThisFunctionForContract error.
     *
     *    - Important:
     *        - Here is not verified if who is trying to create the memoir is
     *        the owner of the token.
     *        Take care of do it in your business logic.
     */
    function addMemoirForContract(
        address _contract,
        uint256 _tokenId,
        string calldata _memoir
    ) public memoirNotExists(_tokenId, _contract) {
        if (!isContract(_contract)) {
            revert UseThisFunctionForContract();
        }

        bytes memory _memoirBytes = bytes(_memoir);
        bytes memory _memoirBuffer = new bytes(_memoirBytes.length);

        for (uint i = 0; i < _memoirBytes.length; i++) {
            _memoirBuffer[i] = _memoirBytes[i];
        }

        contractTokenIdMemoirs[_contract][_tokenId] = _memoirBuffer;
    }

    /**
     *
     * @notice that function creates a new memoir for some EOA address.
     *
     * @param _eoa is the address of the user that is creating its memoirs.
     * @param _memoir is the string that represents the memoir.
     * @notice that this string is calldata type because we don't have a limit of
     * length for this memoir. So we handle this string inside our function.
     *
     * @dev This function must be used only for Externally Owned Accounts.
     *    - Verification:
     *        - Verify if the address is really an EOA. If not reverts with
     *          the UseThisFunctionForEOA error.
     *    - Requirements:
     *        - Exists a counter for the quantity of memoirs for some EOA.
     *        - At the moment to create a memoir for this address we need
     *        to verify the last state of the counter and add more one
     *        before update the mapping for this user.
     */
    function addMemoirForEOA(address _eoa, string calldata _memoir) public {
        if (isContract(_eoa)) {
            revert UseThisFunctionForEOA();
        }

        bytes memory _memoirBytes = bytes(_memoir);
        bytes memory _memoirBuffer = new bytes(_memoirBytes.length);

        for (uint i = 0; i < _memoirBytes.length; i++) {
            _memoirBuffer[i] = _memoirBytes[i];
        }

        uint256 next = userCounter[_eoa] + 1;
        userCounterMemoirs[_eoa][next] = _memoirBuffer;
        userCounter[_eoa] = next;
    }

    /**
     *
     * @notice that this function verifies if an address is or not a contract address.
     * @param addr is the address to be verified.
     */
    function isContract(address addr) private view returns (bool) {
        uint256 size;
        assembly {
            size := extcodesize(addr)
        }
        return size > 0;
    }

    /**
     * @notice that this modifier check if there is not yet a memoir for
     * a given id token existing in a given NFT contract (ERC721 or ERC1155).
     * If it already exists it reverts with a YouCannotUpdateThisMemoir error.
     *
     * @param _tokenId the token id for the NFT.
     * @param _contract the contract address where this token id exists.
     */
    modifier memoirNotExists(uint256 _tokenId, address _contract) {
        if (contractTokenIdMemoirs[_contract][_tokenId].length != 0) {
            revert YouCannotUpdateThisMemoir();
        }
        _;
    }
}
