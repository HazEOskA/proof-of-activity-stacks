# Proof of Activity — Stacks mainnet deployment runbook

This runbook is the locked sequence for completing the project before adding it to Talent.

## Production network

- Network: Stacks mainnet
- Contract name: `activity-registry`
- Contract source: `contracts/activity-registry.clar`
- Wallets supported by the frontend: Xverse and Leather through Stacks Connect
- Public explorer: `https://explorer.hiro.so`

## First mainnet proof values

Use these exact values for the first public receipt:

- Operation label: `proof-of-activity-stacks-mainnet-v1`
- Artifact reference: `Proof of Activity Stacks mainnet deployment and public verification completed`
- Evidence URL: `https://github.com/HazEOskA/proof-of-activity-stacks`

The frontend hashes the operation label and artifact reference locally with SHA-256. The smart contract stores only the resulting 32-byte hashes, evidence URL, owner principal, and Stacks block height.

## Locked execution sequence

1. Open the production frontend inside Xverse or Leather.
2. Connect the wallet and verify that the UI says `Stacks Mainnet`.
3. Click `Deploy registry`.
4. Approve one `stx_deployContract` transaction for `activity-registry`.
5. Wait until the deployment transaction is confirmed in Hiro Explorer.
6. Use the wallet's mainnet `SP...` address as the contract owner address.
7. Open the confirmed contract page: `<SP_ADDRESS>.activity-registry`.
8. Enter the three locked proof values above.
9. Click the proof registration action.
10. Approve one `register-proof` contract-call transaction.
11. Wait for confirmation.
12. Open Verify, use the same owner address and exact operation label.
13. Confirm the UI returns the stored artifact hash, evidence URL, and block height.
14. Record the deployment txid, proof txid, owner address, and contract explorer URL in `docs/TALENT_SUBMISSION_DRAFT.md`.
15. Pin `VITE_CONTRACT_ADDRESS` to the confirmed mainnet owner address before final public deployment.
16. Add the Talent verification meta tag directly to the production homepage after Talent generates the project-specific token.
17. Only then add the project to Talent and attach the Stacks smart contract.

## Stop conditions

Do not submit the project if any of the following is missing:

- confirmed mainnet contract,
- confirmed public proof transaction,
- successful read-only verification,
- public frontend,
- project-specific Talent verification tag on the public homepage,
- final logo URL and submission copy.

Never paste a seed phrase or private key into the frontend, repository, terminal, or chat.
