;; Proof of Activity registry for Stacks.
;; Stores immutable, wallet-owned execution receipts without custodying assets.

(define-constant err-proof-exists (err u101))
(define-constant err-empty-evidence (err u102))

(define-data-var total-proofs uint u0)

(define-map proofs
  {
    owner: principal,
    operation-id: (buff 32)
  }
  {
    artifact-hash: (buff 32),
    evidence-uri: (string-ascii 160),
    created-at: uint
  }
)

(define-public (register-proof
  (operation-id (buff 32))
  (artifact-hash (buff 32))
  (evidence-uri (string-ascii 160)))
  (begin
    (asserts! (> (len evidence-uri) u0) err-empty-evidence)
    (asserts!
      (is-none (map-get? proofs {
        owner: tx-sender,
        operation-id: operation-id
      }))
      err-proof-exists)

    (map-set proofs
      {
        owner: tx-sender,
        operation-id: operation-id
      }
      {
        artifact-hash: artifact-hash,
        evidence-uri: evidence-uri,
        created-at: stacks-block-height
      })

    (var-set total-proofs (+ (var-get total-proofs) u1))

    (print {
      event: "proof-registered",
      owner: tx-sender,
      operation-id: operation-id,
      artifact-hash: artifact-hash
    })

    (ok true)
  )
)

(define-read-only (get-proof (owner principal) (operation-id (buff 32)))
  (map-get? proofs {
    owner: owner,
    operation-id: operation-id
  })
)

(define-read-only (proof-exists (owner principal) (operation-id (buff 32)))
  (is-some (map-get? proofs {
    owner: owner,
    operation-id: operation-id
  }))
)

(define-read-only (get-total-proofs)
  (var-get total-proofs)
)
