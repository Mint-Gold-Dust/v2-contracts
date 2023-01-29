# MGD Smart Contracts V2

If you starting now at this project, please do the next configurations:

Install the VSCode extension:

```
code --install-extension esbenp.prettier-vscode
```

In VSCode Open User Settings (JSON), add:

```
{
  "editor.formatOnSave": true,
  "[solidity]": {
    "editor.defaultFormatter": "esbenp.prettier-vscode"
  }
}
```

Some of the following tasks:

```shell
npx hardhat help
npx hardhat test
REPORT_GAS=true npx hardhat test
npx hardhat node
npx hardhat run scripts/deploy.ts
```
