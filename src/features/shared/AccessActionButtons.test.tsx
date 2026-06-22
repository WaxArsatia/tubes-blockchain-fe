// @vitest-environment jsdom

import { fireEvent, render, screen } from "@testing-library/react"
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

  it("requires confirmation before revoking access", () => {
    const onRevoke = vi.fn()
    render(
      <AccessActionButtons
        recordId={7n}
        requester={requester}
        isPending={false}
        onApprove={vi.fn()}
        onRevoke={onRevoke}
      />
    )

    fireEvent.click(
      screen.getByRole("button", { name: "Cabut akses rekam medis 7" })
    )

    expect(onRevoke).not.toHaveBeenCalled()
    expect(
      screen.getByRole("dialog", { name: "Cabut akses rekam medis?" })
    ).toBeTruthy()
    expect(screen.getByText(/0x1111/)).toBeTruthy()

    fireEvent.click(screen.getByRole("button", { name: "Batal" }))
    expect(onRevoke).not.toHaveBeenCalled()
    expect(
      screen.queryByRole("dialog", { name: "Cabut akses rekam medis?" })
    ).toBeNull()

    fireEvent.click(
      screen.getByRole("button", { name: "Cabut akses rekam medis 7" })
    )
    fireEvent.click(screen.getByRole("button", { name: "Cabut akses" }))

    expect(onRevoke).toHaveBeenCalledOnce()
    expect(onRevoke).toHaveBeenCalledWith(7n, requester)
  })
})
