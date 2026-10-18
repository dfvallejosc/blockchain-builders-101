# TA-29 global fixes report

## Fixes

- Read the decoded `CertificateStatus` struct from `queryContract.result.verdict`, preserving valid, expired, annulled, issuer-revoked, and not-found mappings.
- Added idempotent missing issuer account creation with the SDK 17.2.1 `beginSponsoringFutureReserves`, `createAccount`, and `endSponsoringFutureReserves` operations. The sponsor and derived issuer sign the transaction.
- Replaced the unavailable RPC restore helper with an archived-entry transaction using `restorePreamble`, `Operation.restoreFootprint`, Soroban transaction data, submission, confirmation, and one original simulation retry.
- Applied one 20-second deadline at each public call entry. Queue wait, account lookup, simulation, restore, submission, polling, and polling delay use the remaining budget, and RPC timers are cleared on settlement.
- Removed blanket success handling for issuer revocation contract errors. Contract code 7 now maps to the existing HTTP error table; only successful repeated revocation is idempotent.
- Checked immediate `sendTransaction.status === 'ERROR'` and mapped submitted failures from `resultXdr` and diagnostic/event payloads.
- Added short Spanish API documentation for registry configuration, delegated custody, secrets, rotation limits, and accepted operational gaps in `apps/api/README.md`.

## Tests and checks

- Scoped API Stellar tests: 35 files, 308 tests passed.
- Added fake coverage for struct verdict decoding, archived read fallback, sponsored account creation, restore and retry, immediate submission failure, failed confirmation mapping, and revocation error handling.
- Type-aware Oxlint passed on all four changed TypeScript files. Existing `typescript(unbound-method)` warnings remain in `stellar-certificate-registry.spec.ts`.
- API build passed with Node 24.
- `git diff --check` passed.

## Deferred validation

No testnet calls, provisioning, smoke, PostgreSQL e2e, real secrets, push, or PR were run. The manual Task 1 network spike and Task 10 live smoke/evidence remain developer-owned validation gates from the review.
