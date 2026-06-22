import { getAddress, isAddress } from "viem"
import { z } from "zod"

const envSchema = z.object({
  VITE_CHAIN_ID: z.coerce.number().default(1337),
  VITE_CHAIN_ID_HEX: z.string().default("0x539"),
  VITE_CHAIN_NAME: z.string().default("BPJS Local Chain"),
  VITE_NATIVE_CURRENCY_NAME: z.string().default("Ether"),
  VITE_NATIVE_CURRENCY_SYMBOL: z.string().default("ETH"),
  VITE_NATIVE_CURRENCY_DECIMALS: z.coerce.number().default(18),
  VITE_RPC_URL: z.string().url().default("https://blockchain-rpc.denis.my.id"),
  VITE_BLOCKSCOUT_URL: z
    .string()
    .url()
    .default("https://blockscout.denis.my.id"),
  VITE_CONTRACT_ADDRESS: z
    .string()
    .refine(isAddress, "VITE_CONTRACT_ADDRESS must be an EVM address")
    .default("0x9B8397f1B0FEcD3a1a40CdD5E8221Fa461898517"),
  VITE_IPFS_API_URL: z.string().url().default("https://ipfs-api.denis.my.id"),
  VITE_IPFS_GATEWAY_URL: z
    .string()
    .url()
    .default("https://ipfs-gateway.denis.my.id/ipfs"),
  VITE_DOCUMENT_ENCRYPTION_KEY: z.string().default(""),
})

export const env = envSchema.parse(import.meta.env)
export const contractAddress = getAddress(env.VITE_CONTRACT_ADDRESS)

export const DOCUMENT_ENCRYPTION_KEY_PLACEHOLDER = [
  "change",
  "this",
  "demo",
  "key",
].join("-")
export const DOCUMENT_ENCRYPTION_KEY_MIN_LENGTH = 32

export type DocumentEncryptionKeyStatus =
  | { configured: true; key: string }
  | {
      configured: false
      error: string
      reason: "missing" | "placeholder" | "short"
    }

export function validateDocumentEncryptionKey(
  value: string
): DocumentEncryptionKeyStatus {
  const key = value.trim()
  if (!key) {
    return {
      configured: false,
      reason: "missing",
      error: "Kunci enkripsi dokumen belum dikonfigurasi",
    }
  }

  if (key === DOCUMENT_ENCRYPTION_KEY_PLACEHOLDER) {
    return {
      configured: false,
      reason: "placeholder",
      error: "Kunci enkripsi dokumen masih memakai placeholder",
    }
  }

  if (key.length < DOCUMENT_ENCRYPTION_KEY_MIN_LENGTH) {
    return {
      configured: false,
      reason: "short",
      error: "Kunci enkripsi dokumen minimal 32 karakter",
    }
  }

  return { configured: true, key }
}

export function getDocumentEncryptionKey() {
  const status = validateDocumentEncryptionKey(env.VITE_DOCUMENT_ENCRYPTION_KEY)
  if (!status.configured) throw new Error(status.error)
  return status.key
}
