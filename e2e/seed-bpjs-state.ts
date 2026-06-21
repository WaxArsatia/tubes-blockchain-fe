import { writeFile } from "node:fs/promises"

const rpcUrl = process.env.VITE_RPC_URL ?? "https://blockchain-rpc.denis.my.id"
const contractAddress =
  process.env.VITE_CONTRACT_ADDRESS ??
  "0x9B8397f1B0FEcD3a1a40CdD5E8221Fa461898517"

console.log("Real-RPC seed placeholder")
console.log(`RPC: ${rpcUrl}`)
console.log(
  "Deploy/seed automation requires a funded private key and is intentionally not run by browser smoke tests."
)

await writeFile(
  ".env.test.local",
  `VITE_RPC_URL=${rpcUrl}\nVITE_CONTRACT_ADDRESS=${contractAddress}\n`
)
