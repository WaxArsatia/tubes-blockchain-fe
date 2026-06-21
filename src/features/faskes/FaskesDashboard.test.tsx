// @vitest-environment jsdom

import { fireEvent, render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

import { AccessTable } from "@/features/faskes/FaskesDashboard"

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
        pendingAction={{
          type: "approve",
          recordId: 1n,
          requester: requesterA,
        }}
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
})
