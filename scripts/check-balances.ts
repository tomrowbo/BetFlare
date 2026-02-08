import { ethers } from 'hardhat';

const PERSONAL_ACCOUNT = '0x697B626A5170Dce7028A6cBb7bA494b0cA5C8DB4';
const FXRP = '0x0b6A3645c240605887a5532109323A3E12273dc7';
const VAULT = '0xB2569b2fbeA31A4f8ECaCF6Dd1fDC53157107F87';
const USDT = '0xC1A5B41512496B80903D1f32d6dEa3a73212E71F';

const erc20Abi = ['function balanceOf(address) view returns (uint256)'];

async function main() {
  const fxrp = new ethers.Contract(FXRP, erc20Abi, ethers.provider);
  const vault = new ethers.Contract(VAULT, erc20Abi, ethers.provider);
  const usdt = new ethers.Contract(USDT, erc20Abi, ethers.provider);

  const fxrpBalance = await fxrp.balanceOf(PERSONAL_ACCOUNT);
  const vaultBalance = await vault.balanceOf(PERSONAL_ACCOUNT);
  const usdtBalance = await usdt.balanceOf(PERSONAL_ACCOUNT);

  console.log('\nPersonal Account:', PERSONAL_ACCOUNT);
  console.log('FXRP Balance:', ethers.formatUnits(fxrpBalance, 6), 'FXRP');
  console.log('USDT Balance:', ethers.formatUnits(usdtBalance, 6), 'USDT');
  console.log('Vault Balance:', ethers.formatUnits(vaultBalance, 6), 'shares');
}

main().catch(console.error);
