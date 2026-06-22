import { decodeBase64Text, encodeBase64Text } from "./encoding"

export type EncryptedEnvelope = {
  version: 1
  salt: string
  iv: string
  ciphertext: string
}

const encoder = new TextEncoder()
const envelopeError = "Amplop dokumen tidak valid"

function exactBuffer(bytes: Uint8Array) {
  return bytes.buffer.slice(
    bytes.byteOffset,
    bytes.byteOffset + bytes.byteLength
  ) as ArrayBuffer
}

function bytesToBase64(bytes: Uint8Array) {
  let binary = ""
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary)
}

function isBase64(value: string) {
  return /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(
    value
  )
}

function base64ToBytes(value: string) {
  if (!isBase64(value)) throw new Error(envelopeError)
  try {
    const binary = atob(value)
    return Uint8Array.from(binary, (char) => char.charCodeAt(0))
  } catch {
    throw new Error(envelopeError)
  }
}

function base64ToBytesWithLength(value: string, length: number) {
  const bytes = base64ToBytes(value)
  if (bytes.byteLength !== length) throw new Error(envelopeError)
  return bytes
}

async function deriveKey(passphrase: string, salt: Uint8Array) {
  const sourceKey = await crypto.subtle.importKey(
    "raw",
    encoder.encode(passphrase),
    "PBKDF2",
    false,
    ["deriveKey"]
  )

  return crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      hash: "SHA-256",
      salt: exactBuffer(salt),
      iterations: 150_000,
    },
    sourceKey,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  )
}

export async function encryptBytes(
  bytes: Uint8Array,
  passphrase: string
): Promise<EncryptedEnvelope> {
  if (!passphrase) throw new Error("Kunci enkripsi dokumen belum dikonfigurasi")

  const salt = crypto.getRandomValues(new Uint8Array(16))
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const key = await deriveKey(passphrase, salt)
  const ciphertext = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv: exactBuffer(iv) },
    key,
    exactBuffer(bytes)
  )

  return {
    version: 1,
    salt: bytesToBase64(salt),
    iv: bytesToBase64(iv),
    ciphertext: bytesToBase64(new Uint8Array(ciphertext)),
  }
}

export async function decryptBytes(
  envelope: EncryptedEnvelope,
  passphrase: string
): Promise<Uint8Array> {
  if (!passphrase) throw new Error("Kunci enkripsi dokumen belum dikonfigurasi")

  const salt = base64ToBytesWithLength(envelope.salt, 16)
  const iv = base64ToBytesWithLength(envelope.iv, 12)
  const ciphertext = base64ToBytes(envelope.ciphertext)
  if (ciphertext.byteLength === 0) throw new Error(envelopeError)
  const key = await deriveKey(passphrase, salt)
  const plaintext = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: exactBuffer(iv) },
    key,
    exactBuffer(ciphertext)
  )

  return new Uint8Array(plaintext)
}

export function envelopeToBytes(envelope: EncryptedEnvelope) {
  return encoder.encode(JSON.stringify(envelope))
}

export function envelopeFromText(value: string): EncryptedEnvelope {
  let parsed: unknown
  try {
    parsed = JSON.parse(value)
  } catch {
    throw new Error(envelopeError)
  }

  if (
    !parsed ||
    typeof parsed !== "object" ||
    Array.isArray(parsed) ||
    Object.keys(parsed).some(
      (key) => !["version", "salt", "iv", "ciphertext"].includes(key)
    )
  ) {
    throw new Error(envelopeError)
  }

  const envelope = parsed as Record<string, unknown>
  if (
    envelope.version !== 1 ||
    typeof envelope.salt !== "string" ||
    typeof envelope.iv !== "string" ||
    typeof envelope.ciphertext !== "string" ||
    envelope.ciphertext.length === 0
  ) {
    throw new Error(envelopeError)
  }

  base64ToBytesWithLength(envelope.salt, 16)
  base64ToBytesWithLength(envelope.iv, 12)
  if (base64ToBytes(envelope.ciphertext).byteLength === 0) {
    throw new Error(envelopeError)
  }

  return {
    version: 1,
    salt: envelope.salt,
    iv: envelope.iv,
    ciphertext: envelope.ciphertext,
  }
}

export const encodeDocumentLabel = encodeBase64Text
export const decodeDocumentLabel = decodeBase64Text
