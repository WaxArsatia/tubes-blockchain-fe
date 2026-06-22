// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { env, validateDocumentEncryptionKey } from "@/config/env"

import { envelopeToBytes } from "./crypto"
import {
  downloadEncryptedFile,
  getDocumentUploadErrorMessage,
  sanitizeDocumentFilename,
  uploadEncryptedFile,
  validateDocumentUploadInputs,
} from "./ipfs"

const originalKey = env.VITE_DOCUMENT_ENCRYPTION_KEY
const validKey = "shared-demo-document-key-32-chars"
const validCid = "bafybeigdyrztfabcdefabcdefabcdefabcdefabcdefabcdef"
const placeholderKey = ["change", "this", "demo", "key"].join("-")

function setDocumentKey(value: string) {
  env.VITE_DOCUMENT_ENCRYPTION_KEY = value
}

function fileFromBytes(
  bytes: Uint8Array,
  name = "hasil-lab.pdf",
  type = "application/pdf"
) {
  return new File(
    [
      bytes.buffer.slice(
        bytes.byteOffset,
        bytes.byteOffset + bytes.byteLength
      ) as ArrayBuffer,
    ],
    name,
    { type }
  )
}

describe("document encryption key validation", () => {
  it.each([
    ["", "Kunci enkripsi dokumen belum dikonfigurasi"],
    ["   ", "Kunci enkripsi dokumen belum dikonfigurasi"],
    [placeholderKey, "Kunci enkripsi dokumen masih memakai placeholder"],
    ["short-key", "Kunci enkripsi dokumen minimal 32 karakter"],
  ])("rejects invalid keys", (value, message) => {
    const result = validateDocumentEncryptionKey(value)

    expect(result.configured).toBe(false)
    if (result.configured) throw new Error("expected invalid key")
    expect(result.error).toBe(message)
  })

  it("trims and accepts a practical shared key", () => {
    const result = validateDocumentEncryptionKey(`  ${validKey}  `)

    expect(result).toEqual({ configured: true, key: validKey })
  })
})

describe("IPFS encrypted document boundary", () => {
  beforeEach(() => {
    setDocumentKey(validKey)
    vi.stubGlobal("fetch", vi.fn())
  })

  afterEach(() => {
    setDocumentKey(originalKey)
    vi.unstubAllGlobals()
  })

  it("rejects invalid files before reading bytes or calling fetch", async () => {
    const file = fileFromBytes(new Uint8Array([1]), "", "application/pdf")
    const arrayBuffer = vi.spyOn(file, "arrayBuffer")

    await expect(uploadEncryptedFile(file)).rejects.toThrow(
      "Nama dokumen tidak boleh kosong"
    )
    expect(arrayBuffer).not.toHaveBeenCalled()
    expect(fetch).not.toHaveBeenCalled()
  })

  it("validates document batches before reading bytes or calling fetch", () => {
    const validFile = fileFromBytes(new Uint8Array([1]))
    const oversized = fileFromBytes(new Uint8Array([1]))
    Object.defineProperty(oversized, "size", { value: 10 * 1024 * 1024 + 1 })

    expect(
      validateDocumentUploadInputs({
        files: [validFile],
        labels: ["   "],
        encryptionKey: validateDocumentEncryptionKey(validKey),
      })
    ).toEqual({ ok: false, code: "empty-label" })

    expect(
      validateDocumentUploadInputs({
        files: [
          fileFromBytes(new Uint8Array([1]), "script.js", "text/javascript"),
        ],
        labels: ["Lampiran"],
        encryptionKey: validateDocumentEncryptionKey(validKey),
      })
    ).toEqual({ ok: false, code: "unsupported-type" })

    expect(
      validateDocumentUploadInputs({
        files: [oversized],
        labels: ["Lampiran"],
        encryptionKey: validateDocumentEncryptionKey(validKey),
      })
    ).toEqual({ ok: false, code: "too-large" })

    expect(
      validateDocumentUploadInputs({
        files: Array.from({ length: 6 }, () => validFile),
        labels: Array.from({ length: 6 }, () => "Lampiran"),
        encryptionKey: validateDocumentEncryptionKey(validKey),
      })
    ).toEqual({ ok: false, code: "too-many-files" })

    expect(fetch).not.toHaveBeenCalled()
  })

  it("maps stable upload validation codes and sanitizes download names", () => {
    expect(getDocumentUploadErrorMessage("invalid-key")).toBe(
      "Kunci enkripsi dokumen belum siap"
    )
    expect(sanitizeDocumentFilename("../hasil lab?.pdf")).toBe("hasil-lab.pdf")
    expect(sanitizeDocumentFilename("")).toBe("dokumen-terenkripsi")
  })

  it("rejects missing key before reading bytes or calling fetch", async () => {
    setDocumentKey("")
    const file = fileFromBytes(new Uint8Array([1]))
    const arrayBuffer = vi.spyOn(file, "arrayBuffer")

    await expect(uploadEncryptedFile(file)).rejects.toThrow(
      "Kunci enkripsi dokumen belum dikonfigurasi"
    )
    expect(arrayBuffer).not.toHaveBeenCalled()
    expect(fetch).not.toHaveBeenCalled()
  })

  it("uploads an encrypted envelope instead of the original plaintext file", async () => {
    vi.mocked(fetch).mockResolvedValue(
      new Response(JSON.stringify({ cid: validCid }), {
        status: 200,
      })
    )

    const file = fileFromBytes(new TextEncoder().encode("plaintext"))
    await expect(uploadEncryptedFile(file)).resolves.toEqual({
      cid: validCid,
    })

    const [, init] = vi.mocked(fetch).mock.calls[0]
    const body = init?.body
    expect(body).toBeInstanceOf(FormData)
    const uploaded = (body as FormData).get("file")
    expect(uploaded).toBeInstanceOf(File)
    expect((uploaded as File).name).toBe("document-envelope.json")
    expect((uploaded as File).name).not.toContain("hasil-lab")
    expect(await (uploaded as File).text()).not.toContain("plaintext")
  })

  it("stores original document metadata in the encrypted envelope", async () => {
    vi.mocked(fetch).mockResolvedValue(
      new Response(JSON.stringify({ cid: validCid }), {
        status: 200,
      })
    )

    await uploadEncryptedFile(
      fileFromBytes(new TextEncoder().encode("%PDF-1.7"), "klaim.pdf")
    )

    const [, init] = vi.mocked(fetch).mock.calls[0]
    const envelope = JSON.parse(
      await ((init?.body as FormData).get("file") as File).text()
    ) as Record<string, unknown>
    expect(envelope.fileName).toBe("klaim.pdf")
    expect(envelope.mimeType).toBe("application/pdf")
  })

  it("posts uploads to the Kubo add route when configured with the IPFS API origin", async () => {
    env.VITE_IPFS_API_URL = "https://ipfs-api.denis.my.id"
    vi.mocked(fetch).mockResolvedValue(
      new Response(JSON.stringify({ cid: validCid }), {
        status: 200,
      })
    )

    await uploadEncryptedFile(fileFromBytes(new Uint8Array([1])))

    expect(vi.mocked(fetch).mock.calls[0]?.[0]).toBe(
      "https://ipfs-api.denis.my.id/api/v0/add"
    )
  })

  it("rejects malformed CID upload responses", async () => {
    vi.mocked(fetch).mockResolvedValue(
      new Response(JSON.stringify({ cid: "not a cid" }), { status: 200 })
    )

    await expect(
      uploadEncryptedFile(fileFromBytes(new Uint8Array([1])))
    ).rejects.toThrow("Respons IPFS berisi CID tidak valid")
  })

  it("rejects missing key before downloading", async () => {
    setDocumentKey(placeholderKey)

    await expect(downloadEncryptedFile(validCid)).rejects.toThrow(
      "Kunci enkripsi dokumen masih memakai placeholder"
    )
    expect(fetch).not.toHaveBeenCalled()
  })

  it("rejects malformed gateway envelopes", async () => {
    vi.mocked(fetch).mockResolvedValue(new Response("{", { status: 200 }))

    await expect(downloadEncryptedFile(validCid)).rejects.toThrow(
      "Dokumen IPFS tidak berisi amplop terenkripsi yang valid"
    )
  })

  it("decrypts a valid gateway envelope", async () => {
    const { encryptBytes } = await import("./crypto")
    const encrypted = await encryptBytes(
      new TextEncoder().encode("hasil lab"),
      validKey
    )
    vi.mocked(fetch).mockResolvedValue(
      new Response(envelopeToBytes(encrypted), { status: 200 })
    )

    const blob = await downloadEncryptedFile(validCid)

    expect(await blob.text()).toBe("hasil lab")
  })

  it("restores file type and name metadata when downloading new encrypted documents", async () => {
    const { encryptBytes, envelopeToBytes } = await import("./crypto")
    const encrypted = await encryptBytes(
      new TextEncoder().encode("%PDF-1.7"),
      validKey
    )
    vi.mocked(fetch).mockResolvedValue(
      new Response(
        envelopeToBytes({
          ...encrypted,
          fileName: "klaim.pdf",
          mimeType: "application/pdf",
        }),
        { status: 200 }
      )
    )

    const blob = await downloadEncryptedFile(validCid)

    expect(blob).toBeInstanceOf(File)
    expect(blob.type).toBe("application/pdf")
    expect((blob as File).name).toBe("klaim.pdf")
  })

})
