import exp from "constants";

async function generateDomainSeparator(
  contractName: string,
  version: string,
  chainId: number,
  verifyingContractAddress: string
) {
  const ethers = require("ethers");

  const EIP712_DOMAIN_NAME = contractName;
  const EIP712_DOMAIN_VERSION = version;
  const EIP712_DOMAIN_CHAIN_ID = chainId;
  const EIP712_DOMAIN_VERIFIYING_CONTRACT_ADDRESS = verifyingContractAddress;

  const domain = {
    name: EIP712_DOMAIN_NAME,
    version: EIP712_DOMAIN_VERSION,
    chainId: EIP712_DOMAIN_CHAIN_ID,
    verifyingContract: EIP712_DOMAIN_VERIFIYING_CONTRACT_ADDRESS,
  };

  const domainSeparator = ethers.utils.keccak256(
    ethers.utils.defaultAbiCoder.encode(
      ["bytes32", "bytes32", "bytes32", "uint256", "address"],
      [
        ethers.utils.id(
          "EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)"
        ),
        ethers.utils.id(domain.name),
        ethers.utils.id(domain.version),
        domain.chainId,
        domain.verifyingContract,
      ]
    )
  );

  return domainSeparator;
}

export default generateDomainSeparator;
