import { describe, expect, it } from "vitest"

import { decryptBytes, encryptBytes } from "./crypto"

describe("document crypto", () => {
  it("encrypts and decrypts bytes with a shared key", async () => {
    const source = new TextEncoder().encode("hasil lab")
    const encrypted = await encryptBytes(source, "demo-key")
    const decrypted = await decryptBytes(encrypted, "demo-key")

    expect(new TextDecoder().decode(decrypted)).toBe("hasil lab")
  })
})
