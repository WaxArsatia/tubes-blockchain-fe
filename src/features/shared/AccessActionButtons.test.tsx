// @vitest-environment jsdom

import { render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

import { AccessActionButtons } from "@/features/shared/AccessActionButtons"

const requester = `0x${"1".repeat(40)}` as const

describe("AccessActionButtons", () => {
  it("announces revoke-pending state as mencabut", () => {
    render(
      <AccessActionButtons
        recordId={7n}
        requester={requester}
        isPending
        pendingAction="revoke"
        onApprove={vi.fn()}
        onRevoke={vi.fn()}
      />
    )

    expect(
      screen
        .getByRole("button", { name: "Mencabut akses rekam medis 7" })
        .hasAttribute("disabled")
    ).toBe(true)
    expect(
      screen.getByRole("button", { name: "Setujui akses rekam medis 7" })
    ).toBeTruthy()
  })
})
