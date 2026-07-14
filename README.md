# Proof of Activity — Stacks

Proof of Activity is an on-chain registry for publishing immutable builder and AI-agent execution receipts on Stacks.

Each proof is owned by the connected Stacks principal and keyed by a deterministic 32-byte operation ID. The contract stores an artifact hash, evidence URL, and Stacks block height. It never takes custody of STX or other assets.

## Status

- Clarity contract: complete local MVP
- Contract tests: 5 passing
- Frontend: production build ready
- Production build network: Stacks mainnet
- Mainnet deployment: pending wallet approval and on-chain confirmation
- First public proof: pending confirmed contract
- Talent submission: intentionally blocked until the mainnet contract, first proof, verification, public frontend, and project-specific website tag are complete

## Structure

- `contracts/activity-registry.clar` — immutable proof registry
- `tests/` — Clarinet SDK and Vitest tests
- `apps/web/` — Stacks Connect frontend for Xverse and Leather
- `docs/DEPLOYMENT_RUNBOOK.md` — locked mainnet deployment and proof sequence
- `docs/TALENT_SUBMISSION_DRAFT.md` — complete submission copy with only on-chain/public URL placeholders remaining

## Run and validate

```bash
npm install
npm run validate
npm run web:dev
```

The Vite app supports Xverse and Leather through Stacks Connect. It can deploy the registry, create a wallet-signed proof, and verify a proof with a read-only request.

Development defaults to Stacks testnet unless an environment file is supplied. Production builds use `apps/web/.env.production`, which selects Stacks mainnet. After the contract confirms, set `VITE_CONTRACT_ADDRESS` to the deployer's confirmed mainnet `SP...` address and redeploy the frontend.

## Locked first mainnet proof

- Operation label: `proof-of-activity-stacks-mainnet-v1`
- Artifact reference: `Proof of Activity Stacks mainnet deployment and public verification completed`
- Evidence URL: `https://github.com/HazEOskA/proof-of-activity-stacks`

See `docs/DEPLOYMENT_RUNBOOK.md` before approving any wallet transaction.

## Safety

The contract performs no token transfers and stores only hashes plus a public evidence URL. The deterministic accounts in `settings/Devnet.toml` are official Clarinet simulation fixtures and must never hold real funds. Never commit or share a real wallet mnemonic, seed phrase, or private key.
