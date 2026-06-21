// @vitest-environment jsdom

import { act, renderHook } from "@testing-library/react"
import { beforeAll, describe, expect, it, vi } from "vitest"

import { AppProviders } from "@/app/providers"
import {
  executeTransactionLifecycle,
  initialTransactionState,
  useTransactionRunner,
  useTransactionState,
} from "@/app/TransactionProvider"
import type { TransactionState } from "@/app/TransactionProvider"

const hash = `0x${"1".repeat(64)}` as const
const newerHash = `0x${"2".repeat(64)}` as const

const contract = vi.hoisted(() => ({
  waitForTransaction: vi.fn(),
}))

vi.mock("@/contracts/bpjsMedicalRecords", () => ({
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

describe("executeTransactionLifecycle", () => {
  it("reports wallet, submitted, and confirmed states in order", async () => {
    const states: TransactionState[] = []

    const result = await executeTransactionLifecycle({
      action: "Menyimpan rekam medis",
      request: async () => hash,
      waitForReceipt: async () => undefined,
      setState: (state) => states.push(state),
    })

    expect(result).toBe(hash)
    expect(states).toEqual([
      {
        status: "wallet",
        action: "Menyimpan rekam medis",
        message: "Konfirmasi transaksi di wallet.",
      },
      {
        status: "submitted",
        action: "Menyimpan rekam medis",
        hash,
        message: "Transaksi dikirim. Menunggu konfirmasi jaringan.",
      },
      {
        status: "confirmed",
        action: "Menyimpan rekam medis",
        hash,
        message: "Transaksi berhasil dikonfirmasi.",
      },
    ])
  })

  it("reports a wallet rejection and rethrows it", async () => {
    const states: TransactionState[] = []
    const error = Object.assign(new Error("User rejected"), { code: 4001 })

    await expect(
      executeTransactionLifecycle({
        action: "Mencabut akses",
        request: async () => {
          throw error
        },
        waitForReceipt: async () => undefined,
        setState: (state) => states.push(state),
      })
    ).rejects.toBe(error)

    expect(states.at(-1)).toEqual({
      status: "failed",
      action: "Mencabut akses",
      message: "Permintaan dibatalkan di wallet.",
    })
  })

  it("keeps the submitted hash when receipt confirmation fails", async () => {
    const states: TransactionState[] = []
    const error = new Error("receipt failed")

    await expect(
      executeTransactionLifecycle({
        action: "Menyetujui akses",
        request: async () => hash,
        waitForReceipt: async () => {
          throw error
        },
        setState: (state) => states.push(state),
      })
    ).rejects.toBe(error)

    expect(states.at(-1)).toEqual({
      status: "failed",
      action: "Menyetujui akses",
      hash,
      message: "Terjadi kesalahan. Coba lagi.",
    })
  })

  it("clears stale hash and failure text when a new action starts", async () => {
    const states: TransactionState[] = [
      {
        ...initialTransactionState,
        status: "failed",
        hash,
        message: "Kegagalan lama",
      },
    ]

    await executeTransactionLifecycle({
      action: "Menyimpan identitas",
      request: async () => hash,
      waitForReceipt: async () => undefined,
      setState: (state) => states.push(state),
    })

    expect(states[1]).toEqual({
      status: "wallet",
      action: "Menyimpan identitas",
      message: "Konfirmasi transaksi di wallet.",
    })
  })
})

describe("AppProviders", () => {
  it("mounts the transaction provider once for the application", () => {
    const { result } = renderHook(() => useTransactionState(), {
      wrapper: AppProviders,
    })

    expect(result.current).toEqual(initialTransactionState)
  })

  it("keeps the newest transaction when an older receipt resolves last", async () => {
    let resolveOlderReceipt: (() => void) | undefined
    contract.waitForTransaction.mockImplementation(
      (transactionHash: `0x${string}`) =>
        transactionHash === hash
          ? new Promise<void>((resolve) => {
              resolveOlderReceipt = resolve
            })
          : Promise.resolve()
    )
    const { result } = renderHook(
      () => ({
        runTransaction: useTransactionRunner(),
        transaction: useTransactionState(),
      }),
      { wrapper: AppProviders }
    )

    let olderTransaction: Promise<`0x${string}`>
    await act(async () => {
      olderTransaction = result.current.runTransaction(
        "Transaksi lama",
        async () => hash
      )
      await Promise.resolve()
    })

    await act(async () => {
      await result.current.runTransaction(
        "Transaksi terbaru",
        async () => newerHash
      )
    })

    expect(result.current.transaction).toMatchObject({
      status: "confirmed",
      action: "Transaksi terbaru",
      hash: newerHash,
    })

    await act(async () => {
      resolveOlderReceipt?.()
      await olderTransaction
    })

    expect(result.current.transaction).toMatchObject({
      status: "confirmed",
      action: "Transaksi terbaru",
      hash: newerHash,
    })
  })
})
