// @vitest-environment jsdom

import { act, renderHook } from "@testing-library/react"
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest"

import { AppProviders } from "@/app/providers"
import { useTransactionState } from "@/app/TransactionProvider"
import { useRegisterUser } from "@/hooks/useBpjsContract"

const hash = `0x${"2".repeat(64)}` as const
const contract = vi.hoisted(() => ({
  registerUser: vi.fn(),
  waitForTransaction: vi.fn(),
}))

vi.mock("@/contracts/bpjsMedicalRecords", () => ({
  bpjsReads: {
    listUsers: vi.fn(),
    listAccessRequests: vi.fn(),
    listMedicalRecords: vi.fn(),
    getMedicalRecord: vi.fn(),
    verifyInsurance: vi.fn(),
  },
  bpjsWrites: {
    registerUser: contract.registerUser,
    setRole: vi.fn(),
    registerBPJS: vi.fn(),
    submitMedicalRecord: vi.fn(),
    addDocuments: vi.fn(),
    approveRecordAccess: vi.fn(),
    revokeRecordAccess: vi.fn(),
    requestRecordAccess: vi.fn(),
  },
  waitForTransaction: contract.waitForTransaction,
}))

beforeAll(() => {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => undefined,
      removeListener: () => undefined,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
      dispatchEvent: () => false,
    }),
  })
})

beforeEach(() => {
  contract.registerUser.mockReset().mockResolvedValue(hash)
  contract.waitForTransaction.mockReset().mockResolvedValue(undefined)
})

describe("contract mutations", () => {
  it("routes registration through the global transaction runner", async () => {
    const { result } = renderHook(
      () => ({
        mutation: useRegisterUser(),
        transaction: useTransactionState(),
      }),
      { wrapper: AppProviders }
    )

    await act(async () => {
      await result.current.mutation.mutateAsync("Budi")
    })

    expect(contract.registerUser).toHaveBeenCalledOnce()
    expect(contract.waitForTransaction).toHaveBeenCalledWith(hash)
    expect(result.current.transaction).toEqual({
      status: "confirmed",
      action: "Menyimpan identitas",
      hash,
      message: "Transaksi berhasil dikonfirmasi.",
    })
  })
})
