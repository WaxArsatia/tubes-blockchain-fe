import type { ReactNode } from "react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { contractAddress, env } from "@/config/env"
import { roleLabel, shortAddress } from "@/lib/users"
import type { Role } from "@/lib/users"

export function AppShell({
  account,
  chainId,
  roles,
  selectedRole,
  onRoleChange,
  children,
}: {
  account: string
  chainId: string | null
  roles: Role[]
  selectedRole: Role
  onRoleChange: (role: Role) => void
  children: ReactNode
}) {
  return (
    <div className="min-h-svh bg-muted/30">
      <header className="sticky top-0 z-10 border-b bg-background/95 backdrop-blur">
        <div className="flex min-h-14 flex-wrap items-center justify-between gap-3 px-4 py-2">
          <div>
            <h1 className="text-lg font-semibold">BPJS Rekam Medis</h1>
            <p className="text-xs text-muted-foreground">
              Kontrak {shortAddress(contractAddress)} · Chain {chainId ?? "-"}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary">{shortAddress(account)}</Badge>
            <Badge>{env.VITE_CHAIN_NAME}</Badge>
          </div>
        </div>
      </header>
      <div className="grid min-h-[calc(100svh-3.5rem)] md:grid-cols-[16rem_1fr]">
        <aside className="border-b bg-background p-3 md:border-r md:border-b-0">
          <div className="grid gap-2">
            {roles.map((role) => (
              <Button
                key={role}
                className="justify-start"
                variant={selectedRole === role ? "default" : "ghost"}
                onClick={() => onRoleChange(role)}
              >
                {roleLabel(role)}
              </Button>
            ))}
          </div>
        </aside>
        <main className="min-w-0 p-4">{children}</main>
      </div>
    </div>
  )
}
