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
  action,
  hash,
  message,
}: {
  status: "idle" | "wallet" | "submitted" | "confirmed" | "failed"
  action?: string
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
    <div
      className="flex flex-wrap items-center gap-2 rounded-md border bg-muted/30 px-3 py-2 text-sm"
      aria-live="polite"
    >
      <Icon data-icon="inline-start" className="text-muted-foreground" />
      {action ? <span className="font-medium">{action}</span> : null}
      <span className="text-muted-foreground">
        {message ?? statusCopy[status]}
      </span>
      {hash ? (
        <a
          className="inline-flex items-center gap-1 text-primary underline-offset-4 hover:underline"
          href={`${env.VITE_BLOCKSCOUT_URL}/tx/${hash}`}
          rel="noreferrer"
          target="_blank"
          aria-label="Lihat di Blockscout"
        >
          Blockscout
          <ExternalLinkIcon data-icon="inline-end" />
        </a>
      ) : null}
    </div>
  )
}
