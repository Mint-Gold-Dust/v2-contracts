import { ethers } from "hardhat";

// Define the domain separator data
const DOMAIN_TYPE = [
  { name: "name", type: "string" },
  { name: "version", type: "string" },
  { name: "chainId", type: "uint256" },
  { name: "verifyingContract", type: "address" },
];

// Define the CollectorDTO type
const COLLECTOR_DTO_TYPE = [
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

async function generateNewEIP712(collectorDTO: any, signer: any) {
  // Retrieve the signer

  // Generate the domain separator
  const domainSeparator = ethers.utils.keccak256(
    ethers.utils.defaultAbiCoder.encode(
      ["bytes32", "bytes32", "uint256", "address"],
      [
        ethers.utils.keccak256(
          ethers.utils.defaultAbiCoder.encode(
            ["bytes32", "bytes32"],
            [
              ethers.utils.keccak256(
                ethers.utils.toUtf8Bytes(
                  "EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)"
                )
              ),
              ethers.utils.keccak256(ethers.utils.toUtf8Bytes("EIP712Example")),
            ]
          )
        ),
        ethers.utils.keccak256(ethers.utils.toUtf8Bytes("1.0")),
        ethers.provider.network.chainId,
        signer.address,
      ]
    )
  );

  // Generate the typed data hash
  const typedDataHash = ethers.utils.keccak256(
    ethers.utils.solidityPack(
      [
        "address",
        "string",
        "uint256",
        "bytes",
        "address[]",
        "uint256[]",
        "uint256",
        "address",
        "uint256",
        "uint256",
      ],
      [
        collectorDTO.contractAddress,
        collectorDTO.tokenURI,
        collectorDTO.royalty,
        collectorDTO.memoir,
        collectorDTO.collaborators,
        collectorDTO.ownersPercentage,
        collectorDTO.amount,
        collectorDTO.artistSigner,
        collectorDTO.price,
        collectorDTO.collectorMintId,
      ]
    )
  );

  // Concatenate the domain separator and typed data hash
  const dataToSign = ethers.utils.concat([domainSeparator, typedDataHash]);

  console.log("Domain Separator:", domainSeparator);
  console.log("CollectorDTO:", collectorDTO);
  console.log("Typed Data Hash:", typedDataHash);
  console.log("Data to Sign:", dataToSign);

  // Sign the data to sign
  const signature = await signer.signMessage(ethers.utils.arrayify(dataToSign));

  console.log("Signature:", signature);

  return { dataToSign, signature, domainSeparator, typedDataHash };
}

export default generateNewEIP712;
