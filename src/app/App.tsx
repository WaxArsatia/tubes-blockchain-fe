import { useEffect, useMemo, useState } from "react"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { AppShell } from "@/app/AppShell"
import { contractAddress, env } from "@/config/env"
import { useUsers } from "@/hooks/useBpjsContract"
import { useWallet } from "@/hooks/useWallet"
import { AdminDashboard } from "@/features/admin/AdminDashboard"
import { AuditorDashboard } from "@/features/auditor/AuditorDashboard"
import { FaskesDashboard } from "@/features/faskes/FaskesDashboard"
import { PasienDashboard } from "@/features/pasien/PasienDashboard"
import { SelfRegistration } from "@/features/self-registration/SelfRegistration"
import { getActiveRoles, roleLabel } from "@/lib/users"
import type { Role } from "@/lib/users"

const rolePriority: Role[] = ["admin", "faskes", "pasien", "auditor"]

export function App() {
  const wallet = useWallet()
  const users = useUsers()
  const [selectedRole, setSelectedRole] = useState<Role | null>(null)

  const currentUser = useMemo(
    () =>
      users.data?.find(
        (user) => user.account.toLowerCase() === wallet.account?.toLowerCase()
      ),
    [users.data, wallet.account]
  )
  const roles = currentUser ? getActiveRoles(currentUser) : []

  useEffect(() => {
    if (!selectedRole || !roles.includes(selectedRole)) {
      setSelectedRole(rolePriority.find((role) => roles.includes(role)) ?? null)
    }
  }, [roles, selectedRole])

  if (!wallet.hasProvider) {
    return (
      <CenteredCard title="MetaMask tidak ditemukan">
        Pasang wallet MetaMask-compatible untuk memakai aplikasi BPJS Rekam
        Medis.
      </CenteredCard>
    )
  }

  if (!wallet.account) {
    return (
      <CenteredCard
        title="BPJS Rekam Medis"
        description="Aplikasi operasional faskes, pasien, admin, dan auditor berbasis kontrak."
      >
        <div className="grid gap-3">
          <Alert>
            <AlertTitle>Jaringan target</AlertTitle>
            <AlertDescription>
              {env.VITE_CHAIN_NAME} · kontrak {contractAddress}
            </AlertDescription>
          </Alert>
          <Button
            onClick={() => void wallet.connect()}
            disabled={wallet.isConnecting}
          >
            Hubungkan wallet
          </Button>
        </div>
      </CenteredCard>
    )
  }

  if (!wallet.isCorrectChain) {
    return (
      <CenteredCard title="Jaringan tidak sesuai">
        <div className="grid gap-3">
          <p className="text-sm text-muted-foreground">
            Wallet berada di chain {wallet.chainId ?? "-"}, sementara aplikasi
            memakai chain {env.VITE_CHAIN_ID_HEX}.
          </p>
          <Button onClick={() => void wallet.switchOrAddChain()}>
            Tambah/Switch Jaringan
          </Button>
        </div>
      </CenteredCard>
    )
  }

  if (!currentUser || roles.length === 0) {
    return <SelfRegistration />
  }

  const dashboard =
    selectedRole === "admin" ? (
      <AdminDashboard />
    ) : selectedRole === "faskes" ? (
      <FaskesDashboard account={wallet.account} />
    ) : selectedRole === "pasien" ? (
      <PasienDashboard account={wallet.account} />
    ) : selectedRole === "auditor" ? (
      <AuditorDashboard />
    ) : null

  return (
    <AppShell
      account={wallet.account}
      chainId={wallet.chainId}
      roles={roles}
      selectedRole={selectedRole ?? roles[0]}
      onRoleChange={setSelectedRole}
    >
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <span className="text-sm text-muted-foreground">Workspace aktif:</span>
        <strong>{selectedRole ? roleLabel(selectedRole) : "-"}</strong>
      </div>
      {dashboard}
    </AppShell>
  )
}

function CenteredCard({
  title,
  description,
  children,
}: {
  title: string
  description?: string
  children: React.ReactNode
}) {
  return (
    <main className="grid min-h-svh place-items-center bg-muted/30 p-4">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          {description ? (
            <CardDescription>{description}</CardDescription>
          ) : null}
        </CardHeader>
        <CardContent>{children}</CardContent>
      </Card>
    </main>
  )
}
