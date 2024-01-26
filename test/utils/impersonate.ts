import { network } from "hardhat";

/**
 * @notice Call this method to impersonate an address in hardhat
 * @param address the address to impersonate
 */
export async function impersonate(address: string) {
  await network.provider.request({
    method: "hardhat_impersonateAccount",
    params: [address],
  });
}

/**
 * @notice Call this method to stop impersonating an address in hardhat
 * @param address the address to stop impersonating
 */
export async function stopImpersonating(address: string) {
  await network.provider.request({
    method: "hardhat_stopImpersonatingAccount",
    params: [address],
  });
}
