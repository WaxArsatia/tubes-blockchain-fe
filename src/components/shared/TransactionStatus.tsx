import {
  CheckCircle2Icon,
  ClockIcon,
  ExternalLinkIcon,
  XCircleIcon,
} from "lucide-react"

import { env } from "@/config/env"

const statusCopy = {
  idle: "Siap",
  wallet: "Menunggu konfirmasi wallet",
  submitted: "Transaksi dikirim",
  confirmed: "Terkonfirmasi",
  failed: "Gagal",
}

export function TransactionStatus({
  status,
  hash,
  message,
}: {
  status: "idle" | "wallet" | "submitted" | "confirmed" | "failed"
  hash?: string
  message?: string
}) {
  const Icon =
    status === "confirmed"
      ? CheckCircle2Icon
      : status === "failed"
        ? XCircleIcon
        : ClockIcon

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-md border bg-muted/30 px-3 py-2 text-sm">
      <Icon className="size-4 text-muted-foreground" />
      <span>{message ?? statusCopy[status]}</span>
      {hash ? (
        <a
          className="inline-flex items-center gap-1 text-primary underline-offset-4 hover:underline"
          href={`${env.VITE_BLOCKSCOUT_URL}/tx/${hash}`}
          rel="noreferrer"
          target="_blank"
        >
          Blockscout
          <ExternalLinkIcon className="size-3" />
        </a>
      ) : null}
    </div>
  )
}
