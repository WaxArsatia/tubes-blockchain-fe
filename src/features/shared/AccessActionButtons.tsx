import type { Address } from "viem"
import { useState } from "react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { shortAddress } from "@/lib/users"

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
  const [confirmRevokeOpen, setConfirmRevokeOpen] = useState(false)

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
        onClick={() => setConfirmRevokeOpen(true)}
      >
        Cabut
      </Button>
      <Dialog open={confirmRevokeOpen} onOpenChange={setConfirmRevokeOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cabut akses rekam medis?</DialogTitle>
            <DialogDescription>
              Akses requester {shortAddress(requester)} ke rekam medis{" "}
              {recordId.toString()} akan dicabut.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose render={<Button type="button" variant="outline" />}>
              Batal
            </DialogClose>
            <Button
              type="button"
              variant="destructive"
              disabled={isPending}
              onClick={() => {
                onRevoke(recordId, requester)
                setConfirmRevokeOpen(false)
              }}
            >
              Cabut akses
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
