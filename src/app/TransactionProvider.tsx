import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from "react"
import type { ReactNode } from "react"

import { waitForTransaction } from "@/contracts/bpjsMedicalRecords"
import { toUserFacingError } from "@/lib/errors"

export type TransactionState = {
  status: "idle" | "wallet" | "submitted" | "confirmed" | "failed"
  action?: string
  hash?: `0x${string}`
  message?: string
}

export const initialTransactionState: TransactionState = {
  status: "idle",
}

export type RunTransaction = (
  action: string,
  request: () => Promise<`0x${string}`>
) => Promise<`0x${string}`>

export async function executeTransactionLifecycle({
  action,
  request,
  waitForReceipt,
  setState,
}: {
  action: string
  request: () => Promise<`0x${string}`>
  waitForReceipt: (hash: `0x${string}`) => Promise<unknown>
  setState: (state: TransactionState) => void
}) {
  let hash: `0x${string}` | undefined

  setState({
    status: "wallet",
    action,
    message: "Konfirmasi transaksi di wallet.",
  })

  try {
    hash = await request()
    setState({
      status: "submitted",
      action,
      hash,
      message: "Transaksi dikirim. Menunggu konfirmasi jaringan.",
    })
    await waitForReceipt(hash)
    setState({
      status: "confirmed",
      action,
      hash,
      message: "Transaksi berhasil dikonfirmasi.",
    })
    return hash
  } catch (error) {
    setState({
      status: "failed",
      action,
      ...(hash ? { hash } : {}),
      message: toUserFacingError(error),
    })
    throw error
  }
}

const TransactionStateContext = createContext<TransactionState | null>(null)
const TransactionRunnerContext = createContext<RunTransaction | null>(null)

export function TransactionProvider({ children }: { children: ReactNode }) {
  const [transaction, setTransaction] = useState(initialTransactionState)
  const latestOperationId = useRef(0)
  const runTransaction = useCallback<RunTransaction>((action, request) => {
    const operationId = latestOperationId.current + 1
    latestOperationId.current = operationId

    return executeTransactionLifecycle({
      action,
      request,
      waitForReceipt: (hash) => waitForTransaction(hash),
      setState: (state) => {
        if (latestOperationId.current === operationId) {
          setTransaction(state)
        }
      },
    })
  }, [])
  const stateValue = useMemo(() => transaction, [transaction])

  return (
    <TransactionRunnerContext value={runTransaction}>
      <TransactionStateContext value={stateValue}>
        {children}
      </TransactionStateContext>
    </TransactionRunnerContext>
  )
}

export function useTransactionState() {
  const transaction = useContext(TransactionStateContext)
  if (!transaction) {
    throw new Error(
      "useTransactionState harus dipakai dalam TransactionProvider"
    )
  }
  return transaction
}

export function useTransactionRunner() {
  const runTransaction = useContext(TransactionRunnerContext)
  if (!runTransaction) {
    throw new Error(
      "useTransactionRunner harus dipakai dalam TransactionProvider"
    )
  }
  return runTransaction
}
