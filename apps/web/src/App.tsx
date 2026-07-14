import { useEffect, useMemo, useState, type FormEvent } from 'react'
import {
  CONFIGURED_CONTRACT_ADDRESS,
  CONTRACT_NAME,
  NETWORK,
  RUNTIME_CONTRACT_KEY,
  bytesToHex,
  connectWallet,
  deployRegistry,
  disconnectWallet,
  explorerContractUrl,
  explorerTransactionUrl,
  getStoredWalletAddress,
  isAscii,
  isStacksAddress,
  lookupProof,
  registerProof,
  sha256Bytes,
  shorten,
  type StoredProof,
} from './chain'

type WorkspaceMode = 'create' | 'verify'
type BusyAction = 'connect' | 'deploy' | 'register' | 'verify' | null

interface Notice {
  kind: 'success' | 'error' | 'info'
  title: string
  message: string
  txid?: string
}

function App() {
  const [mode, setMode] = useState<WorkspaceMode>('create')
  const [walletAddress, setWalletAddress] = useState(() => getStoredWalletAddress())
  const [contractAddress, setContractAddress] = useState(() => {
    if (CONFIGURED_CONTRACT_ADDRESS) return CONFIGURED_CONTRACT_ADDRESS
    return localStorage.getItem(RUNTIME_CONTRACT_KEY) ?? ''
  })
  const [operationLabel, setOperationLabel] = useState('')
  const [artifactReference, setArtifactReference] = useState('')
  const [evidenceUri, setEvidenceUri] = useState('')
  const [verifyOwner, setVerifyOwner] = useState('')
  const [verifyOperation, setVerifyOperation] = useState('')
  const [operationHash, setOperationHash] = useState('')
  const [artifactHash, setArtifactHash] = useState('')
  const [proof, setProof] = useState<StoredProof | null | undefined>(undefined)
  const [busy, setBusy] = useState<BusyAction>(null)
  const [notice, setNotice] = useState<Notice | null>(null)

  const contractReady = isStacksAddress(contractAddress)
  const networkLabel = NETWORK === 'mainnet' ? 'Mainnet' : 'Testnet'

  useEffect(() => {
    let active = true

    async function updateHashes() {
      const [nextOperation, nextArtifact] = await Promise.all([
        operationLabel.trim()
          ? sha256Bytes(operationLabel.trim()).then(bytesToHex)
          : Promise.resolve(''),
        artifactReference.trim()
          ? sha256Bytes(artifactReference.trim()).then(bytesToHex)
          : Promise.resolve(''),
      ])

      if (active) {
        setOperationHash(nextOperation)
        setArtifactHash(nextArtifact)
      }
    }

    void updateHashes()
    return () => {
      active = false
    }
  }, [artifactReference, operationLabel])

  const createChecklist = useMemo(
    () => [
      { label: 'Wallet connected', ready: Boolean(walletAddress) },
      { label: 'Registry deployed', ready: contractReady },
      {
        label: 'Proof data ready',
        ready: Boolean(operationHash && artifactHash && evidenceUri.trim()),
      },
    ],
    [artifactHash, contractReady, evidenceUri, operationHash, walletAddress],
  )

  async function handleConnect() {
    setBusy('connect')
    setNotice(null)
    try {
      const address = await connectWallet()
      setWalletAddress(address)
      setVerifyOwner((current) => current || address)
      setNotice({
        kind: 'success',
        title: 'Wallet connected',
        message: `${shorten(address)} is ready on ${networkLabel}.`,
      })
    } catch (error) {
      setNotice(errorNotice('Wallet connection failed', error))
    } finally {
      setBusy(null)
    }
  }

  function handleDisconnect() {
    disconnectWallet()
    setWalletAddress('')
    setNotice({
      kind: 'info',
      title: 'Wallet disconnected',
      message: 'No account data was retained by the app.',
    })
  }

  function saveContractAddress(value: string) {
    const normalized = value.trim().toUpperCase()
    setContractAddress(normalized)
    if (normalized) localStorage.setItem(RUNTIME_CONTRACT_KEY, normalized)
    else localStorage.removeItem(RUNTIME_CONTRACT_KEY)
  }

  async function handleDeploy() {
    if (!walletAddress) {
      await handleConnect()
      return
    }

    setBusy('deploy')
    setNotice(null)
    try {
      const result = await deployRegistry()
      saveContractAddress(walletAddress)
      setNotice({
        kind: 'success',
        title: 'Deployment submitted',
        message:
          'Your wallet approved the registry deployment. Wait for confirmation before recording the first proof.',
        txid: result.txid,
      })
    } catch (error) {
      setNotice(errorNotice('Deployment was not submitted', error))
    } finally {
      setBusy(null)
    }
  }

  async function handleRegister(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setProof(undefined)

    if (!walletAddress) {
      setNotice({
        kind: 'info',
        title: 'Connect a wallet first',
        message: 'Open this page in Xverse or Leather and approve the connection.',
      })
      return
    }
    if (!contractReady) {
      setNotice({
        kind: 'info',
        title: 'Registry address required',
        message: 'Deploy the registry or paste its confirmed contract owner address.',
      })
      return
    }
    if (!operationLabel.trim() || !artifactReference.trim()) {
      setNotice({
        kind: 'error',
        title: 'Proof data is incomplete',
        message: 'Add both an operation ID and an artifact reference.',
      })
      return
    }
    if (!isValidEvidenceUri(evidenceUri)) {
      setNotice({
        kind: 'error',
        title: 'Evidence link is invalid',
        message: 'Use a public http(s) URL with no more than 160 ASCII characters.',
      })
      return
    }

    setBusy('register')
    setNotice(null)
    try {
      const [operationId, computedArtifactHash] = await Promise.all([
        sha256Bytes(operationLabel.trim()),
        sha256Bytes(artifactReference.trim()),
      ])
      const result = await registerProof({
        contractAddress,
        operationId,
        artifactHash: computedArtifactHash,
        evidenceUri: evidenceUri.trim(),
      })
      setVerifyOwner(walletAddress)
      setVerifyOperation(operationLabel.trim())
      setNotice({
        kind: 'success',
        title: 'Proof transaction submitted',
        message:
          'Your immutable receipt is on its way to Stacks. Verify it here after the transaction confirms.',
        txid: result.txid,
      })
    } catch (error) {
      setNotice(errorNotice('Proof was not submitted', error))
    } finally {
      setBusy(null)
    }
  }

  async function handleVerify(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setProof(undefined)

    if (!contractReady) {
      setNotice({
        kind: 'info',
        title: 'Registry address required',
        message: 'Paste the address that deployed the activity-registry contract.',
      })
      return
    }
    if (!isStacksAddress(verifyOwner)) {
      setNotice({
        kind: 'error',
        title: 'Owner address is invalid',
        message: `Enter a valid ${NETWORK} STX address.`,
      })
      return
    }
    if (!verifyOperation.trim()) {
      setNotice({
        kind: 'error',
        title: 'Operation ID is missing',
        message: 'Use the exact same label that was recorded with the proof.',
      })
      return
    }

    setBusy('verify')
    setNotice(null)
    try {
      const operationId = await sha256Bytes(verifyOperation.trim())
      const result = await lookupProof({
        contractAddress,
        owner: verifyOwner.trim(),
        operationId,
      })
      setProof(result)
      setNotice({
        kind: result ? 'success' : 'info',
        title: result ? 'Proof verified' : 'No proof found',
        message: result
          ? 'The receipt was read directly from the Stacks registry.'
          : 'Check the owner, operation label, network, and contract address.',
      })
    } catch (error) {
      setNotice(errorNotice('Proof lookup failed', error))
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className="site-shell">
      <div className="ambient ambient-one" />
      <div className="ambient ambient-two" />

      <header className="topbar page-width">
        <a className="brand" href="#top" aria-label="Proof of Activity home">
          <span className="brand-mark" aria-hidden="true">P/</span>
          <span><strong>PROOF OF ACTIVITY</strong><small>BUILT ON STACKS</small></span>
        </a>
        <nav aria-label="Primary navigation">
          <a href="#workspace">Registry</a><a href="#protocol">Protocol</a><a href="#safety">Safety</a>
        </nav>
        <button className={`wallet-button ${walletAddress ? 'is-connected' : ''}`} type="button" onClick={walletAddress ? handleDisconnect : handleConnect} disabled={busy === 'connect'}>
          <span className="wallet-dot" />
          {busy === 'connect' ? 'Connecting…' : walletAddress ? shorten(walletAddress) : 'Connect wallet'}
        </button>
      </header>

      <main id="top">
        <section className="hero page-width">
          <div className="hero-copy">
            <div className="eyebrow"><span className="eyebrow-pulse" />Open protocol · {networkLabel}</div>
            <h1>Ship it.<span> Prove it.</span></h1>
            <p className="hero-lead">Turn builder activity into an immutable public receipt — anchored to Stacks, secured by Bitcoin.</p>
            <div className="hero-actions">
              <a className="button button-primary" href="#workspace">Create a proof <ArrowIcon /></a>
              <button className="button button-ghost" type="button" onClick={() => { setMode('verify'); document.querySelector('#workspace')?.scrollIntoView({ behavior: 'smooth' }) }}>Verify receipt</button>
            </div>
            <div className="trust-row" aria-label="Protocol properties">
              <span><CheckIcon /> Non-custodial</span><span><CheckIcon /> Open source</span><span><CheckIcon /> Wallet-owned</span>
            </div>
          </div>

          <div className="hero-visual" aria-label="Example proof receipt">
            <div className="receipt-shadow" />
            <article className="receipt-card">
              <div className="receipt-head"><span>ACTIVITY RECEIPT</span><span className="live-chip">● VERIFIED</span></div>
              <div className="receipt-code">POA//8A72-F3C1</div>
              <div className="receipt-grid">
                <div><small>OWNER</small><strong>ST1SJ3D…8YPD5</strong></div>
                <div><small>BLOCK</small><strong>0219473</strong></div>
                <div className="span-two"><small>ARTIFACT HASH</small><strong>0x9f86d081884c7d65…</strong></div>
              </div>
              <div className="receipt-signal" aria-hidden="true">{Array.from({ length: 22 }, (_, index) => <i key={index} style={{ height: `${14 + ((index * 17) % 34)}px` }} />)}</div>
              <div className="receipt-foot"><span>STACKS L2</span><span>BITCOIN FINALITY</span></div>
            </article>
            <div className="orbit-label orbit-one">01 / HASH</div><div className="orbit-label orbit-two">02 / SIGN</div>
          </div>
        </section>

        <div className="ticker" aria-hidden="true"><div>IMMUTABLE RECEIPTS <span>✦</span> PUBLIC EVIDENCE <span>✦</span> STACKS SMART CONTRACTS <span>✦</span> BITCOIN-SECURED <span>✦</span> IMMUTABLE RECEIPTS <span>✦</span> PUBLIC EVIDENCE <span>✦</span></div></div>

        <section className="workspace-section page-width" id="workspace">
          <div className="section-heading">
            <div><span className="section-index">01</span><p className="kicker">ON-CHAIN WORKSPACE</p><h2>Proof console</h2></div>
            <p>Human-readable inputs are SHA-256 fingerprinted in your browser. Only hashes, a public evidence URL, and block height reach the registry.</p>
          </div>

          <div className="console-grid">
            <aside className="registry-panel">
              <div className="panel-label">REGISTRY STATUS</div>
              <div className="network-card">
                <div className="network-glyph" aria-hidden="true">✣</div>
                <div><span>Stacks {networkLabel}</span><strong>{contractReady ? 'Registry linked' : 'Ready to deploy'}</strong></div>
                <span className={`status-led ${contractReady ? 'ready' : ''}`} />
              </div>
              <label className="compact-field"><span>CONTRACT OWNER ADDRESS</span><input value={contractAddress} onChange={(event) => saveContractAddress(event.target.value)} placeholder={`${NETWORK === 'mainnet' ? 'SP' : 'ST'}…`} readOnly={Boolean(CONFIGURED_CONTRACT_ADDRESS)} autoCapitalize="characters" spellCheck={false} /></label>
              {contractReady ? (
                <a className="text-link" href={explorerContractUrl(contractAddress)} target="_blank" rel="noreferrer">View contract <ExternalIcon /></a>
              ) : (
                <button className="button button-deploy" type="button" onClick={handleDeploy} disabled={busy === 'deploy' || busy === 'connect'}>{busy === 'deploy' ? 'Open wallet…' : walletAddress ? 'Deploy registry' : 'Connect to deploy'}</button>
              )}
              <div className="divider" />
              <div className="checklist">{createChecklist.map((item, index) => <div key={item.label} className={item.ready ? 'done' : ''}><span>{item.ready ? '✓' : String(index + 1).padStart(2, '0')}</span>{item.label}</div>)}</div>
              <div className="mobile-note"><PhoneIcon /><p><strong>Mobile-ready.</strong>Open this preview in Xverse or Leather to approve transactions on your phone.</p></div>
            </aside>

            <div className="interaction-panel">
              <div className="mode-tabs" role="tablist" aria-label="Proof action">
                <button className={mode === 'create' ? 'active' : ''} type="button" role="tab" aria-selected={mode === 'create'} onClick={() => setMode('create')}><span>01</span> Create proof</button>
                <button className={mode === 'verify' ? 'active' : ''} type="button" role="tab" aria-selected={mode === 'verify'} onClick={() => setMode('verify')}><span>02</span> Verify proof</button>
              </div>

              {mode === 'create' ? (
                <form className="proof-form" onSubmit={handleRegister}>
                  <div className="form-intro"><p>CREATE / IMMUTABLE RECEIPT</p><span>One operation can be registered once per wallet.</span></div>
                  <label className="field"><span>Operation ID <em>required</em></span><input value={operationLabel} onChange={(event) => setOperationLabel(event.target.value)} placeholder="deploy-production-2026-07-14" maxLength={120} /><small>{operationHash ? `SHA-256 · ${shorten(operationHash, 14, 12)}` : 'A unique name for this piece of work.'}</small></label>
                  <label className="field"><span>Artifact reference <em>required</em></span><input value={artifactReference} onChange={(event) => setArtifactReference(event.target.value)} placeholder="Git commit, release URL, CID, or build ID" maxLength={500} /><small>{artifactHash ? `SHA-256 · ${shorten(artifactHash, 14, 12)}` : 'Fingerprint any public or private artifact without exposing it.'}</small></label>
                  <label className="field"><span>Public evidence URL <em>required</em></span><input type="url" inputMode="url" value={evidenceUri} onChange={(event) => setEvidenceUri(event.target.value)} placeholder="https://github.com/you/project/releases/…" maxLength={160} /><small>{evidenceUri.length}/160 ASCII characters</small></label>
                  <button className="button button-submit" type="submit" disabled={busy === 'register'}><span>{busy === 'register' ? 'Awaiting approval…' : 'Record on Stacks'}</span><ArrowIcon /></button>
                </form>
              ) : (
                <form className="proof-form" onSubmit={handleVerify}>
                  <div className="form-intro"><p>VERIFY / PUBLIC RECEIPT</p><span>No wallet connection or transaction fee required.</span></div>
                  <label className="field"><span>Proof owner <em>required</em></span><input value={verifyOwner} onChange={(event) => setVerifyOwner(event.target.value.toUpperCase())} placeholder={`${NETWORK === 'mainnet' ? 'SP' : 'ST'}…`} autoCapitalize="characters" spellCheck={false} /></label>
                  <label className="field"><span>Operation ID <em>exact label</em></span><input value={verifyOperation} onChange={(event) => setVerifyOperation(event.target.value)} placeholder="deploy-production-2026-07-14" maxLength={120} /></label>
                  <button className="button button-submit" type="submit" disabled={busy === 'verify'}><span>{busy === 'verify' ? 'Reading chain…' : 'Verify receipt'}</span><SearchIcon /></button>
                  {proof && <article className="verified-result"><div className="verified-title"><span>✓</span><div><strong>Valid on-chain proof</strong><small>Read from {CONTRACT_NAME}</small></div></div><dl><div><dt>Block height</dt><dd>{proof.createdAt}</dd></div><div><dt>Artifact hash</dt><dd>{shorten(proof.artifactHash, 16, 12)}</dd></div><div><dt>Evidence</dt><dd><a href={proof.evidenceUri} target="_blank" rel="noreferrer">Open link <ExternalIcon /></a></dd></div></dl></article>}
                </form>
              )}

              {notice && <div className={`notice notice-${notice.kind}`} role="status" aria-live="polite"><span className="notice-icon">{notice.kind === 'success' ? '✓' : notice.kind === 'error' ? '!' : 'i'}</span><div><strong>{notice.title}</strong><p>{notice.message}</p>{notice.txid && <a href={explorerTransactionUrl(notice.txid)} target="_blank" rel="noreferrer">Track transaction <ExternalIcon /></a>}</div></div>}
            </div>
          </div>
        </section>

        <section className="protocol-section" id="protocol"><div className="page-width">
          <div className="section-heading light"><div><span className="section-index">02</span><p className="kicker">PROTOCOL FLOW</p><h2>Small footprint.<br />Strong evidence.</h2></div><p>The registry deliberately stores the minimum public data needed to prove that a wallet published a specific activity receipt.</p></div>
          <div className="steps-grid">
            <article><span>01</span><HashIcon /><h3>Fingerprint</h3><p>Your browser converts operation and artifact references into fixed 32-byte hashes.</p></article>
            <article><span>02</span><SignIcon /><h3>Sign</h3><p>Your Stacks wallet previews and authorizes the contract call. Keys never touch the app.</p></article>
            <article><span>03</span><AnchorIcon /><h3>Anchor</h3><p>The contract records owner, proof hashes, evidence URL, and the current Stacks block.</p></article>
            <article><span>04</span><VerifyIcon /><h3>Verify</h3><p>Anyone can reproduce the operation hash and read the receipt without connecting a wallet.</p></article>
          </div>
        </div></section>

        <section className="safety-section page-width" id="safety"><div className="safety-card">
          <div className="safety-copy"><p className="kicker">SAFETY BY DESIGN</p><h2>Your keys stay<br />in your wallet.</h2><p>Proof of Activity cannot transfer STX, NFTs, or tokens. The contract has no admin key, no custody logic, and no method for altering a stored receipt.</p></div>
          <div className="safety-spec"><div><span>ASSET TRANSFERS</span><strong>NONE</strong></div><div><span>ADMIN FUNCTIONS</span><strong>NONE</strong></div><div><span>PROOF MUTATION</span><strong>DISABLED</strong></div><div><span>WALLET SUPPORT</span><strong>XVERSE / LEATHER</strong></div></div>
        </div></section>
      </main>

      <footer className="footer page-width"><div className="brand footer-brand"><span className="brand-mark" aria-hidden="true">P/</span><span><strong>PROOF OF ACTIVITY</strong><small>STACKS BUILDER PROJECT</small></span></div><p>Immutable execution receipts for people who ship.</p><span className="footer-network">● {networkLabel.toUpperCase()}</span></footer>
    </div>
  )
}

function isValidEvidenceUri(value: string): boolean {
  const normalized = value.trim()
  if (!normalized || normalized.length > 160 || !isAscii(normalized)) return false
  try {
    const url = new URL(normalized)
    return url.protocol === 'https:' || url.protocol === 'http:'
  } catch {
    return false
  }
}

function errorNotice(title: string, error: unknown): Notice {
  const fallback = 'The wallet or network rejected the request. No funds were moved.'
  const raw = error instanceof Error ? error.message : typeof error === 'string' ? error : fallback
  const message = /cancel|reject|denied|closed/i.test(raw) ? 'The request was cancelled in the wallet. Nothing was submitted.' : raw.length > 180 ? fallback : raw
  return { kind: 'error', title, message }
}

function ArrowIcon() { return <svg viewBox="0 0 20 20" aria-hidden="true"><path d="M4 10h11M11 5l5 5-5 5" /></svg> }
function CheckIcon() { return <svg viewBox="0 0 18 18" aria-hidden="true"><path d="m4 9 3 3 7-7" /></svg> }
function ExternalIcon() { return <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M6 3h7v7M13 3 5 11M11 9v4H3V5h4" /></svg> }
function SearchIcon() { return <svg viewBox="0 0 20 20" aria-hidden="true"><circle cx="9" cy="9" r="5" /><path d="m13 13 4 4" /></svg> }
function PhoneIcon() { return <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="6" y="2" width="12" height="20" rx="2" /><path d="M10 18h4" /></svg> }
function HashIcon() { return <svg viewBox="0 0 32 32" aria-hidden="true"><path d="M11 4 8 28M23 4l-3 24M4 12h24M3 21h24" /></svg> }
function SignIcon() { return <svg viewBox="0 0 32 32" aria-hidden="true"><path d="M5 24c5-2 6-16 11-16 4 0-1 13 2 14 2 1 3-5 5-5 2 0 0 4 4 4" /><path d="M5 27h22" /></svg> }
function AnchorIcon() { return <svg viewBox="0 0 32 32" aria-hidden="true"><circle cx="16" cy="7" r="3" /><path d="M16 10v17M8 14H4c0 8 4 13 12 13s12-5 12-13h-4M10 22l6 5 6-5" /></svg> }
function VerifyIcon() { return <svg viewBox="0 0 32 32" aria-hidden="true"><path d="m6 16 6 6L26 8" /><circle cx="16" cy="16" r="13" /></svg> }

export default App
