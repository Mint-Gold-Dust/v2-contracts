import { ethers } from "ethers";

const collectorMintDTOType: any = [
  { name: "contractAddress", type: "address" },
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

function encodeData(data: any): string {
  const encoder = new ethers.utils.AbiCoder();
  const encodedData = encoder.encode(collectorMintDTOType, [
    data.contractAddress,
    data.tokenURI,
    data.royalty,
    data.memoir,
    data.collaborators,
    data.ownersPercentage,
    data.amount,
    data.artistSigner,
    data.price,
    data.collectorMintId,
  ]);

  console.log("ESSE DANADO AGORA: ", encodedData);
  return encodedData;
}

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

  console.log("SO ISSO IMPORTA AGORA: ", domainSeparatorHex);

  /**
   * TODO Tomorrow do this step on chain
   */

  const encodedDataHash = ethers.utils.keccak256(
    ethers.utils.defaultAbiCoder.encode(
      ["bytes1", "bytes1", "bytes32", "bytes"],
      ["0x19", "0x01", domainSeparatorHex, encodedData]
    )
  );

  console.log("encodedDataHash", encodedDataHash);

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
