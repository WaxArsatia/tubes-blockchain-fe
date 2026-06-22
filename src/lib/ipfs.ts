import {
  env,
  getDocumentEncryptionKey,
  validateDocumentEncryptionKey,
} from "@/config/env"
import type { DocumentEncryptionKeyStatus } from "@/config/env"

import {
  decryptBytes,
  encryptBytes,
  envelopeFromText,
  envelopeToBytes,
} from "./crypto"
import type { EncryptedEnvelope } from "./crypto"

type IpfsUploadResponse = {
  cid?: string
  Hash?: string
  IpfsHash?: string
}

export const documentFilePolicy = {
  maxFileSizeBytes: 10 * 1024 * 1024,
  maxFilenameLength: 120,
  maxDocumentsPerTransaction: 5,
  allowedMimeTypes: ["application/pdf", "image/jpeg", "image/png"],
} as const

export type DocumentUploadErrorCode =
  | "invalid-key"
  | "no-files"
  | "too-many-files"
  | "label-count-mismatch"
  | "empty-label"
  | "empty-name"
  | "long-name"
  | "empty-file"
  | "too-large"
  | "unsupported-type"

export type DocumentUploadValidationResult =
  | { ok: true }
  | { ok: false; code: DocumentUploadErrorCode }

const allowedMimeTypes: ReadonlySet<string> = new Set(
  documentFilePolicy.allowedMimeTypes
)
const cidPattern = /^(?:Qm[1-9A-HJ-NP-Za-km-z]{44}|b[a-z2-7]{20,})$/

function validateCid(cid: string) {
  if (!cidPattern.test(cid)) {
    throw new Error("Respons IPFS berisi CID tidak valid")
  }
  return cid
}

function resolveCid(response: IpfsUploadResponse) {
  const cid = response.cid ?? response.Hash ?? response.IpfsHash
  if (!cid) throw new Error("Respons IPFS tidak berisi CID")
  return validateCid(cid)
}

function validateDownloadCid(cid: string) {
  if (!cidPattern.test(cid)) throw new Error("CID dokumen tidak valid")
}

function resolveUploadUrl(apiUrl: string) {
  const url = new URL(apiUrl)
  if (url.pathname === "/" || url.pathname === "") {
    url.pathname = "/api/v0/add"
  }
  return url.toString()
}

export function getDocumentUploadErrorMessage(code: DocumentUploadErrorCode) {
  const messages = {
    "invalid-key": "Kunci enkripsi dokumen belum siap",
    "no-files": "Pilih minimal satu dokumen",
    "too-many-files": "Maksimal 5 dokumen per transaksi",
    "label-count-mismatch": "Jumlah label dokumen tidak sesuai",
    "empty-label": "Label dokumen tidak boleh kosong",
    "empty-name": "Nama dokumen tidak boleh kosong",
    "long-name": "Nama dokumen terlalu panjang",
    "empty-file": "Dokumen tidak boleh kosong",
    "too-large": "Ukuran dokumen melebihi batas 10 MB",
    "unsupported-type": "Tipe dokumen tidak didukung",
  } satisfies Record<DocumentUploadErrorCode, string>
  return messages[code]
}

function fileValidationCode(file: File): DocumentUploadErrorCode | null {
  if (!file.name.trim()) return "empty-name"
  if (file.name.length > documentFilePolicy.maxFilenameLength) {
    return "long-name"
  }
  if (file.size <= 0) return "empty-file"
  if (file.size > documentFilePolicy.maxFileSizeBytes) return "too-large"
  if (!allowedMimeTypes.has(file.type)) return "unsupported-type"
  return null
}

function validateFile(file: File) {
  const code = fileValidationCode(file)
  if (code) throw new Error(getDocumentUploadErrorMessage(code))
}

export function validateDocumentUploadInputs({
  files,
  labels,
  encryptionKey = validateDocumentEncryptionKey(
    env.VITE_DOCUMENT_ENCRYPTION_KEY
  ),
}: {
  files: readonly File[]
  labels: readonly string[]
  encryptionKey?: DocumentEncryptionKeyStatus
}): DocumentUploadValidationResult {
  if (!encryptionKey.configured) return { ok: false, code: "invalid-key" }
  if (files.length === 0) return { ok: false, code: "no-files" }
  if (files.length > documentFilePolicy.maxDocumentsPerTransaction) {
    return { ok: false, code: "too-many-files" }
  }
  if (labels.length !== files.length) {
    return { ok: false, code: "label-count-mismatch" }
  }
  if (labels.some((label) => !label.trim())) {
    return { ok: false, code: "empty-label" }
  }
  for (const file of files) {
    const code = fileValidationCode(file)
    if (code) return { ok: false, code }
  }
  return { ok: true }
}

export function sanitizeDocumentFilename(value: string) {
  const fallback = "dokumen-terenkripsi"
  const basename = value.split(/[\\/]/).filter(Boolean).at(-1) ?? fallback
  const sanitized = basename
    .trim()
    .replace(/[^A-Za-z0-9._ -]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^\.+/, "")
    .slice(0, documentFilePolicy.maxFilenameLength)
  return sanitized || fallback
}

async function parseUploadResponse(response: Response) {
  try {
    return resolveCid((await response.json()) as IpfsUploadResponse)
  } catch (error) {
    if (error instanceof Error && error.message.includes("CID")) throw error
    throw new Error("Respons IPFS tidak valid")
  }
}

export async function uploadEncryptedFile(file: File) {
  const key = getDocumentEncryptionKey()
  validateFile(file)

  const encrypted = await encryptBytes(
    new Uint8Array(await file.arrayBuffer()),
    key
  )
  const blob = new Blob([envelopeToBytes(encrypted)], {
    type: "application/json",
  })
  const body = new FormData()
  body.append("file", blob, "document-envelope.json")

  const response = await fetch(resolveUploadUrl(env.VITE_IPFS_API_URL), {
    method: "POST",
    body,
  })
  if (!response.ok) throw new Error("Upload IPFS gagal")

  return { cid: await parseUploadResponse(response) }
}

export async function downloadEncryptedFile(cid: string) {
  const key = getDocumentEncryptionKey()
  validateDownloadCid(cid)

  const response = await fetch(`${env.VITE_IPFS_GATEWAY_URL}/${cid}`)
  if (!response.ok) throw new Error("Unduh dokumen IPFS gagal")

  let envelope: EncryptedEnvelope
  try {
    envelope = envelopeFromText(await response.text())
  } catch {
    throw new Error("Dokumen IPFS tidak berisi amplop terenkripsi yang valid")
  }

  try {
    const bytes = await decryptBytes(envelope, key)
    return new Blob([
      bytes.buffer.slice(
        bytes.byteOffset,
        bytes.byteOffset + bytes.byteLength
      ) as ArrayBuffer,
    ])
  } catch {
    throw new Error("Dekripsi dokumen IPFS gagal")
  }
}
