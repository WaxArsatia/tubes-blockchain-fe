import { describe, expect, it } from "vitest"

import {
  decryptBytes,
  encryptBytes,
  envelopeFromText,
  envelopeToBytes,
} from "./crypto"

const sharedKey = "shared-demo-document-key-32-chars"
const decoder = new TextDecoder()

describe("document crypto", () => {
  it("encrypts and decrypts bytes with a shared key", async () => {
    const source = new TextEncoder().encode("hasil lab")
    const encrypted = await encryptBytes(source, sharedKey)
    const decrypted = await decryptBytes(encrypted, sharedKey)

    expect(decoder.decode(decrypted)).toBe("hasil lab")
  })

  it("uses the intended byte range when encrypting a sliced Uint8Array", async () => {
    const backing = new TextEncoder().encode("before hasil lab after")
    const source = backing.subarray(7, 16)
    const encrypted = await encryptBytes(source, sharedKey)
    const decrypted = await decryptBytes(encrypted, sharedKey)

    expect(decoder.decode(decrypted)).toBe("hasil lab")
  })

  it("creates different salts, IVs, and ciphertexts for the same bytes and key", async () => {
    const source = new TextEncoder().encode("hasil lab")
    const first = await encryptBytes(source, sharedKey)
    const second = await encryptBytes(source, sharedKey)

    expect(first.salt).not.toBe(second.salt)
    expect(first.iv).not.toBe(second.iv)
    expect(first.ciphertext).not.toBe(second.ciphertext)
  })

  it("rejects decryption with the wrong key", async () => {
    const encrypted = await encryptBytes(
      new TextEncoder().encode("hasil lab"),
      sharedKey
    )

    await expect(
      decryptBytes(encrypted, "different-demo-document-key-32-char")
    ).rejects.toThrow()
  })

  it("parses a valid encrypted envelope", async () => {
    const encrypted = await encryptBytes(
      new TextEncoder().encode("hasil lab"),
      sharedKey
    )

    expect(
      envelopeFromText(decoder.decode(envelopeToBytes(encrypted)))
    ).toEqual(encrypted)
  })

  it("rejects malformed envelope JSON", () => {
    expect(() => envelopeFromText("{")).toThrow("Amplop dokumen tidak valid")
  })

  it("rejects unsupported envelope versions", () => {
    expect(() =>
      envelopeFromText(
        JSON.stringify({
          version: 2,
          salt: "AAAAAAAAAAAAAAAAAAAAAA==",
          iv: "AAAAAAAAAAAAAAAA",
          ciphertext: "AA==",
        })
      )
    ).toThrow("Amplop dokumen tidak valid")
  })

  it("rejects invalid envelope base64", () => {
    expect(() =>
      envelopeFromText(
        JSON.stringify({
          version: 1,
          salt: "not base64",
          iv: "AAAAAAAAAAAAAAAA",
          ciphertext: "AA==",
        })
      )
    ).toThrow("Amplop dokumen tidak valid")
  })

  it("rejects bad salt length", () => {
    expect(() =>
      envelopeFromText(
        JSON.stringify({
          version: 1,
          salt: "AA==",
          iv: "AAAAAAAAAAAAAAAA",
          ciphertext: "AA==",
        })
      )
    ).toThrow("Amplop dokumen tidak valid")
  })

  it("rejects bad IV length", () => {
    expect(() =>
      envelopeFromText(
        JSON.stringify({
          version: 1,
          salt: "AAAAAAAAAAAAAAAAAAAAAA==",
          iv: "AA==",
          ciphertext: "AA==",
        })
      )
    ).toThrow("Amplop dokumen tidak valid")
  })

  it("rejects empty ciphertext", () => {
    expect(() =>
      envelopeFromText(
        JSON.stringify({
          version: 1,
          salt: "AAAAAAAAAAAAAAAAAAAAAA==",
          iv: "AAAAAAAAAAAAAAAA",
          ciphertext: "",
        })
      )
    ).toThrow("Amplop dokumen tidak valid")
  })
})
