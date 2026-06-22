// @vitest-environment jsdom

import { act, cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

import {
  accessActionKey,
  AccessTable,
  DocumentUploadPanel,
} from "@/features/faskes/FaskesDashboard"
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

describe("DocumentUploadPanel", () => {
  it("clears a selected record when it is no longer in the available records", () => {
    const upload = vi.fn()
    const register = vi.fn()
    const file = new File([new Uint8Array([1, 2, 3])], "hasil lab.pdf", {
      type: "application/pdf",
    })
    const props = {
      encryptionStatus: {
        configured: true,
        key: "shared-demo-document-key-32-chars",
      } as const,
      onUploadFile: upload,
      onRegisterDocuments: register,
    }
    const { rerender } = render(
      <DocumentUploadPanel
        {...props}
        records={[{ id: 1n, label: "Rekam A" }]}
      />
    )

    fireEvent.click(
      screen.getByRole("combobox", { name: "Rekam medis tujuan" })
    )
    fireEvent.click(screen.getByRole("option", { name: /#1/ }))

    rerender(
      <DocumentUploadPanel
        {...props}
        records={[{ id: 2n, label: "Rekam B" }]}
      />
    )
    fireEvent.change(screen.getByLabelText("File dokumen"), {
      target: { files: [file] },
    })

    const recordSelect = screen.getByRole("combobox", {
      name: "Rekam medis tujuan",
    })
    const uploadButton = screen.getByRole("button", {
      name: "Unggah dokumen terenkripsi",
    })

    expect(recordSelect.textContent).toContain("Pilih rekam medis")
    expect(uploadButton).toHaveProperty("disabled", true)

    fireEvent.click(uploadButton)
    expect(upload).not.toHaveBeenCalled()
    expect(register).not.toHaveBeenCalled()
  })

  it("uses a shadcn select trigger for the target record instead of a native select", () => {
    const { container } = render(
      <DocumentUploadPanel
        records={[{ id: 1n, label: "Rekam A" }]}
        encryptionStatus={{
          configured: true,
          key: "shared-demo-document-key-32-chars",
        }}
        onUploadFile={vi.fn()}
        onRegisterDocuments={vi.fn()}
      />
    )

    expect(container.querySelector("select")).toBeNull()
    expect(
      screen.getByRole("combobox", { name: "Rekam medis tujuan" })
    ).toBeTruthy()
  })

  it("disables upload when the shared document key is invalid", () => {
    render(
      <DocumentUploadPanel
        records={[{ id: 1n, label: "Rekam A" }]}
        encryptionStatus={{
          configured: false,
          reason: "missing",
          error: "Kunci enkripsi dokumen belum dikonfigurasi",
        }}
        onUploadFile={vi.fn()}
        onRegisterDocuments={vi.fn()}
      />
    )

    expect(
      screen.getByText("Kunci enkripsi dokumen belum dikonfigurasi")
    ).toBeTruthy()
    expect(
      screen.getByRole("button", { name: "Unggah dokumen terenkripsi" })
    ).toHaveProperty("disabled", true)
  })

  it("keeps uploaded CIDs retryable when contract registration fails", async () => {
    const upload = vi.fn().mockResolvedValue({ cid: "bafyuploadedcid" })
    const register = vi
      .fn()
      .mockRejectedValueOnce(new Error("tx failed"))
      .mockResolvedValueOnce(undefined)
    const file = new File([new Uint8Array([1, 2, 3])], "hasil lab.pdf", {
      type: "application/pdf",
    })

    render(
      <DocumentUploadPanel
        records={[{ id: 1n, label: "Rekam A" }]}
        encryptionStatus={{
          configured: true,
          key: "shared-demo-document-key-32-chars",
        }}
        onUploadFile={upload}
        onRegisterDocuments={register}
      />
    )

    fireEvent.click(
      screen.getByRole("combobox", { name: "Rekam medis tujuan" })
    )
    fireEvent.click(screen.getByRole("option", { name: /#1/ }))
    fireEvent.change(screen.getByLabelText("File dokumen"), {
      target: { files: [file] },
    })
    fireEvent.change(screen.getByLabelText("Label dokumen 1"), {
      target: { value: "Hasil lab" },
    })

    await act(async () => {
      fireEvent.click(
        screen.getByRole("button", { name: "Unggah dokumen terenkripsi" })
      )
    })

    expect(upload).toHaveBeenCalledOnce()
    expect(register).toHaveBeenCalledWith({
      recordId: 1n,
      cids: ["bafyuploadedcid"],
      labels: ["Hasil lab"],
    })
    expect(
      screen.getByText("Upload IPFS berhasil. Registrasi gagal.")
    ).toBeTruthy()
    expect(screen.getByRole("status").textContent).toBe(
      "Upload IPFS berhasil. Registrasi gagal."
    )

    fireEvent.click(
      screen.getByRole("button", { name: "Unggah dokumen terenkripsi" })
    )
    expect(upload).toHaveBeenCalledOnce()
    expect(register).toHaveBeenCalledOnce()

    await act(async () => {
      fireEvent.click(
        screen.getByRole("button", { name: "Coba registrasi lagi" })
      )
    })

    expect(upload).toHaveBeenCalledOnce()
    expect(register).toHaveBeenCalledTimes(2)
  })
})
