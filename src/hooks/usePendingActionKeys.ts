import { useCallback, useRef, useState } from "react"

export function accessActionKey(recordId: bigint, requester: `0x${string}`) {
  return `access:${recordId}:${requester.toLowerCase()}`
}

export function roleActionKey(
  account: `0x${string}`,
  role: "admin" | "faskes" | "pasien" | "auditor"
) {
  return `role:${account.toLowerCase()}:${role}`
}

export function usePendingActionKeys() {
  const pendingKeysRef = useRef(new Set<string>())
  const [pendingKeys, setPendingKeys] = useState<ReadonlySet<string>>(
    () => new Set()
  )

  const run = useCallback(
    async (key: string, action: () => Promise<unknown>) => {
      if (pendingKeysRef.current.has(key)) return

      pendingKeysRef.current.add(key)
      setPendingKeys(new Set(pendingKeysRef.current))

      try {
        await action()
      } finally {
        pendingKeysRef.current.delete(key)
        setPendingKeys(new Set(pendingKeysRef.current))
      }
    },
    []
  )

  const isPending = useCallback(
    (key: string) => pendingKeys.has(key),
    [pendingKeys]
  )

  return { pendingKeys, isPending, run }
}
