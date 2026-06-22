# BPJS Rekam Medis Frontend

Operational frontend for the `BPJSMedicalRecords` smart contract.

## Setup

Copy `.env.example` to `.env.local` and adjust values when needed. The default
contract address is:

```txt
0x9B8397f1B0FEcD3a1a40CdD5E8221Fa461898517
```

## Environment

- `VITE_RPC_URL`: read RPC endpoint.
- `VITE_BLOCKSCOUT_URL`: transaction explorer base URL.
- `VITE_CONTRACT_ADDRESS`: deployed `BPJSMedicalRecords` address.
- `VITE_IPFS_API_URL`: encrypted file upload endpoint.
- `VITE_IPFS_GATEWAY_URL`: encrypted file download gateway.
- `VITE_DOCUMENT_ENCRYPTION_KEY`: required shared assignment/demo key for IPFS
  document encryption. Use a non-placeholder value with at least 32 characters.
  This global key protects uploaded bytes at rest in IPFS, but it is delivered
  to browser code and is not production-grade per-user medical privacy.

Production medical privacy would need a server-side key-management and
authorization boundary, such as per-document content keys released only after a
trusted service verifies access.

## Scripts

```bash
bun run dev
bun run test
bun run typecheck
bun run build
bun run test:e2e
```

`bun run test:real-rpc` is reserved for a funded real-RPC seed flow. The current
placeholder writes `.env.test.local` with the configured contract address; extend
it only when a fresh deployment and seeded transactions are acceptable.
