// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.18;

import "@openzeppelin/contracts/utils/Counters.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";

error UseThisFunctionForEOA();
error UseThisFunctionForContract();
error YouCannotUpdateThisMemoir();

/// @title A contract responsible by allow new address to create a memoir.
/// A memoir is a form of expression that the artist or any user of the platform can use
/// to show your feelings related to art or the current moment.
/// @author Mint Gold Dust LLC
/// @custom:contact klvh@mintgolddust.io
contract MintGoldDustMemoir is Initializable {
    mapping(address => mapping(uint256 => bytes)) public userCounterMemoirs;
    mapping(address => uint256) public userCounter;

    function initialize() public initializer {
        // Empty initializer function for the upgrade proxy pattern
    }

    event EOAMemoirCreated(
        address indexed externallyOwnedAccount,
        uint256 counter,
        bytes memoir
    );

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
    function addMemoirForEOA(address _eoa, bytes calldata _memoir) public {
        if (isContract(_eoa)) {
            revert UseThisFunctionForEOA();
        }
        uint256 next = userCounter[_eoa] + 1;
        userCounterMemoirs[_eoa][next] = _memoir;
        userCounter[_eoa] = next;

        emit EOAMemoirCreated(_eoa, next, _memoir);
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
}
