//SPDX-License-Identifier: Unlicense
pragma solidity 0.8.18;

/// @title Mint Gold Dust Company
/// @author Mint Gold Dust LLC
/// @custom:contact klvh@mintgolddust.io

interface IMGDCompany {
    event ArtistWhitelisted(address artistAddress, bool state);

    event ValidatorAdded(address validatorAddress, bool state);
}
