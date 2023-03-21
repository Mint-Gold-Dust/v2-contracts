async function upgrade() {
  const proxyAddress = "<PROXY_CONTRACT_ADDRESS>";
  const MyUpgradeableContractV2 = await ethers.getContractFactory(
    "MyUpgradeableContractV2"
  );
  const upgradedContract = await upgrades.upgradeProxy(
    proxyAddress,
    MyUpgradeableContractV2
  );

  console.log(
    "MyUpgradeableContract upgraded to V2 at:",
    upgradedContract.address
  );
}

upgrade()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
