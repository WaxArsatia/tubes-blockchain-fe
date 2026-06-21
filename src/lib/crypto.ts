import { decodeBase64Text, encodeBase64Text } from "./encoding"

export type EncryptedEnvelope = {
  version: 1
  salt: string
  iv: string
  ciphertext: string
}

const encoder = new TextEncoder()

function bytesToBase64(bytes: Uint8Array) {
  let binary = ""
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary)
}

function base64ToBytes(value: string) {
  const binary = atob(value)
  return Uint8Array.from(binary, (char) => char.charCodeAt(0))
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
      salt: salt.buffer as ArrayBuffer,
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
    { name: "AES-GCM", iv: iv.buffer },
    key,
    bytes.buffer as ArrayBuffer
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

  const salt = base64ToBytes(envelope.salt)
  const iv = base64ToBytes(envelope.iv)
  const key = await deriveKey(passphrase, salt)
  const plaintext = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: iv.buffer },
    key,
    base64ToBytes(envelope.ciphertext)
  )

  return new Uint8Array(plaintext)
}

export function envelopeToBytes(envelope: EncryptedEnvelope) {
  return encoder.encode(JSON.stringify(envelope))
}

export function envelopeFromText(value: string) {
  return JSON.parse(value) as EncryptedEnvelope
}

export const encodeDocumentLabel = encodeBase64Text
export const decodeDocumentLabel = decodeBase64Text
