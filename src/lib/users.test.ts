import { describe, expect, it } from "vitest"

import { getActiveRoles } from "./users"

describe("getActiveRoles", () => {
  it("returns every active role", () => {
    expect(
      getActiveRoles({
        isAdmin: true,
        isFaskes: false,
        isPasien: true,
        isAuditor: true,
      })
    ).toEqual(["admin", "pasien", "auditor"])
  })
})
