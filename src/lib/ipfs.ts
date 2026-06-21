import { env } from "@/config/env"

import {
  decryptBytes,
  encryptBytes,
  envelopeFromText,
  envelopeToBytes,
} from "./crypto"

type IpfsUploadResponse = {
  cid?: string
  Hash?: string
  IpfsHash?: string
}

function resolveCid(response: IpfsUploadResponse) {
  const cid = response.cid ?? response.Hash ?? response.IpfsHash
  if (!cid) throw new Error("Respons IPFS tidak berisi CID")
  return cid
}

export async function uploadEncryptedFile(file: File) {
  if (!env.VITE_DOCUMENT_ENCRYPTION_KEY) {
    throw new Error("Kunci enkripsi dokumen belum dikonfigurasi")
  }

  const encrypted = await encryptBytes(
    new Uint8Array(await file.arrayBuffer()),
    env.VITE_DOCUMENT_ENCRYPTION_KEY
  )
  const blob = new Blob([envelopeToBytes(encrypted)], {
    type: "application/json",
  })
  const body = new FormData()
  body.append("file", blob, `${file.name}.encrypted.json`)

  const response = await fetch(env.VITE_IPFS_API_URL, {
    method: "POST",
    body,
  })
  if (!response.ok) throw new Error("Upload IPFS gagal")

  return { cid: resolveCid((await response.json()) as IpfsUploadResponse) }
}

export async function downloadEncryptedFile(cid: string) {
  if (!env.VITE_DOCUMENT_ENCRYPTION_KEY) {
    throw new Error("Kunci enkripsi dokumen belum dikonfigurasi")
  }

  const response = await fetch(`${env.VITE_IPFS_GATEWAY_URL}/${cid}`)
  if (!response.ok) throw new Error("Unduh dokumen IPFS gagal")

  const envelope = envelopeFromText(await response.text())
  const bytes = await decryptBytes(envelope, env.VITE_DOCUMENT_ENCRYPTION_KEY)
  return new Blob([bytes.buffer as ArrayBuffer])
}
