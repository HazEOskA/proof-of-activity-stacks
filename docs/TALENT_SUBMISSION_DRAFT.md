# Talent submission draft — Proof of Activity Stacks

Do not submit until every placeholder marked `PENDING` is replaced with confirmed public data.

## Project profile

**Project name**

Proof of Activity — Stacks

**Category**

AI Agents

**Tagline**

Verifiable execution receipts for AI-agent work on Stacks

**Description**

Proof of Activity creates independently verifiable receipts for AI-agent and builder work. It hashes a human-readable operation label and artifact reference locally, then records the resulting execution receipt in a non-custodial Clarity smart contract on Stacks. Anyone can verify the owner, artifact hash, public evidence URL, and Stacks block height through a read-only query.

**GitHub repository**

https://github.com/HazEOskA/proof-of-activity-stacks

**Logo URL**

https://raw.githubusercontent.com/HazEOskA/proof-of-activity-stacks/main/apps/web/public/favicon.svg

**Production website**

PENDING — final public frontend URL

## Stacks contract

**Network**

Stacks mainnet

**Planned contract identifier**

SP2D146EB2KN7A66VEVYBDBXDC0CC496E3NBKY8S4.activity-registry

**Contract owner address**

SP2D146EB2KN7A66VEVYBDBXDC0CC496E3NBKY8S4

**Contract deployment transaction**

PENDING — deployment txid and Hiro Explorer URL

**First proof transaction**

PENDING — `register-proof` txid and Hiro Explorer URL

## Public proof

**Operation label**

proof-of-activity-stacks-mainnet-v1

**Artifact reference**

Proof of Activity Stacks mainnet deployment and public verification completed

**Evidence URL**

https://github.com/HazEOskA/proof-of-activity-stacks

**Verification result**

PENDING — stored artifact hash and Stacks block height returned by `get-proof`

## Website verification

Talent verification token: PENDING — generated only after the project profile is created.

The exact tag must be inserted directly into the `<head>` of `apps/web/index.html`, followed by a production redeploy and a successful Talent crawler check.

## Final acceptance checklist

- [ ] Mainnet contract confirmed
- [ ] First mainnet proof confirmed
- [ ] Read-only proof verification successful
- [ ] Frontend permanently configured with the contract owner address
- [ ] Public production frontend opens without authentication
- [ ] Talent meta tag detected on the same public domain
- [ ] Logo URL loads publicly
- [ ] Contract and transaction explorer links recorded
- [ ] Project added to Talent
- [ ] Stacks smart contract attached to the verified project
