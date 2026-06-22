// @vitest-environment jsdom

import { act, renderHook, waitFor } from "@testing-library/react"
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest"

import { AppProviders } from "@/app/providers"
import { useTransactionState } from "@/app/TransactionProvider"
import {
  bpjsKeys,
  useAddDocuments,
  useFaskesPatientRecords,
  useRegisterUser,
} from "@/hooks/useBpjsContract"

const hash = `0x${"2".repeat(64)}` as const
const patient = `0x${"1".repeat(40)}` as const
const faskes = `0x${"2".repeat(40)}` as const
const otherFaskes = `0x${"3".repeat(40)}` as const
const contract = vi.hoisted(() => ({
  addDocuments: vi.fn(),
  registerUser: vi.fn(),
  getMedicalRecord: vi.fn(),
  listMedicalRecords: vi.fn(),
  waitForTransaction: vi.fn(),
}))

vi.mock("@/contracts/bpjsMedicalRecords", () => ({
  bpjsReads: {
    listUsers: vi.fn(),
    listAccessRequests: vi.fn(),
    listMedicalRecords: contract.listMedicalRecords,
    getMedicalRecord: contract.getMedicalRecord,
    verifyInsurance: vi.fn(),
  },
  bpjsWrites: {
    registerUser: contract.registerUser,
    setRole: vi.fn(),
    registerBPJS: vi.fn(),
    submitMedicalRecord: vi.fn(),
    addDocuments: contract.addDocuments,
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
  contract.addDocuments.mockReset().mockResolvedValue(hash)
  contract.registerUser.mockReset().mockResolvedValue(hash)
  contract.getMedicalRecord.mockReset()
  contract.listMedicalRecords.mockReset()
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

  it("preserves CID and encoded-label ordering when adding documents", async () => {
    const account = `0x${"1".repeat(40)}` as const
    const { result } = renderHook(
      () => ({
        mutation: useAddDocuments(),
        transaction: useTransactionState(),
      }),
      { wrapper: AppProviders }
    )

    await act(async () => {
      await result.current.mutation.mutateAsync({
        recordId: 7n,
        account,
        cids: ["bafyone", "bafytwo"],
        labels: ["Hasil lab", "Rujukan"],
      })
    })

    expect(contract.addDocuments).toHaveBeenCalledWith(
      7n,
      ["bafyone", "bafytwo"],
      [btoa("Hasil lab"), btoa("Rujukan")]
    )
    expect(contract.waitForTransaction).toHaveBeenCalledWith(hash)
    expect(result.current.transaction.action).toBe("Menambahkan dokumen")
  })

  it("exposes a selected-record query key for document registration refreshes", () => {
    const account = `0x${"1".repeat(40)}` as const

    expect(bpjsKeys.record(7n, account)).toEqual([
      "bpjs",
      "record",
      "7",
      account,
    ])
  })

  it("filters faskes document records by connected faskes before upload", async () => {
    contract.listMedicalRecords.mockResolvedValue([
      { id: 1n, label: btoa("Rekam Faskes") },
      { id: 2n, label: btoa("Rekam Lain") },
      { id: 3n, label: btoa("Rekam Tanpa Akses") },
    ])
    contract.getMedicalRecord
      .mockResolvedValueOnce({
        id: 1n,
        patient,
        faskes,
        label: btoa("Rekam Faskes"),
        fields: [],
        documents: [],
      })
      .mockResolvedValueOnce({
        id: 2n,
        patient,
        faskes: otherFaskes,
        label: btoa("Rekam Lain"),
        fields: [],
        documents: [],
      })
      .mockRejectedValueOnce(new Error("Unauthorized"))

    const { result } = renderHook(
      () => useFaskesPatientRecords(patient, faskes),
      { wrapper: AppProviders }
    )

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(contract.getMedicalRecord).toHaveBeenCalledWith(1n, faskes)
    expect(contract.getMedicalRecord).toHaveBeenCalledWith(2n, faskes)
    expect(contract.getMedicalRecord).toHaveBeenCalledWith(3n, faskes)
    expect(result.current.data).toEqual([
      { id: 1n, label: btoa("Rekam Faskes") },
    ])
  })
})
