import {
  connect,
  disconnect,
  getLocalStorage,
  request,
} from '@stacks/connect'
import {
  Cl,
  ClarityType,
  fetchCallReadOnlyFunction,
  type BufferCV,
  type ClarityValue,
  type StringAsciiCV,
  type TupleCV,
  type UIntCV,
} from '@stacks/transactions'
import contractSource from '../../../contracts/activity-registry.clar?raw'

export type StacksNetwork = 'testnet' | 'mainnet'

export interface StoredProof {
  artifactHash: string
  evidenceUri: string
  createdAt: string
}

export interface TransactionResponse {
  txid?: string
  transaction?: string
}

export const NETWORK: StacksNetwork =
  import.meta.env.VITE_STACKS_NETWORK === 'mainnet' ? 'mainnet' : 'testnet'

export const CONTRACT_NAME =
  import.meta.env.VITE_CONTRACT_NAME?.trim() || 'activity-registry'

export const CONFIGURED_CONTRACT_ADDRESS =
  import.meta.env.VITE_CONTRACT_ADDRESS?.trim() || ''

export const RUNTIME_CONTRACT_KEY = 'poa-stacks:contract-address'

const addressPrefix = NETWORK === 'mainnet' ? 'SP' : 'ST'

export function getStoredWalletAddress(): string {
  const entries = getLocalStorage()?.addresses.stx ?? []
  return entries.find(({ address }) => address.startsWith(addressPrefix))?.address ?? ''
}

export async function connectWallet(): Promise<string> {
  const result = await connect({ network: NETWORK })
  const address = result.addresses.find((entry) =>
    entry.address.startsWith(addressPrefix),
  )?.address

  if (!address) {
    throw new Error(`The wallet did not return a ${NETWORK} STX address.`)
  }

  return address
}

export function disconnectWallet(): void {
  disconnect()
}

export async function deployRegistry(): Promise<TransactionResponse> {
  return request('stx_deployContract', {
    name: CONTRACT_NAME,
    clarityCode: contractSource,
    clarityVersion: 4,
    network: NETWORK,
    postConditionMode: 'deny',
  })
}

export async function registerProof(params: {
  contractAddress: string
  operationId: Uint8Array
  artifactHash: Uint8Array
  evidenceUri: string
}): Promise<TransactionResponse> {
  const contract = `${params.contractAddress}.${CONTRACT_NAME}` as `${string}.${string}`

  return request('stx_callContract', {
    contract,
    functionName: 'register-proof',
    functionArgs: [
      Cl.buffer(params.operationId),
      Cl.buffer(params.artifactHash),
      Cl.stringAscii(params.evidenceUri),
    ],
    network: NETWORK,
    postConditionMode: 'deny',
  })
}

export async function lookupProof(params: {
  contractAddress: string
  owner: string
  operationId: Uint8Array
}): Promise<StoredProof | null> {
  const response = await fetchCallReadOnlyFunction({
    contractAddress: params.contractAddress,
    contractName: CONTRACT_NAME,
    functionName: 'get-proof',
    functionArgs: [Cl.principal(params.owner), Cl.buffer(params.operationId)],
    senderAddress: params.owner,
    network: NETWORK,
  })

  return parseStoredProof(response)
}

function parseStoredProof(response: ClarityValue): StoredProof | null {
  if (response.type === ClarityType.OptionalNone) return null

  if (
    response.type !== ClarityType.OptionalSome ||
    response.value.type !== ClarityType.Tuple
  ) {
    throw new Error('The contract returned an unexpected proof format.')
  }

  const tuple = (response.value as TupleCV).value
  const artifactHash = tuple['artifact-hash'] as BufferCV | undefined
  const evidenceUri = tuple['evidence-uri'] as StringAsciiCV | undefined
  const createdAt = tuple['created-at'] as UIntCV | undefined

  if (
    artifactHash?.type !== ClarityType.Buffer ||
    evidenceUri?.type !== ClarityType.StringASCII ||
    createdAt?.type !== ClarityType.UInt
  ) {
    throw new Error('The stored proof fields do not match the contract schema.')
  }

  return {
    artifactHash: `0x${artifactHash.value.replace(/^0x/, '')}`,
    evidenceUri: evidenceUri.value,
    createdAt: String(createdAt.value),
  }
}

export async function sha256Bytes(value: string): Promise<Uint8Array> {
  const encoded = new TextEncoder().encode(value)
  return new Uint8Array(await crypto.subtle.digest('SHA-256', encoded))
}

export function bytesToHex(value: Uint8Array): string {
  return Array.from(value, (byte) => byte.toString(16).padStart(2, '0')).join('')
}

export function isAscii(value: string): boolean {
  return /^[\x00-\x7F]*$/.test(value)
}

export function isStacksAddress(value: string): boolean {
  return new RegExp(`^${addressPrefix}[A-Z0-9]{30,50}$`).test(value.trim())
}

export function explorerTransactionUrl(txid: string): string {
  return `https://explorer.hiro.so/txid/${txid}?chain=${NETWORK}`
}

export function explorerContractUrl(contractAddress: string): string {
  return `https://explorer.hiro.so/address/${contractAddress}.${CONTRACT_NAME}?chain=${NETWORK}`
}

export function shorten(value: string, start = 7, end = 5): string {
  if (value.length <= start + end + 3) return value
  return `${value.slice(0, start)}…${value.slice(-end)}`
}
