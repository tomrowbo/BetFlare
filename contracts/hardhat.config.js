require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config({ path: "../.env" });

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: "0.8.20",
  paths: {
    sources: "./src",
    cache: "./cache",
    artifacts: "./artifacts",
    root: ".",
  },
  networks: {
    coston2: {
      url: "https://coston2-api.flare.network/ext/C/rpc",
      accounts: process.env.MNEMONIC
        ? { mnemonic: process.env.MNEMONIC }
        : process.env.PRIVATE_KEY
        ? [process.env.PRIVATE_KEY]
        : [],
      chainId: 114,
    },
    flare: {
      url: "https://flare-api.flare.network/ext/C/rpc",
      accounts: process.env.MNEMONIC
        ? { mnemonic: process.env.MNEMONIC }
        : process.env.PRIVATE_KEY
        ? [process.env.PRIVATE_KEY]
        : [],
      chainId: 14,
    },
  },
};
