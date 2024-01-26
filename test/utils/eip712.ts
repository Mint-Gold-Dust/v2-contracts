import { BigNumber, ethers } from "ethers";

interface CollectorMintDTO {
  nft: string;
  tokenURI: string;
  royalty: BigNumber;
  memoir: Uint8Array;
  collaborators: string[];
  ownersPercentage: number[];
  amount: number;
  artistSigner: string;
  price: BigNumber;
  collectorMintId: number;
}

const collectorMintDTOType: any = [
  { name: "nft", type: "address" },
  { name: "tokenURI", type: "string" },
  { name: "royalty", type: "uint256" },
  { name: "memoir", type: "bytes" },
  { name: "collaborators", type: "address[]" },
  { name: "ownersPercentage", type: "uint256[]" },
  { name: "amount", type: "uint256" },
  { name: "artistSigner", type: "address" },
  { name: "price", type: "uint256" },
  { name: "collectorMintId", type: "uint256" },
];

function encodeData(collectorMintDTO: CollectorMintDTO): string {
  const encoder = new ethers.utils.AbiCoder();
  const encodedData = encoder.encode(collectorMintDTOType, [
    collectorMintDTO.nft,
    collectorMintDTO.tokenURI,
    collectorMintDTO.royalty,
    collectorMintDTO.memoir,
    collectorMintDTO.collaborators,
    collectorMintDTO.ownersPercentage,
    collectorMintDTO.amount,
    collectorMintDTO.artistSigner,
    collectorMintDTO.price,
    collectorMintDTO.collectorMintId,
  ]);

  return encodedData;
}

// function generateCollectorMintDTOHash(
//   collectorMintDTO: CollectorMintDTO,
//   collectorMintId: number
// ): string {
//   let encodedDataHash = ethers.utils.keccak256(
//     ethers.utils.defaultAbiCoder.encode(
//       [
//         "address",
//         "string",
//         "uint256",
//         "bytes",
//         "address[]",
//         "uint256[]",
//         "uint256",
//         "address",
//         "uint256",
//         "uint256",
//       ],
//       [
//         collectorMintDTO.nft,
//         collectorMintDTO.tokenURI,
//         collectorMintDTO.royalty,
//         collectorMintDTO.memoir,
//         collectorMintDTO.collaborators,
//         collectorMintDTO.ownersPercentage,
//         collectorMintDTO.amount,
//         collectorMintDTO.artistSigner,
//         collectorMintDTO.price,
//         collectorMintId,
//       ]
//     )
//   );

//   return encodedDataHash;
// }

function generateEIP712Hash(
  encodedData: string,
  domainSeparator: any
): Uint8Array {
  const domainSeparatorHex = ethers.utils.keccak256(
    ethers.utils.defaultAbiCoder.encode(
      ["bytes32", "bytes32", "bytes32", "uint256", "address"],
      [
        ethers.utils.id(
          "EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)"
        ),
        ethers.utils.id(domainSeparator.name),
        ethers.utils.id(domainSeparator.version),
        domainSeparator.chainId,
        domainSeparator.verifyingContract,
      ]
    )
  );

  /**
   * TODO Tomorrow do this step on chain
   */

  const encodedDataHash = ethers.utils.keccak256(
    ethers.utils.defaultAbiCoder.encode(
      ["bytes1", "bytes1", "bytes32", "bytes"],
      ["0x19", "0x01", domainSeparatorHex, encodedData]
    )
  );

  const hashBytes32 = ethers.utils.arrayify(encodedDataHash);

  return hashBytes32;
}

async function signData(
  hash: Uint8Array,
  signer: ethers.Signer
): Promise<string> {
  const signature = await signer.signMessage(hash);
  return signature;
}

export { encodeData, generateEIP712Hash, signData };
