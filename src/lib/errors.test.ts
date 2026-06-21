import { describe, expect, it } from "vitest"

import { toUserFacingError } from "./errors"

describe("toUserFacingError", () => {
  it("maps wallet rejection", () => {
    expect(toUserFacingError({ code: 4001 })).toBe(
      "Permintaan dibatalkan di wallet."
    )
  })

  it("maps unknown errors", () => {
    expect(toUserFacingError(new Error("boom"))).toBe(
      "Terjadi kesalahan. Coba lagi."
    )
  })
})
