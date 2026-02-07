<p align="center">
  <img src="frontend/public/icon.png" alt="BetFlare Logo" width="120" />
</p>

<h1 align="center">BetFlare</h1>

<p align="center">
  <strong>Decentralized Prediction Markets Powered by Flare FTSO Oracle</strong>
</p>

<p align="center">
  <a href="#"><img src="https://img.shields.io/badge/Solidity-0.8.24-363636?logo=solidity" alt="Solidity" /></a>
  <a href="#"><img src="https://img.shields.io/badge/Next.js-16-black?logo=next.js" alt="Next.js" /></a>
  <a href="#"><img src="https://img.shields.io/badge/Flare-Coston2-E62058" alt="Flare Network" /></a>
  <a href="#"><img src="https://img.shields.io/badge/License-MIT-blue" alt="License" /></a>
</p>

<p align="center">
  <a href="https://betflare.vercel.app">Live Demo</a> |
  <a href="#architecture">Architecture</a> |
  <a href="#smart-contracts">Contracts</a> |
  <a href="#getting-started">Get Started</a>
</p>

---

## Overview

BetFlare is a fully decentralized prediction market platform built on **Flare Network**, leveraging the native **FTSO (Flare Time Series Oracle)** for trustless price resolution. Users can bet on whether asset prices (like XRP) will be above or below target prices at specific times.

### Why BetFlare?

| Problem | BetFlare Solution |
|---------|-------------------|
| External oracles introduce bridge risk | Native FTSO integration - same chain, no bridges |
| Fragmented liquidity across markets | Unified liquidity pool serves all markets |
| Gas costs discourage small trades | Gasless meta-transactions (EIP-712) |
| Complex UX for prediction markets | Simple YES/NO binary outcomes |

### Key Features

- **FTSO-Powered Resolution** - Markets resolve using Flare's decentralized price feeds
- **Unified Liquidity Vault** - Single deposit, multi-market exposure
- **Constant Product AMM** - Fair pricing via `k = YES × NO` formula
- **ERC4626 Vault Standard** - Composable LP shares
- **Gasless Trading** - Sign messages, relayers pay gas
- **XRP Native Support** - Deposit XRP, auto-convert to USDT

---

## How It Works

```
                                    ┌─────────────────┐
                                    │   FTSO Oracle   │
                                    │  (Price Feeds)  │
                                    └────────┬────────┘
                                             │ resolve()
                                             ▼
┌──────────────┐    deposit()    ┌───────────────────┐    distribute()    ┌─────────────┐
│              │ ───────────────▶│                   │ ──────────────────▶│             │
│     User     │                 │  UniversalVault   │                    │   Markets   │
│   (Trader)   │                 │    (ERC4626)      │                    │   (FPMM)    │
│              │ ◀───────────────│                   │ ◀──────────────────│             │
└──────────────┘    LP shares    └───────────────────┘       fees         └─────────────┘
       │                                   │                                     │
       │ buyYes() / buyNo()               │                                     │
       └───────────────────────────────────┼─────────────────────────────────────┘
                                           │
                                    ┌──────┴──────┐
                                    │  Liquidity  │
                                    │   Router    │
                                    └─────────────┘
```

### Trading Flow

1. **User deposits USDT** → Vault mints LP shares
2. **Router distributes** → Liquidity split equally across active markets
3. **Traders buy YES/NO** → AMM prices adjust based on demand
4. **0.2% fee collected** → Routed back to vault (LPs earn)
5. **Resolution time hits** → FTSO price fetched, outcome determined
6. **Winners redeem** → 1:1 payout in USDT

---

## Architecture

### Smart Contract System

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              CORE CONTRACTS                                  │
├─────────────────┬─────────────────┬─────────────────┬───────────────────────┤
│      FPMM       │ ConditionalTokens│ UniversalVault  │   LiquidityRouter     │
│  (AMM Engine)   │   (ERC1155)      │   (ERC4626)     │   (Distribution)      │
├─────────────────┼─────────────────┼─────────────────┼───────────────────────┤
│ • buyYes/No     │ • splitPosition │ • deposit       │ • registerMarket      │
│ • sellYes/No    │ • mergePositions│ • withdraw      │ • deployLiquidity     │
│ • addLiquidity  │ • redeemPositions│ • receiveFees  │ • rebalance           │
│ • removeLiquidity│ • reportPayouts │ • depositXRP   │ • withdrawFromMarkets │
└─────────────────┴─────────────────┴─────────────────┴───────────────────────┘
                                      │
                    ┌─────────────────┴─────────────────┐
                    │         MARKET CONTRACTS          │
                    ├─────────────────┬─────────────────┤
                    │   FTSOResolver  │  MarketFactory  │
                    ├─────────────────┼─────────────────┤
                    │ • createMarket  │ • createXRPMarket│
                    │ • resolve       │ • deployFPMM    │
                    │ • getCurrentPrice│                │
                    └─────────────────┴─────────────────┘
```

---

## The AMM: Deep Dive

BetFlare uses a **Fixed Product Market Maker (FPMM)** - a variant of the constant product formula optimized for binary outcomes.

### Constant Product Formula

```
k = YES_reserve × NO_reserve
```

When a user buys YES tokens:

```solidity
// 1. Calculate fee (0.2%)
fee = investmentAmount × 20 / 10000

// 2. Net investment after fee
netInvestment = investmentAmount - fee

// 3. Preserve constant product
newNoReserve = noReserve + netInvestment
newYesReserve = k / newNoReserve

// 4. Tokens received (includes newly minted from split)
tokensReceived = yesReserve - newYesReserve + netInvestment
```

### Price Calculation

Prices are expressed as probabilities (0-100%):

```
YES_price = NO_reserve / (YES_reserve + NO_reserve)
NO_price  = YES_reserve / (YES_reserve + NO_reserve)
```

**Example:** If YES=1000, NO=3000:
- YES price = 3000/4000 = 75% (market expects YES)
- NO price = 1000/4000 = 25%

### Trade Example

```
Initial State:
  YES Reserve: 1,000 USDT
  NO Reserve:  1,000 USDT
  k = 1,000,000

User buys 100 USDT of YES:
  Fee: 0.20 USDT → vault
  Net: 99.80 USDT invests

  New NO Reserve: 1,099.80
  New YES Reserve: 1,000,000 / 1,099.80 = 909.26

  YES tokens received: 1,000 - 909.26 + 99.80 = 190.54
  Effective price: 100 / 190.54 = 0.525 USDT per YES token
```

---

## Unified Liquidity System

### The Problem with Traditional Prediction Markets

Most platforms require LPs to choose which market to provide liquidity to. This leads to:
- Fragmented liquidity
- Some markets have deep liquidity, others are illiquid
- LPs need active management

### BetFlare's Solution: Universal Vault + Router

```
┌─────────────────────────────────────────────────────────────────┐
│                       UNIVERSAL VAULT                            │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │  Total Assets = Idle Balance + Deployed + Fees Earned   │    │
│  └─────────────────────────────────────────────────────────┘    │
│                              │                                   │
│                    ┌─────────┴─────────┐                        │
│                    │  LIQUIDITY ROUTER │                        │
│                    └─────────┬─────────┘                        │
│           ┌──────────────────┼──────────────────┐               │
│           ▼                  ▼                  ▼               │
│    ┌───────────┐      ┌───────────┐      ┌───────────┐         │
│    │  Market A │      │  Market B │      │  Market C │         │
│    │  (33.3%)  │      │  (33.3%)  │      │  (33.3%)  │         │
│    └───────────┘      └───────────┘      └───────────┘         │
└─────────────────────────────────────────────────────────────────┘
```

### Rebalancing Algorithm

When a new market is added or liquidity changes:

```
Phase 1: Withdraw Excess
  For each market:
    if current_balance > target_per_market:
      withdraw(current_balance - target_per_market)

Phase 2: Deposit Deficit
  For each market:
    if current_balance < target_per_market:
      deposit(min(deficit, available_balance))
```

### LP Returns

LPs earn from multiple sources:
1. **Trading Fees** - 0.2% of all trades across all markets
2. **Resolution Gains** - If market resolves favorably for LP position
3. **Compounding** - Fees automatically increase share value

---

## FTSO Oracle Integration

### What is FTSO?

Flare Time Series Oracle is Flare's native decentralized oracle. Unlike Chainlink or other external oracles:

- **No bridge risk** - Data is on-chain natively
- **Decentralized data providers** - Multiple independent sources
- **Built into consensus** - Part of Flare's architecture

### Resolution Flow

```solidity
function resolve(bytes32 marketId) external {
    Market storage market = markets[marketId];

    // 1. Check resolution time passed
    require(block.timestamp >= market.resolutionTime, "Too early");

    // 2. Fetch FTSO price
    (uint256 price, , uint256 decimals) = ftsoRegistry
        .getCurrentPriceWithDecimals(market.symbol);

    // 3. Normalize to 5 decimals
    uint256 normalizedPrice = normalizeDecimals(price, decimals);

    // 4. Determine outcome
    bool yesWins = market.isAbove
        ? normalizedPrice > market.targetPrice
        : normalizedPrice < market.targetPrice;

    // 5. Report to ConditionalTokens
    uint256[] memory payouts = new uint256[](2);
    payouts[0] = yesWins ? 1 : 0;  // YES payout
    payouts[1] = yesWins ? 0 : 1;  // NO payout

    conditionalTokens.reportPayouts(market.questionId, payouts);
}
```

### Supported Assets

| Symbol | Asset | Decimals |
|--------|-------|----------|
| testXRP | XRP/USD | 5 |
| testBTC | BTC/USD | 5 |
| testETH | ETH/USD | 5 |
| testFLR | FLR/USD | 5 |

---

## Contract Addresses (Coston2 Testnet)

```
┌────────────────────┬──────────────────────────────────────────────┐
│ Contract           │ Address                                      │
├────────────────────┼──────────────────────────────────────────────┤
│ USDT (Collateral)  │ 0xC1A5B41512496B80903D1f32d6dEa3a73212E71F   │
│ ConditionalTokens  │ 0xCe9070d4C6940e7528b418cFB36087345f947c49   │
│ UniversalVault     │ 0xB2569b2fbeA31A4f8ECaCF6Dd1fDC53157107F87   │
│ LiquidityRouter    │ 0xD6473a91aC0C62e6F2BC1FF60e02C59B0237b4ac   │
│ FTSO Registry      │ 0x48Da21ce34966A64E267CeFb78012C0282D0Ac87   │
└────────────────────┴──────────────────────────────────────────────┘
```

---

## Getting Started

### Prerequisites

- Node.js 18+
- npm or pnpm
- MetaMask or compatible wallet
- Coston2 testnet configured

### Add Coston2 to MetaMask

```
Network Name: Coston2
RPC URL: https://coston2-api.flare.network/ext/C/rpc
Chain ID: 114
Currency: C2FLR
Explorer: https://coston2-explorer.flare.network
```

### Installation

```bash
# Clone repository
git clone https://github.com/tomrowbo/BetFlare.git
cd BetFlare

# Install contract dependencies
npm install

# Install frontend dependencies
cd frontend && npm install
```

### Environment Setup

```bash
# Root .env (for contract deployment)
PRIVATE_KEY=your_deployer_private_key

# Frontend .env.local
NEXT_PUBLIC_WALLETCONNECT_ID=your_walletconnect_project_id
```

### Run Development Server

```bash
# Start frontend
cd frontend
npm run dev

# Open http://localhost:3000
```

### Deploy Contracts (Optional)

```bash
# Deploy full system
npx hardhat run scripts/deploy.ts --network coston2

# Create a new market
npx hardhat run scripts/deploy-test-market-15min.ts --network coston2
```

---

## Creating a Market

### Step 1: Deploy Resolver & Create Market

```typescript
// Deploy FTSOResolver
const FTSOResolver = await ethers.getContractFactory("FTSOResolver");
const resolver = await FTSOResolver.deploy(FTSO_REGISTRY, CONDITIONAL_TOKENS);

// Create market: XRP above $2.50 in 15 minutes
const targetPrice = 250000; // 5 decimals
const resolutionTime = Math.floor(Date.now() / 1000) + (15 * 60);

const tx = await resolver.createMarket(
    "testXRP",      // FTSO symbol
    targetPrice,    // Target price
    resolutionTime, // When to resolve
    true            // isAbove (bet on price > target)
);
```

### Step 2: Deploy FPMM

```typescript
const FPMM = await ethers.getContractFactory("FPMM");
const fpmm = await FPMM.deploy(
    CONDITIONAL_TOKENS,
    USDT_ADDRESS,
    conditionId,      // From resolver.createMarket()
    UNIVERSAL_VAULT
);

// Link FPMM to resolver
await resolver.setFPMM(marketId, fpmm.address);
```

### Step 3: Configure & Add Liquidity

```typescript
// Set router on FPMM
await fpmm.setRouter(LIQUIDITY_ROUTER);

// Register with router
await router.registerMarket(fpmm.address);

// Authorize in vault
await vault.authorizeMarket(fpmm.address, true);

// Add initial liquidity
await usdt.approve(fpmm.address, INITIAL_LIQUIDITY);
await fpmm.addLiquidity(INITIAL_LIQUIDITY);

// Trigger rebalance for vault distribution
await router.rebalance();
```

---

## Frontend Architecture

```
frontend/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── page.tsx            # Home - Market listings
│   │   ├── markets/[slug]/     # Market detail & trading
│   │   ├── portfolio/          # User positions
│   │   ├── liquidity/          # LP deposit/withdraw
│   │   └── providers.tsx       # Wagmi + RainbowKit setup
│   │
│   ├── components/
│   │   ├── BetSlip.tsx         # Trading form
│   │   ├── MarketCard.tsx      # Market display
│   │   ├── PriceChart.tsx      # Price history
│   │   ├── Header.tsx          # Navigation
│   │   └── home/               # Home page components
│   │
│   └── config/
│       ├── contracts.ts        # Addresses & ABIs
│       └── wagmi.ts            # Wallet configuration
```

### Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | Next.js 16, React 19, TypeScript |
| Styling | TailwindCSS, Framer Motion |
| Wallet | Wagmi 2.x, RainbowKit 2.x, Viem |
| Data | TanStack React Query |
| Charts | Recharts, Custom SVG |

---

## Why Flare Network?

### Native Oracle Integration

Unlike other L1s that rely on external oracle networks, Flare has FTSO built into its consensus layer:

```
Traditional Setup:
  [External Oracle] ──bridge──▶ [L1 Chain] ──▶ [DApp]
       ⚠️ Bridge risk, latency, cost

Flare Setup:
  [FTSO (Native)] ──direct──▶ [BetFlare]
       ✅ No bridge, low latency, trustless
```

### XRP Ecosystem

- Native XRP bridging via Flare's State Connector
- Direct XRP deposits to vault (auto-converts via BlazeSwap)
- Access to XRP's massive user base

### Performance

- **Fast Finality**: ~2 second block times
- **Low Gas**: Fraction of Ethereum costs
- **EVM Compatible**: Deploy Solidity contracts directly

---

## Security

### Implemented Safeguards

| Protection | Implementation |
|------------|----------------|
| Reentrancy | OpenZeppelin ReentrancyGuard on all state changes |
| Access Control | Owner-only admin functions, authorized market list |
| Safe Transfers | SafeERC20 wrapper for all token operations |
| Signature Security | EIP-712 typed data with nonce replay protection |
| Upgradability | UUPS proxy pattern (vault/router only) |

### Audit Status

- [ ] Internal review completed
- [ ] External audit pending
- [ ] Bug bounty program TBD

---

## Roadmap

### Phase 1: Testnet (Current)
- [x] Core contracts deployed on Coston2
- [x] Frontend live
- [x] XRP price markets
- [x] Liquidity vault

### Phase 2: Mainnet Launch
- [ ] Security audit
- [ ] Mainnet deployment
- [ ] Additional asset markets (BTC, ETH, FLR)
- [ ] Mobile-optimized UI

### Phase 3: Expansion
- [ ] Multi-outcome markets (3+ outcomes)
- [ ] Governance token
- [ ] DAO treasury
- [ ] Leveraged positions

### Phase 4: Ecosystem
- [ ] SDK for market creators
- [ ] API for integrations
- [ ] Cross-chain markets

---

## Contributing

We welcome contributions! Please see our guidelines:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## Links

- **Live Demo**: [betflare.vercel.app](https://betflare.vercel.app)
- **Flare Network**: [flare.network](https://flare.network)
- **FTSO Documentation**: [docs.flare.network](https://docs.flare.network)
- **Coston2 Explorer**: [coston2-explorer.flare.network](https://coston2-explorer.flare.network)

---

<p align="center">
  Built with ❤️ for ETHOxford 2026
</p>
