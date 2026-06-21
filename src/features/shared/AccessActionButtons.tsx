import type { Address } from "viem"

import { Button } from "@/components/ui/button"

export function AccessActionButtons({
  recordId,
  requester,
  isPending,
  pendingAction,
  onApprove,
  onRevoke,
}: {
  recordId: bigint
  requester: Address
  isPending: boolean
  pendingAction?: "approve" | "revoke"
  onApprove: (recordId: bigint, requester: Address) => void
  onRevoke: (recordId: bigint, requester: Address) => void
}) {
  return (
    <>
      <Button
        size="sm"
        aria-label={
          pendingAction === "approve"
            ? `Menyetujui akses rekam medis ${recordId}`
            : `Setujui akses rekam medis ${recordId}`
        }
        disabled={isPending}
        onClick={() => onApprove(recordId, requester)}
      >
        Setujui
      </Button>
      <Button
        size="sm"
        variant="outline"
        aria-label={
          pendingAction === "revoke"
            ? `Mencabut akses rekam medis ${recordId}`
            : `Cabut akses rekam medis ${recordId}`
        }
        disabled={isPending}
        onClick={() => onRevoke(recordId, requester)}
      >
        Cabut
      </Button>
    </>
  )
}
