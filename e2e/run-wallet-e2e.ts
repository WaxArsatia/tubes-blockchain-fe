import { spawn, spawnSync } from "node:child_process"
import http from "node:http"
import type { ChildProcess } from "node:child_process"
import { readFile } from "node:fs/promises"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { createPublicClient, defineChain, http as viemHttp } from "viem"
import { privateKeyToAccount } from "viem/accounts"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const frontendDir = path.resolve(__dirname, "..")

function resolveContractDir() {
  if (process.env.CONTRACT_DIR) return path.resolve(process.env.CONTRACT_DIR)

  const result = spawnSync(
    "git",
    ["rev-parse", "--path-format=absolute", "--git-common-dir"],
    { cwd: frontendDir, encoding: "utf8" }
  )
  if (result.status !== 0) {
    throw new Error("Unable to resolve repository root for contract directory")
  }
  return path.join(path.dirname(path.dirname(result.stdout.trim())), "contract")
}

const contractDir = resolveContractDir()
const stateDir = path.join(frontendDir, "e2e", ".state")
const anvilPrivateKey =
  "ac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80"

type Target = "local" | "real"

function hasFlag(name: string) {
  return process.argv.includes(name)
}

function argValue(name: string) {
  const index = process.argv.indexOf(name)
  return index >= 0 ? process.argv[index + 1] : undefined
}

function parseTarget(value: string | undefined, fallback: Target): Target {
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

function run(command: string, args: string[], env: NodeJS.ProcessEnv) {
  const result = spawnSync(command, args, {
    cwd: frontendDir,
    env,
    stdio: "inherit",
  })
  if (result.status !== 0) {
    throw new Error(`${command} ${args.join(" ")} failed`)
  }
}

async function runAsync(
  command: string,
  args: string[],
  env: NodeJS.ProcessEnv
) {
  const child = spawn(command, args, {
    cwd: frontendDir,
    env,
    stdio: "inherit",
  })

  const status = await new Promise<number | null>((resolve, reject) => {
    child.on("error", reject)
    child.on("exit", resolve)
  })

  if (status !== 0) {
    throw new Error(`${command} ${args.join(" ")} failed`)
  }
}

function readRequestBody(request: http.IncomingMessage) {
  return new Promise<string>((resolve, reject) => {
    const chunks: Buffer[] = []
    request.on("data", (chunk) => chunks.push(Buffer.from(chunk)))
    request.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")))
    request.on("error", reject)
  })
}

async function startInjectedWalletServer({
  privateKey,
  rpcUrl,
  chainIdHex,
}: {
  privateKey: string
  rpcUrl: string
  chainIdHex: string
}) {
  const account = privateKeyToAccount(`0x${privateKey.replace(/^0x/, "")}`)
  const chainId = Number(BigInt(chainIdHex))
  const chain = defineChain({
    id: chainId,
    name: `BPJS E2E ${chainId}`,
    nativeCurrency: {
      name: "Ether",
      symbol: "ETH",
      decimals: 18,
    },
    rpcUrls: {
      default: { http: [rpcUrl] },
    },
  })
  const publicClient = createPublicClient({
    chain,
    transport: viemHttp(rpcUrl),
  })
  let transactionWriteCount = 0

  const server = http.createServer(async (request, response) => {
    response.setHeader("access-control-allow-origin", "*")
    response.setHeader("access-control-allow-methods", "POST, OPTIONS")
    response.setHeader("access-control-allow-headers", "content-type")

    if (request.method === "GET" && request.url === "/metrics") {
      response.writeHead(200, { "content-type": "application/json" })
      response.end(JSON.stringify({ transactionWriteCount }))
      return
    }

    if (request.method === "OPTIONS") {
      response.writeHead(204)
      response.end()
      return
    }

    try {
      const body = JSON.parse(await readRequestBody(request)) as {
        method: string
        params?: unknown[]
      }

      let result: unknown
      if (
        body.method === "eth_requestAccounts" ||
        body.method === "eth_accounts"
      ) {
        result = [account.address]
      } else if (body.method === "eth_chainId") {
        result = chainIdHex
      } else if (
        body.method === "wallet_switchEthereumChain" ||
        body.method === "wallet_addEthereumChain"
      ) {
        result = null
      } else if (body.method === "eth_sendTransaction") {
        const [transaction] = body.params ?? []
        const tx = transaction as {
          to?: `0x${string}`
          data?: `0x${string}`
          value?: `0x${string}`
          gas?: `0x${string}`
          nonce?: `0x${string}`
        }
        const value = tx.value ? BigInt(tx.value) : undefined
        const gas =
          tx.gas !== undefined
            ? BigInt(tx.gas)
            : await publicClient.estimateGas({
                account: account.address,
                to: tx.to,
                data: tx.data,
                value,
              })
        const nonce =
          tx.nonce !== undefined
            ? Number(BigInt(tx.nonce))
            : await publicClient.getTransactionCount({
                address: account.address,
                blockTag: "pending",
              })
        const gasPrice = await publicClient.getGasPrice()
        const serializedTransaction = await account.signTransaction({
          chainId,
          to: tx.to,
          data: tx.data,
          value,
          gas,
          gasPrice,
          nonce,
        })
        result = await publicClient.sendRawTransaction({
          serializedTransaction,
        })
        transactionWriteCount += 1
      } else {
        throw new Error(`Unsupported EIP-1193 method: ${body.method}`)
      }

      response.writeHead(200, { "content-type": "application/json" })
      response.end(JSON.stringify({ result }))
    } catch (error) {
      response.writeHead(500, { "content-type": "application/json" })
      response.end(
        JSON.stringify({
          error: error instanceof Error ? error.message : String(error),
        })
      )
    }
  })

  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve))
  const address = server.address()
  if (!address || typeof address === "string") {
    throw new Error("Injected wallet server did not bind to a TCP port")
  }

  return {
    account: account.address,
    url: `http://127.0.0.1:${address.port}`,
    close: () => new Promise<void>((resolve) => server.close(() => resolve())),
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

function startAnvil(chainId: string) {
  const rpcUrl = "http://127.0.0.1:8545"
  const anvil = spawn(
    "anvil",
    [
      "--host",
      "127.0.0.1",
      "--port",
      "8545",
      "--chain-id",
      chainId,
      "--balance",
      "10000",
      "--block-time",
      "2",
    ],
    {
      cwd: frontendDir,
      stdio: ["ignore", "pipe", "pipe"],
    }
  )

  anvil.stdout.on("data", (chunk) => process.stdout.write(chunk))
  anvil.stderr.on("data", (chunk) => process.stderr.write(chunk))

  return { anvil, rpcUrl }
}

async function main() {
  const target = parseTarget(argValue("--target"), "local")
  const ui = hasFlag("--ui")
  const headed = hasFlag("--headed")
  const envValues = await loadContractEnv()
  let privateKey = String(envValues.PRIVATE_KEY ?? "").replace(/^0x/, "")

  let anvil: ChildProcess | undefined
  let rpcUrl = envValues.RPC_URL ?? "https://blockchain-rpc.denis.my.id"
  if (target === "local") {
    privateKey = anvilPrivateKey
    const local = startAnvil(String(envValues.CHAIN_ID ?? 1337))
    anvil = local.anvil
    rpcUrl = local.rpcUrl
  } else if (!privateKey) {
    throw new Error("PRIVATE_KEY is required in contract env")
  }

  const stopAnvil = () => {
    if (anvil && !anvil.killed) anvil.kill("SIGTERM")
  }
  process.on("SIGINT", () => {
    stopAnvil()
    process.exit(130)
  })
  process.on("SIGTERM", () => {
    stopAnvil()
    process.exit(143)
  })

  try {
    await waitForRpc(rpcUrl)
    run(
      "bun",
      ["e2e/seed-bpjs-state.ts", "--target", target, "--rpc-url", rpcUrl],
      {
        ...process.env,
        PRIVATE_KEY: privateKey,
      }
    )

    const state = JSON.parse(
      await readFile(path.join(stateDir, `${target}.json`), "utf8")
    ) as {
      contractAddress: string
      deployerAddress: string
      rpcUrl: string
      chainId: number
      chainIdHex: string
    }

    const injectedWallet = await startInjectedWalletServer({
      privateKey,
      rpcUrl: state.rpcUrl,
      chainIdHex: state.chainIdHex,
    })

    const { PRIVATE_KEY: _privateKey, ...safeProcessEnv } = process.env
    const testEnv = {
      ...safeProcessEnv,
      ...(!ui && !headed ? { HEADLESS: "true" } : {}),
      E2E_TARGET: target,
      E2E_PROVIDER_URL: injectedWallet.url,
      E2E_DEPLOYER_ADDRESS: state.deployerAddress,
      VITE_CHAIN_ID: String(state.chainId),
      VITE_CHAIN_ID_HEX: state.chainIdHex,
      VITE_CHAIN_NAME: "BPJS Local Chain",
      VITE_NATIVE_CURRENCY_NAME: "Ether",
      VITE_NATIVE_CURRENCY_SYMBOL: "ETH",
      VITE_NATIVE_CURRENCY_DECIMALS: "18",
      VITE_RPC_URL: state.rpcUrl,
      VITE_BLOCKSCOUT_URL:
        envValues.BLOCKSCOUT_URL ?? "https://blockscout.denis.my.id",
      VITE_CONTRACT_ADDRESS: state.contractAddress,
      VITE_IPFS_API_URL:
        envValues.IPFS_API_URL ?? "https://ipfs-api.denis.my.id",
      VITE_IPFS_GATEWAY_URL:
        envValues.IPFS_GATEWAY_URL ?? "https://ipfs-gateway.denis.my.id/ipfs",
      VITE_DOCUMENT_ENCRYPTION_KEY: "e2e-document-key",
    }

    const playwrightArgs = ["playwright", "test", `--project=wallet-${target}`]
    if (ui) playwrightArgs.push("--ui")
    if (headed) playwrightArgs.push("--headed")
    try {
      await runAsync("bunx", playwrightArgs, testEnv)
    } finally {
      await injectedWallet.close()
    }
  } finally {
    stopAnvil()
  }
}

await main()
