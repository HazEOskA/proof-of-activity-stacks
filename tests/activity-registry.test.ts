import { Cl } from '@stacks/transactions'
import { describe, expect, it } from 'vitest'

const contractName = 'activity-registry'
const operationId = Cl.bufferFromHex('11'.repeat(32))
const artifactHash = Cl.bufferFromHex('aa'.repeat(32))
const evidenceUri = Cl.stringAscii('https://example.com/proofs/agent-proof-001')

describe('activity-registry', () => {
  const accounts = simnet.getAccounts()
  const wallet1 = accounts.get('wallet_1')!
  const wallet2 = accounts.get('wallet_2')!

  it('deploys the Clarity contract', () => {
    expect(simnet.getContractSource(contractName)).toContain('(define-public (register-proof')
  })

  it('registers and reads an immutable proof', () => {
    const registration = simnet.callPublicFn(
      contractName,
      'register-proof',
      [operationId, artifactHash, evidenceUri],
      wallet1,
    )

    expect(registration.result).toBeOk(Cl.bool(true))
    expect(simnet.getDataVar(contractName, 'total-proofs')).toBeUint(1)
    const registrationHeight = simnet.stacksBlockHeight

    const stored = simnet.callReadOnlyFn(
      contractName,
      'get-proof',
      [Cl.principal(wallet1), operationId],
      wallet1,
    )

    expect(stored.result).toBeSome(
      Cl.tuple({
        'artifact-hash': artifactHash,
        'evidence-uri': evidenceUri,
        'created-at': Cl.uint(registrationHeight),
      }),
    )
  })

  it('rejects a duplicate operation for the same wallet', () => {
    simnet.callPublicFn(
      contractName,
      'register-proof',
      [operationId, artifactHash, evidenceUri],
      wallet1,
    )

    const duplicate = simnet.callPublicFn(
      contractName,
      'register-proof',
      [operationId, Cl.bufferFromHex('bb'.repeat(32)), evidenceUri],
      wallet1,
    )

    expect(duplicate.result).toBeErr(Cl.uint(101))
    expect(simnet.getDataVar(contractName, 'total-proofs')).toBeUint(1)
  })

  it('allows two wallets to use the same operation id', () => {
    const first = simnet.callPublicFn(
      contractName,
      'register-proof',
      [operationId, artifactHash, evidenceUri],
      wallet1,
    )
    const second = simnet.callPublicFn(
      contractName,
      'register-proof',
      [operationId, artifactHash, evidenceUri],
      wallet2,
    )

    expect(first.result).toBeOk(Cl.bool(true))
    expect(second.result).toBeOk(Cl.bool(true))
    expect(simnet.getDataVar(contractName, 'total-proofs')).toBeUint(2)
  })

  it('rejects an empty evidence link', () => {
    const registration = simnet.callPublicFn(
      contractName,
      'register-proof',
      [operationId, artifactHash, Cl.stringAscii('')],
      wallet1,
    )

    expect(registration.result).toBeErr(Cl.uint(102))
    expect(simnet.getDataVar(contractName, 'total-proofs')).toBeUint(0)
  })
})
