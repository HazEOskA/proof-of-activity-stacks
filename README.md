# Proof of Activity — Stacks

Proof of Activity is an on-chain registry for publishing immutable builder execution
receipts on Stacks.

Each proof is owned by the connected Stacks principal and keyed by a deterministic
32-byte operation ID. The contract stores an artifact hash, evidence URL, and Stacks
block height. It never takes custody of STX or other assets.

## Status

- Clarity contract: complete local MVP
- Contract tests: 5 passing
- Frontend: production build ready
- Testnet deployment: pending wallet confirmation
- Mainnet deployment: pending final validation and funded wallet

## Structure

- `contracts/activity-registry.clar` — immutable proof registry
- `tests/` — Clarinet SDK and Vitest tests
- `apps/web/` — Stacks Connect frontend
- `docs/` — deployment and Talent submission notes

## Run and validate

```bash
npm install
npm run validate
npm run web:dev
```

The Vite app supports Xverse and Leather through Stacks Connect. It can deploy the
registry, create a wallet-signed proof, and verify a proof with a read-only request.
The default network is Stacks testnet. Copy `apps/web/.env.example` to
`apps/web/.env.local` to set a confirmed contract address or switch networks.

## Safety

The contract performs no token transfers and stores only hashes plus a public evidence
URL. The deterministic accounts in `settings/Devnet.toml` are official Clarinet
simulation fixtures and must never hold real funds. Never commit a real wallet mnemonic
or private key.
