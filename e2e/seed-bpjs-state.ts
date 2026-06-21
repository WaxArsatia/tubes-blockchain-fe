import { mkdir, readFile, writeFile } from "node:fs/promises"
import path from "node:path"
import { spawnSync } from "node:child_process"
import { fileURLToPath } from "node:url"
import {
  createPublicClient,
  createWalletClient,
  encodeFunctionData,
  http,
  parseEther,
} from "viem"
import { privateKeyToAccount } from "viem/accounts"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const frontendDir = path.resolve(__dirname, "..")
const workspaceDir = path.resolve(frontendDir, "..")
const contractDir = path.join(workspaceDir, "contract")
const stateDir = path.join(frontendDir, "e2e", ".state")
const artifactPath = path.join(
  contractDir,
  "out",
  "BPJSMedicalRecords.sol",
  "BPJSMedicalRecords.json"
)

type SeedTarget = "local" | "real"

type SeedResult = {
  target: SeedTarget
  rpcUrl: string
  chainId: number
  chainIdHex: `0x${string}`
  contractAddress: `0x${string}`
  deployerAddress: `0x${string}`
  faskesRecordHash: `0x${string}`
  seededRecordHash: `0x${string}`
}

function argValue(name: string) {
  const index = process.argv.indexOf(name)
  return index >= 0 ? process.argv[index + 1] : undefined
}

function parseTarget(
  value: string | undefined,
  fallback: SeedTarget
): SeedTarget {
  const target = value ?? fallback
  if (target !== "local" && target !== "real") {
    throw new Error("--target must be local or real")
  }
  return target
}

function readDotEnv(contents: string) {
  const values: Record<string, string> = {}
  for (const rawLine of contents.split(/\r?\n/)) {
    const line = rawLine.trim()
    if (!line || line.startsWith("#")) continue
    const [key, ...rest] = line.split("=")
    values[key] = rest
      .join("=")
      .trim()
      .replace(/^["']|["']$/g, "")
  }
  return values
}

async function loadContractEnv() {
  const files = [
    path.join(contractDir, ".env.example"),
    path.join(contractDir, ".env"),
  ]
  const values: Record<string, string> = {}
  for (const file of files) {
    try {
      Object.assign(values, readDotEnv(await readFile(file, "utf8")))
    } catch {
      // Optional env file.
    }
  }
  return { ...values, ...process.env }
}

function encodeBase64Text(value: string) {
  return Buffer.from(value, "utf8").toString("base64")
}

function run(command: string, args: string[], cwd: string) {
  const result = spawnSync(command, args, {
    cwd,
    env: process.env,
    stdio: "inherit",
  })
  if (result.status !== 0) {
    throw new Error(`${command} ${args.join(" ")} failed`)
  }
}

async function waitForRpc(rpcUrl: string) {
  for (let attempt = 0; attempt < 40; attempt++) {
    try {
      const response = await fetch(rpcUrl, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          id: 1,
          jsonrpc: "2.0",
          method: "eth_chainId",
          params: [],
        }),
      })
      if (response.ok) return
    } catch {
      // Keep waiting.
    }
    await new Promise((resolve) => setTimeout(resolve, 500))
  }
  throw new Error(`RPC did not become available: ${rpcUrl}`)
}

async function main() {
  const target = parseTarget(argValue("--target"), "real")

  const loadedEnv = await loadContractEnv()
  const rpcUrl =
    argValue("--rpc-url") ??
    (target === "local" ? "http://127.0.0.1:8545" : loadedEnv.RPC_URL)
  const chainId = Number(loadedEnv.CHAIN_ID ?? 1337)
  const privateKey = String(loadedEnv.PRIVATE_KEY ?? "").replace(/^0x/, "")
  if (!privateKey) throw new Error("PRIVATE_KEY is required in contract env")
  if (!rpcUrl) throw new Error("RPC_URL is required")

  await waitForRpc(rpcUrl)
  run("forge", ["build"], contractDir)

  const artifact = JSON.parse(await readFile(artifactPath, "utf8")) as {
    abi: readonly unknown[]
    bytecode: { object: `0x${string}` }
  }
  const account = privateKeyToAccount(`0x${privateKey}`)
  const publicClient = createPublicClient({ transport: http(rpcUrl) })
  const walletClient = createWalletClient({
    account,
    transport: http(rpcUrl),
  })

  const balance = await publicClient.getBalance({ address: account.address })
  if (balance < parseEther("0.01")) {
    throw new Error(
      `Deployer ${account.address} has insufficient balance on ${rpcUrl}`
    )
  }

  console.log(`Deploying BPJSMedicalRecords to ${target} RPC ${rpcUrl}`)
  console.log(`Deployer: ${account.address}`)

  const deployHash = await walletClient.deployContract({
    abi: artifact.abi,
    bytecode: artifact.bytecode.object,
    chain: null,
  })
  const deployReceipt = await publicClient.waitForTransactionReceipt({
    hash: deployHash,
  })
  const contractAddress = deployReceipt.contractAddress
  if (!contractAddress) throw new Error("Deployment did not return address")

  async function write(functionName: string, args: readonly unknown[]) {
    const hash = await walletClient.sendTransaction({
      account,
      chain: null,
      to: contractAddress,
      data: encodeFunctionData({
        abi: artifact.abi,
        functionName,
        args,
      }),
    })
    await publicClient.waitForTransactionReceipt({ hash })
    return hash
  }

  await write("registerUser", [
    encodeBase64Text("Admin Faskes Pasien Auditor E2E"),
  ])
  await write("setFaskes", [account.address, true])
  await write("setPasien", [account.address, true])
  await write("setAuditor", [account.address, true])
  await write("registerBPJS", [account.address, "BPJS-E2E-001"])
  const seededRecordHash = await write("submitMedicalRecord", [
    account.address,
    account.address,
    encodeBase64Text("Seed rekam medis E2E"),
    [encodeBase64Text("Diagnosis")],
    [encodeBase64Text("Kontrol awal")],
  ])
  const faskesRecordHash = seededRecordHash

  const chainIdHex: `0x${string}` = `0x${chainId.toString(16)}`
  const result: SeedResult = {
    target,
    rpcUrl,
    chainId,
    chainIdHex,
    contractAddress,
    deployerAddress: account.address,
    faskesRecordHash,
    seededRecordHash,
  }

  await mkdir(stateDir, { recursive: true })
  await writeFile(
    path.join(stateDir, `${target}.json`),
    `${JSON.stringify(result, null, 2)}\n`
  )
  await writeFile(
    path.join(frontendDir, `.env.e2e.${target}`),
    [
      `VITE_CHAIN_ID=${chainId}`,
      `VITE_CHAIN_ID_HEX=${chainIdHex}`,
      "VITE_CHAIN_NAME=BPJS Local Chain",
      "VITE_NATIVE_CURRENCY_NAME=Ether",
      "VITE_NATIVE_CURRENCY_SYMBOL=ETH",
      "VITE_NATIVE_CURRENCY_DECIMALS=18",
      `VITE_RPC_URL=${rpcUrl}`,
      `VITE_BLOCKSCOUT_URL=${loadedEnv.BLOCKSCOUT_URL ?? "https://blockscout.denis.my.id"}`,
      `VITE_CONTRACT_ADDRESS=${contractAddress}`,
      `VITE_IPFS_API_URL=${loadedEnv.IPFS_API_URL ?? "https://ipfs-api.denis.my.id"}`,
      `VITE_IPFS_GATEWAY_URL=${loadedEnv.IPFS_GATEWAY_URL ?? "https://ipfs-gateway.denis.my.id/ipfs"}`,
      "VITE_DOCUMENT_ENCRYPTION_KEY=e2e-document-key",
      "",
    ].join("\n")
  )

  console.log(`Seeded ${target} contract: ${contractAddress}`)
  console.log(`State: e2e/.state/${target}.json`)
}

await main()
