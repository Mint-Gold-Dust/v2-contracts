import { ethers } from "hardhat";
import { BigNumber } from "ethers";
import { impersonate, stopImpersonating } from "../../utils/impersonate";
import {
  CollectorMintDTO,
  encodeData,
  generateEIP712Hash,
} from "../../utils/eip712";
import generateWallet from "../../utils/generateWallet";
import setTimestampNexBlock from "../../utils/setTimestampNextBlock";
import dealEth from "../../utils/dealEth";

export const ONE_DAY = 86400;
export const ONE_SECOND = 1;

export const DEBUG = true;

// Production contract addresses
const ADDR_mgdNft721 = "0x4B0Dc0900dDe9d4f15115Bee56554857AE0Becb0";
const ADDR_mgdNft1155 = "0x47356C2EFdf0eA13eF48ecAE9651D6BB8a524dd9";
const ADDR_mgdCompany = "0x2f00435f003d6568933586b4A272c6c6B481e0aD";
const ADDR_mgdSetPrice = "0x76cDa4e918581c4a57CB3e65975768c5F295f4D9";
const ADDR_mgdAuction = "0x27a4640985328E19016f665632204dcdB48B1fD6";
const ADDR_proxyAdmin = "0x53E3a7Ece7555c5bC69AfbD8Df8Df7b056339Ab0";

// Test artists
const ADDR_artist1 = "0x5B38Da6a701c568545dCfcB03FcB875f56beddC4";
const ADDR_artist2 = "0xAb8483F64d9C6d1EcF9b849Ae677dD3315835cb2";
let ADDR_artist3;

// Test collectors
const ADDR_collector1 = "0x78731D3Ca6b7E34aC0F824c42a7cC18A495cabaB";
const ADDR_collector2 = "0x617F2E2fD72FD9D5503197092aC168c91465E7f2";
const ADDR_collector3 = "0x17F6AD8Ef982297579C203069C1DbfFE4348c372";

// NFt dummy mint test data
const FAKE_URI = "https://www.mynft.wtf";
const FAKE_MEMOIR = new TextEncoder().encode("This is my NFT memoir");
const FAKE_ROYALTY = ethers.utils.parseEther("10");
const PERCENT_20 = ethers.utils.parseEther("20");
const PERCENT_15 = ethers.utils.parseEther("15");
const PERCENT_65 = ethers.utils.parseEther("65");
export const LOW_PRICE = ethers.utils.parseEther("0.01");
const DOMAIN_SEPARATOR = {
  name: "MintGoldDustSetPrice",
  version: "1.0.0",
  chainId: 31337,
  verifyingContract: ADDR_mgdSetPrice,
};

export function addCollectorFee(bigish: BigNumber) {
  return bigish.add(bigish.mul("3").div("100"));
}

export async function rpssSetup() {
  /**
   * Scenarios for the test setup:
   * -----------------------------------------
   *                             Execute before
   * Artist  tokenId  Collector     upgrade
   * -----------------------------------------
   * A1 721   (1)  => C1 (setPrice)  X
   * A1 721   (2)  => C2 (setPrice)
   * A1 721   (3)  => C3 (auction)   X
   * A1 721   (4)  => C1 (auction)
   * A2 1155  (1)  => C2 (setPrice)  X
   * A2 1155  (2)  => C3 (setPrice)
   * A2 1155  (3)  => C1 (auction)   X
   * A2 1155  (4)  => C2 (auction)
   * A3 721   (5)  => C3 (collectorMint)  X
   * A3 721   (6)  => C1 (collectorMint)
   * A3 1155  (5)  => C2 (collectorMint)  X
   * A3 1155  (6)  => C3 (collectorMint)
   * -----------------------------------------
   */
  if (DEBUG) console.log("rpssSetup");
  // Instantiate artist and collector signers
  const artist1 = await ethers.getSigner(ADDR_artist1);
  const artist2 = await ethers.getSigner(ADDR_artist2);
  const artist3 = await generateWallet(ethers.provider); // Needs to be a capable of signing
  const collector1 = await ethers.getSigner(ADDR_collector1);
  const collector2 = await ethers.getSigner(ADDR_collector2);
  const collector3 = await ethers.getSigner(ADDR_collector3);

  ADDR_artist3 = artist3.address;

  // Deal ETH to test accounts
  await dealEth(ADDR_artist1, 10);
  await dealEth(ADDR_artist2, 10);
  await dealEth(ADDR_artist3, 10);
  await dealEth(ADDR_collector1, 10);
  await dealEth(ADDR_collector2, 10);
  await dealEth(ADDR_collector3, 10);

  // Instantiate contracts
  const mgd721 = await ethers.getContractAt(
    "MintGoldDustERC721",
    ADDR_mgdNft721
  );
  const mgd1155 = await ethers.getContractAt(
    "MintGoldDustERC1155",
    ADDR_mgdNft1155
  );
  const mgdCompany = await ethers.getContractAt(
    "MintGoldDustCompany",
    ADDR_mgdCompany
  );
  const mgdSetPrice = await ethers.getContractAt(
    "MintGoldDustSetPrice",
    ADDR_mgdSetPrice
  );
  const mgdAuction = await ethers.getContractAt(
    "MintGoldDustMarketplaceAuction",
    ADDR_mgdAuction
  );

  if (DEBUG) console.log("rpssSetup-all contracts instantiated");

  // Get company owner signer and also set a new pubkey
  const mgdOwnerSigner = await ethers.getSigner(await mgdCompany.owner());

  dealEth(mgdOwnerSigner.address, 10);

  // Instantiate proxy admin after owner signer has been set
  const proxyAdmin = new ethers.Contract(
    ADDR_proxyAdmin,
    [
      "function upgrade(address proxy, address implementation)",
      "function getProxyImplementation(address proxy) view returns (address)",
    ],
    mgdOwnerSigner
  );

  const mgdWallet = await generateWallet(ethers.provider);
  await impersonate(mgdOwnerSigner.address);
  await mgdCompany.connect(mgdOwnerSigner).setPublicKey(mgdWallet.address);

  // Make artists whitelisted
  await impersonate(mgdOwnerSigner.address);
  await mgdCompany.connect(mgdOwnerSigner).whitelist(ADDR_artist1, true);
  await mgdCompany.connect(mgdOwnerSigner).whitelist(ADDR_artist2, true);
  await mgdCompany.connect(mgdOwnerSigner).whitelist(ADDR_artist3, true);

  if (DEBUG) console.log("rpssSetup-artists whitelisted");

  // artists mint and list NFTs

  // artist1 mints and lists 721 NFTs; both normal and split
  await impersonate(ADDR_artist1);
  await mgd721.connect(artist1).setApprovalForAll(mgdSetPrice.address, true);
  await mgd721.connect(artist1).setApprovalForAll(mgdAuction.address, true);

  const tokenId721_0 = await mgd721._tokenIds();
  const tokenId721_1 = tokenId721_0.add(1);
  const tokenId721_2 = tokenId721_1.add(1);
  const tokenId721_3 = tokenId721_2.add(1);
  const tokenId721_4 = tokenId721_3.add(1);
  const tokenId721_5 = tokenId721_4.add(1);
  const tokenId721_6 = tokenId721_5.add(1);

  await mgd721.connect(artist1).mintNft(FAKE_URI, FAKE_ROYALTY, 1, FAKE_MEMOIR);
  await mgd721
    .connect(artist1)
    .splitMint(
      FAKE_URI,
      FAKE_ROYALTY,
      [ADDR_artist2, ADDR_artist3],
      [PERCENT_20, PERCENT_15, PERCENT_65],
      1,
      FAKE_MEMOIR
    );
  await mgd721.connect(artist1).mintNft(FAKE_URI, FAKE_ROYALTY, 1, FAKE_MEMOIR);
  await mgd721
    .connect(artist1)
    .splitMint(
      FAKE_URI,
      FAKE_ROYALTY,
      [ADDR_artist2, ADDR_artist3],
      [PERCENT_20, PERCENT_15, PERCENT_65],
      1,
      FAKE_MEMOIR
    );

  await mgdSetPrice
    .connect(artist1)
    .list(tokenId721_1, 1, mgd721.address, LOW_PRICE);
  await mgdSetPrice
    .connect(artist1)
    .list(tokenId721_2, 1, mgd721.address, LOW_PRICE);
  await mgdAuction
    .connect(artist1)
    .list(tokenId721_3, 1, mgd721.address, LOW_PRICE);
  await mgdAuction
    .connect(artist1)
    .list(tokenId721_4, 1, mgd721.address, LOW_PRICE);

  if (DEBUG) console.log("rpssSetup-artist1 721s minted and listed");

  // artist2 mints and lists 1155 NFTs; both normally and split
  await impersonate(ADDR_artist2);
  await mgd1155.connect(artist2).setApprovalForAll(mgdSetPrice.address, true);
  await mgd1155.connect(artist2).setApprovalForAll(mgdAuction.address, true);

  const tokenId1155_0 = await mgd1155._tokenIds();
  const tokenId1155_1 = tokenId1155_0.add(1);
  const tokenId1155_2 = tokenId1155_1.add(1);
  const tokenId1155_3 = tokenId1155_2.add(1);
  const tokenId1155_4 = tokenId1155_3.add(1);
  const tokenId1155_5 = tokenId1155_4.add(1);
  const tokenId1155_6 = tokenId1155_5.add(1);

  await mgd1155
    .connect(artist2)
    .mintNft(FAKE_URI, FAKE_ROYALTY, 10, FAKE_MEMOIR);
  await mgd1155
    .connect(artist2)
    .splitMint(
      FAKE_URI,
      FAKE_ROYALTY,
      [ADDR_artist1, ADDR_artist3],
      [PERCENT_20, PERCENT_15, PERCENT_65],
      10,
      FAKE_MEMOIR
    );
  await mgd1155
    .connect(artist2)
    .mintNft(FAKE_URI, FAKE_ROYALTY, 10, FAKE_MEMOIR);
  await mgd1155
    .connect(artist2)
    .splitMint(
      FAKE_URI,
      FAKE_ROYALTY,
      [ADDR_artist1, ADDR_artist3],
      [PERCENT_20, PERCENT_15, PERCENT_65],
      10,
      FAKE_MEMOIR
    );

  await mgdSetPrice
    .connect(artist2)
    .list(tokenId1155_1, 10, mgd1155.address, LOW_PRICE);
  await mgdSetPrice
    .connect(artist2)
    .list(tokenId1155_2, 10, mgd1155.address, LOW_PRICE);
  await mgdAuction
    .connect(artist2)
    .list(tokenId1155_3, 1, mgd1155.address, LOW_PRICE);
  await mgdAuction
    .connect(artist2)
    .list(tokenId1155_4, 1, mgd1155.address, LOW_PRICE);

  await stopImpersonating(ADDR_artist2);

  if (DEBUG) console.log("rpssSetup-artist2 1155s minted and listed");

  // artist3 collector mints 721 and  1155 NFTs;
  const collector721DTO_1: CollectorMintDTO = {
    nft: mgd721.address,
    tokenURI: FAKE_URI,
    royalty: FAKE_ROYALTY,
    memoir: FAKE_MEMOIR,
    collaborators: [],
    ownersPercentage: [],
    amount: 1,
    artistSigner: ADDR_artist3,
    price: LOW_PRICE,
    collectorMintId: 100,
  };
  const hash721_1 = generateEIP712Hash(
    encodeData(collector721DTO_1),
    DOMAIN_SEPARATOR
  );
  const artistSignature721_1 = await artist3.signMessage(hash721_1);
  const mgdSignature721_1 = await mgdWallet.signMessage(hash721_1);

  const collector721DTO_2: CollectorMintDTO = {
    nft: mgd721.address,
    tokenURI: FAKE_URI,
    royalty: FAKE_ROYALTY,
    memoir: FAKE_MEMOIR,
    collaborators: [ADDR_artist1, ADDR_artist2],
    ownersPercentage: [PERCENT_20, PERCENT_15, PERCENT_65],
    amount: 1,
    artistSigner: ADDR_artist3,
    price: LOW_PRICE,
    collectorMintId: 101,
  };
  const hash721_2 = generateEIP712Hash(
    encodeData(collector721DTO_2),
    DOMAIN_SEPARATOR
  );
  const artistSignature721_2 = await artist3.signMessage(hash721_2);
  const mgdSignature721_2 = await mgdWallet.signMessage(hash721_2);

  const collector1155DTO_1: CollectorMintDTO = {
    nft: mgd1155.address,
    tokenURI: FAKE_URI,
    royalty: FAKE_ROYALTY,
    memoir: FAKE_MEMOIR,
    collaborators: [],
    ownersPercentage: [],
    amount: 10,
    artistSigner: ADDR_artist3,
    price: LOW_PRICE,
    collectorMintId: 103,
  };
  const hash1155_1 = generateEIP712Hash(
    encodeData(collector1155DTO_1),
    DOMAIN_SEPARATOR
  );
  const artistSignature1155_1 = await artist3.signMessage(hash1155_1);
  const mgdSignature1155_1 = await mgdWallet.signMessage(hash1155_1);

  const collector1155DTO_2: CollectorMintDTO = {
    nft: mgd1155.address,
    tokenURI: FAKE_URI,
    royalty: FAKE_ROYALTY,
    memoir: FAKE_MEMOIR,
    collaborators: [],
    ownersPercentage: [],
    amount: 10,
    artistSigner: ADDR_artist3,
    price: LOW_PRICE,
    collectorMintId: 104,
  };
  const hash1155_2 = generateEIP712Hash(
    encodeData(collector1155DTO_2),
    DOMAIN_SEPARATOR
  );
  const artistSignature1155_2 = await artist3.signMessage(hash1155_2);
  const mgdSignature1155_2 = await mgdWallet.signMessage(hash1155_2);

  await mgd721.connect(artist3).setApprovalForAll(mgdSetPrice.address, true);
  await mgd721.connect(artist3).setApprovalForAll(mgdAuction.address, true);
  await mgd1155.connect(artist3).setApprovalForAll(mgdSetPrice.address, true);
  await mgd1155.connect(artist3).setApprovalForAll(mgdAuction.address, true);

  if (DEBUG)
    console.log(
      "rpssSetup-artist3 collector mint DTOS ready and approvals set"
    );

  // Collectors buy/bids NFTs

  // All direct purchases
  await impersonate(ADDR_collector1);
  await mgdSetPrice.connect(collector1).purchaseNft(
    {
      tokenId: tokenId721_1,
      amount: 1,
      nft: mgd721.address,
      seller: ADDR_artist1,
    },
    {
      value: addCollectorFee(LOW_PRICE),
    }
  );
  await impersonate(ADDR_collector2);
  await mgdSetPrice.connect(collector2).purchaseNft(
    {
      tokenId: tokenId1155_1,
      amount: 1,
      nft: mgd1155.address,
      seller: ADDR_artist2,
    },
    {
      value: addCollectorFee(LOW_PRICE),
    }
  );

  // All auction purchases
  await impersonate(ADDR_collector3);
  await mgdAuction.connect(collector3).placeBid(
    {
      tokenId: tokenId721_3,
      nft: mgd721.address,
      seller: ADDR_artist1,
    },
    {
      value: addCollectorFee(LOW_PRICE),
    }
  );
  await impersonate(ADDR_collector1);
  await mgdAuction.connect(collector1).placeBid(
    {
      tokenId: tokenId1155_3,
      nft: mgd1155.address,
      seller: ADDR_artist2,
    },
    {
      value: addCollectorFee(LOW_PRICE),
    }
  );

  const blockNum = await ethers.provider.getBlockNumber();
  const block = await ethers.provider.getBlock(blockNum);
  const timestamp = block.timestamp;

  await setTimestampNexBlock(timestamp + ONE_DAY + ONE_SECOND);

  await impersonate(ADDR_collector3);
  await mgdAuction.connect(collector3).endAuction({
    tokenId: tokenId721_3,
    nft: mgd721.address,
    seller: ADDR_artist1,
  });
  await impersonate(ADDR_collector1);
  await mgdAuction.connect(collector1).endAuction({
    tokenId: tokenId1155_3,
    nft: mgd1155.address,
    seller: ADDR_artist2,
  });

  // All collector mint purchases
  await impersonate(ADDR_collector3);
  await mgdSetPrice
    .connect(collector3)
    .collectorMintPurchase(
      collector721DTO_1,
      hash721_1,
      artistSignature721_1,
      mgdSignature721_1,
      1,
      {
        value: addCollectorFee(LOW_PRICE),
      }
    );

  await impersonate(ADDR_collector2);
  await mgdSetPrice
    .connect(collector2)
    .collectorMintPurchase(
      collector1155DTO_1,
      hash1155_1,
      artistSignature1155_1,
      mgdSignature1155_1,
      1,
      {
        value: addCollectorFee(LOW_PRICE),
      }
    );

  await stopImpersonating(ADDR_collector2);

  if (DEBUG) console.log("rpssSetup done");

  return {
    artist1,
    artist2,
    artist3,
    collector1,
    collector2,
    collector3,
    mgd721,
    mgd1155,
    mgdCompany,
    mgdSetPrice,
    mgdAuction,
    mgdOwnerSigner,
    mgdWallet,
    proxyAdmin,
    collector721DTO_1,
    collector721DTO_2,
    collector1155DTO_1,
    collector1155DTO_2,
    hash721_1,
    artistSignature721_1,
    mgdSignature721_1,
    hash721_2,
    artistSignature721_2,
    mgdSignature721_2,
    hash1155_1,
    artistSignature1155_1,
    mgdSignature1155_1,
    hash1155_2,
    artistSignature1155_2,
    mgdSignature1155_2,
    tokenId721_1,
    tokenId721_2,
    tokenId721_3,
    tokenId721_4,
    tokenId721_5,
    tokenId721_6,
    tokenId1155_1,
    tokenId1155_2,
    tokenId1155_3,
    tokenId1155_4,
    tokenId1155_5,
    tokenId1155_6,
  };
}
