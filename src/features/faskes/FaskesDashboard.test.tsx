// @vitest-environment jsdom

import { act, cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

import { accessActionKey, AccessTable } from "@/features/faskes/FaskesDashboard"
import { usePendingActionKeys } from "@/hooks/usePendingActionKeys"

const patient = `0x${"1".repeat(40)}` as const
const faskes = `0x${"2".repeat(40)}` as const
const requesterA = `0x${"3".repeat(40)}` as const
const requesterB = `0x${"4".repeat(40)}` as const
const zeroAddress = `0x${"0".repeat(40)}` as const
const rows = [
  {
    recordId: 1n,
    patient,
    faskes,
    recordLabel: "Rekam A",
    requester: requesterA,
    exists: true,
    patientApproved: false,
    faskesApproved: false,
    revoked: false,
    revokedBy: zeroAddress,
    requestedAt: 1n,
    updatedAt: 1n,
  },
  {
    recordId: 2n,
    patient,
    faskes,
    recordLabel: "Rekam B",
    requester: requesterB,
    exists: true,
    patientApproved: false,
    faskesApproved: false,
    revoked: false,
    revokedBy: zeroAddress,
    requestedAt: 1n,
    updatedAt: 1n,
  },
] as const

afterEach(cleanup)

describe("AccessTable", () => {
  it("blocks duplicate and conflicting clicks only for the pending request", () => {
    const onApprove = vi.fn()
    const onRevoke = vi.fn()
    const { rerender } = render(
      <AccessTable rows={rows} onApprove={onApprove} onRevoke={onRevoke} />
    )

    const approveA = screen.getByRole("button", {
      name: "Setujui akses rekam medis 1",
    })
    fireEvent.click(approveA)
    expect(onApprove).toHaveBeenCalledOnce()

    rerender(
      <AccessTable
        rows={rows}
        onApprove={onApprove}
        onRevoke={onRevoke}
        pendingActionKeys={new Set([accessActionKey(1n, requesterA)])}
        pendingActionMetadata={
          new Map([[accessActionKey(1n, requesterA), "approve"]])
        }
      />
    )

    const pendingApproveA = screen.getByRole("button", {
      name: "Menyetujui akses rekam medis 1",
    })
    const revokeA = screen.getByRole("button", {
      name: "Cabut akses rekam medis 1",
    })
    const approveB = screen.getByRole("button", {
      name: "Setujui akses rekam medis 2",
    })

    expect(pendingApproveA.hasAttribute("disabled")).toBe(true)
    expect(revokeA.hasAttribute("disabled")).toBe(true)
    expect(approveB.hasAttribute("disabled")).toBe(false)

    fireEvent.click(pendingApproveA)
    fireEvent.click(revokeA)
    expect(onApprove).toHaveBeenCalledOnce()
    expect(onRevoke).not.toHaveBeenCalled()
  })

  it("keeps both requests disabled while overlapping actions are unresolved", async () => {
    const resolvers = new Map<string, () => void>()

    function AccessHarness() {
      const { pendingKeys, run } = usePendingActionKeys()
      const start = (recordId: bigint, requester: `0x${string}`) => {
        const key = accessActionKey(recordId, requester)
        void run(
          key,
          () =>
            new Promise<void>((resolve) => {
              resolvers.set(key, resolve)
            })
        )
      }

      return (
        <AccessTable
          rows={rows}
          onApprove={start}
          onRevoke={start}
          pendingActionKeys={pendingKeys}
        />
      )
    }

    render(<AccessHarness />)
    const approveA = screen.getByRole("button", {
      name: "Setujui akses rekam medis 1",
    })
    const approveB = screen.getByRole("button", {
      name: "Setujui akses rekam medis 2",
    })

    fireEvent.click(approveA)
    fireEvent.click(approveB)

    expect(approveA.hasAttribute("disabled")).toBe(true)
    expect(approveB.hasAttribute("disabled")).toBe(true)

    await act(async () => resolvers.get(accessActionKey(2n, requesterB))?.())

    expect(approveA.hasAttribute("disabled")).toBe(true)
    expect(approveB.hasAttribute("disabled")).toBe(false)
    expect(
      screen
        .getByRole("button", { name: "Cabut akses rekam medis 1" })
        .hasAttribute("disabled")
    ).toBe(true)
  })
})
