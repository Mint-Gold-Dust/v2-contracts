import { JsonRpcSigner } from "@ethersproject/providers";
import generateDomainSeparator from "./generateDomainSeparator";
import { TypedDataEncoder } from "@ethersproject/hash/lib/typed-data";

interface DomainSeparator {
  contractName: string;
  version: string;
  chainId: number;
  verifyingContractAddress: string;
}

interface EIP712Return {
  typedData: any;
  typedDataHash: string;
  signature: string;
}

async function generateEIP712(
  domainSeparator: DomainSeparator,
  structData: any,
  signer: JsonRpcSigner
): Promise<EIP712Return> {
  const typedData = {
    domain: {
      name: domainSeparator.contractName,
      version: domainSeparator.version,
      chainId: domainSeparator.chainId,
      verifyingContract: domainSeparator.verifyingContractAddress,
    },
    types: {
      CollectorDTO: [
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
        // Include any additional properties and their types
      ],
      // Include additional struct types if necessary
    },
    message: structData,
  };

  console.log(
    "AQUIIIIIIIIIIIII!!!! ",
    TypedDataEncoder.encode(
      typedData.domain,
      typedData.types,
      typedData.message
    )
  );

  const typedDataHash = ethers.utils.keccak256(
    (typedData.domain, typedData.types, typedData.message)
  );

  const data = signer._signTypedData(
    typedData.domain,
    typedData.types,
    typedData.message
  );
  console.log("SIGNED TYPED DATA: ", data);
  const signature = await signer.signMessage(typedDataHash);

  return { typedData, typedDataHash, signature };
}

export default generateEIP712;
