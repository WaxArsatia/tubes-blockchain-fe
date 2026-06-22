// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { AuditorDashboard } from "@/features/auditor/AuditorDashboard"
import {
  useAccessRequests,
  useMedicalRecord,
  useRequestRecordAccess,
  useUsers,
} from "@/hooks/useBpjsContract"

const auditor = `0x${"a".repeat(40)}` as const
const otherAuditor = `0x${"b".repeat(40)}` as const
const patient = `0x${"1".repeat(40)}` as const
const faskes = `0x${"2".repeat(40)}` as const
const zeroAddress = `0x${"0".repeat(40)}` as const

vi.mock("@/hooks/useBpjsContract", () => ({
  useAccessRequests: vi.fn(),
  useMedicalRecord: vi.fn(),
  useRequestRecordAccess: vi.fn(),
  useUsers: vi.fn(),
}))

vi.mock("@/app/AppShell", () => ({
  getSharedDocumentEncryptionStatus: () => ({
    configured: true,
    key: "shared-demo-document-key-32-chars",
  }),
}))

vi.mock("@/lib/ipfs", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/ipfs")>()
  return {
    ...actual,
    downloadEncryptedFile: vi.fn(),
  }
})

beforeEach(() => {
  vi.mocked(useUsers).mockReturnValue({
    data: [],
    isLoading: false,
  } as unknown as ReturnType<typeof useUsers>)
  vi.mocked(useRequestRecordAccess).mockReturnValue({
    mutate: vi.fn(),
    isPending: false,
  } as unknown as ReturnType<typeof useRequestRecordAccess>)
  vi.mocked(useAccessRequests).mockReturnValue({
    data: [
      {
        recordId: 7n,
        patient,
        faskes,
        recordLabel: btoa("Audit klaim rawat inap"),
        requester: auditor,
        exists: true,
        patientApproved: true,
        faskesApproved: true,
        revoked: false,
        revokedBy: zeroAddress,
        requestedAt: 1n,
        updatedAt: 2n,
      },
      {
        recordId: 8n,
        patient,
        faskes,
        recordLabel: btoa("Audit pihak lain"),
        requester: otherAuditor,
        exists: true,
        patientApproved: true,
        faskesApproved: true,
        revoked: false,
        revokedBy: zeroAddress,
        requestedAt: 1n,
        updatedAt: 2n,
      },
    ],
    isLoading: false,
  } as unknown as ReturnType<typeof useAccessRequests>)
  vi.mocked(useMedicalRecord).mockImplementation((recordId) => {
    if (recordId !== 7n) {
      return { data: undefined, isLoading: false } as unknown as ReturnType<
        typeof useMedicalRecord
      >
    }
    return {
      data: {
        id: 7n,
        patient,
        faskes,
        label: btoa("Audit klaim rawat inap"),
        fields: [
          {
            label: btoa("Diagnosis"),
            value: btoa("Demam berdarah"),
          },
        ],
        documents: [
          {
            cid: "bafybeigdyrztfabcdefabcdefabcdefabcdefabcdefabcdef",
            label: btoa("Hasil lab.pdf"),
            addedAt: 1n,
            addedBy: faskes,
          },
        ],
        createdAt: 1n,
        submittedBy: faskes,
      },
      isLoading: false,
    } as unknown as ReturnType<typeof useMedicalRecord>
  })
})

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

describe("AuditorDashboard", () => {
  it("opens approved records requested by the connected auditor and shows encrypted documents", () => {
    render(<AuditorDashboard account={auditor} />)

    fireEvent.click(
      screen.getByRole("button", { name: "Buka detail rekam medis 7" })
    )

    expect(useMedicalRecord).toHaveBeenLastCalledWith(7n, auditor)
    expect(screen.getByText("Diagnosis")).toBeTruthy()
    expect(screen.getByText("Demam berdarah")).toBeTruthy()
    expect(screen.getByText("Hasil lab.pdf")).toBeTruthy()
    expect(
      screen.getByRole("button", { name: "Unduh Hasil lab.pdf" })
    ).toBeTruthy()
    expect(
      screen.queryByRole("button", { name: "Buka detail rekam medis 8" })
    ).toBeNull()
  })
})
