import { Wallet } from 'xrpl';

const wallet = Wallet.generate();
console.log('\n========== NEW XRPL TESTNET WALLET ==========');
console.log('Address:', wallet.address);
console.log('Seed:', wallet.seed);
console.log('\nFund this address at: https://xrpl.org/resources/dev-tools/xrp-testnet-faucet');
console.log('Then add to .env: XRPL_SEED=' + wallet.seed);
console.log('==============================================\n');
