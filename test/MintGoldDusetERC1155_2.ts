const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("MintGoldDustERC1155", function() {
  let mgdCompany;
  let mgdNft1155;
  let owner, artist, collaborator1, collaborator2, collaborator3, collaborator4;
  let baseURI = "https://example.com/metadata/";
  let tokenURI = "1";
  let royalty = 5000; // 5% expressed in basis points
  let amount = 10;

  before(async function() {
    [owner, artist, collaborator1, collaborator2, collaborator3, collaborator4] = await ethers.getSigners();

    const MGDCompany = await ethers.getContractFactory("MGDCompany");
    mgdCompany = await MGDCompany.deploy();
    await mgdCompany.deployed();

    const MintGoldDustERC1155 = await ethers.getContractFactory("MintGoldDustERC1155");
    mgdNft1155 = await MintGoldDustERC1155.deploy();
    await mgdNft1155.deployed();

    await mgdNft1155.initializeChild(mgdCompany.address, baseURI);

    // let's assume that the artist needs to be approved by MGDCompany
    await mgdCompany.approveArtist(artist.address, { from: owner.address });
  });

  it("Should mint a new NFT", async function() {
    const tokenId = await mgdNft1155.connect(artist).mintNft(tokenURI, royalty, amount);
    expect(tokenId).to.be.a('number');
    expect(await mgdNft1155.tokenIdArtist(tokenId)).to.equal(artist.address);
    expect(await mgdNft1155.tokenIdRoyaltyPercent(tokenId)).to.equal(royalty);
    expect(await mgdNft1155.balanceOf(artist.address, tokenId)).to.equal(amount);
  });

  it("Should fail to mint a new NFT due to lack of artist approval", async function() {
    await expect(
      mgdNft1155.connect(collaborator1).mintNft(tokenURI, royalty, amount)
    ).to.be.revertedWith("MGDnftUnauthorized");
  });

  it("Should retrieve correct token URI", async function() {
    const tokenId = await mgdNft1155.connect(artist).mintNft(tokenURI, royalty, amount);
    expect(await mgdNft1155.uri(tokenId)).to.equal(baseURI + tokenURI);
  });

  // Add more tests based on your specific functionalities.
});