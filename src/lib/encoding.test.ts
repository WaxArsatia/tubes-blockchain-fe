import { describe, expect, it } from "vitest"

import { decodeBase64Text, encodeBase64Text } from "./encoding"

describe("base64 text helpers", () => {
  it("round trips Indonesian text", () => {
    expect(decodeBase64Text(encodeBase64Text("Diagnosis demam"))).toBe(
      "Diagnosis demam"
    )
  })

  it("returns empty text for empty input", () => {
    expect(decodeBase64Text("")).toBe("")
  })
})
