import { useMemo, useState } from "react"
import { isAddress } from "viem"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { ErrorState, LoadingRows } from "@/components/shared/StateViews"
import { UserCombobox } from "@/components/shared/UserCombobox"
import { useRegisterBpjs, useSetRole, useUsers } from "@/hooks/useBpjsContract"
import {
  roleActionKey,
  usePendingActionKeys,
} from "@/hooks/usePendingActionKeys"
import { roleLabel, shortAddress } from "@/lib/users"
import type { Role } from "@/lib/users"

const roles: Role[] = ["admin", "faskes", "pasien", "auditor"]

export function AdminDashboard() {
  const usersQuery = useUsers()
  const setRole = useSetRole()
  const registerBpjs = useRegisterBpjs()
  const [search, setSearch] = useState("")
  const [targetAccount, setTargetAccount] = useState("")
  const [bpjsId, setBpjsId] = useState("")
  const roleActions = usePendingActionKeys()

  const filteredUsers = useMemo(() => {
    const keyword = search.toLowerCase()
    return (usersQuery.data ?? []).filter((user) =>
      [user.account, user.decodedIdentity, user.bpjsId]
        .join(" ")
        .toLowerCase()
        .includes(keyword)
    )
  }, [search, usersQuery.data])

  return (
    <div className="grid gap-4">
      <div>
        <h2 className="text-xl font-semibold">Dashboard Admin</h2>
        <p className="text-sm text-muted-foreground">
          Kelola identitas, role, dan nomor BPJS dari data on-chain.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Atur BPJS</CardTitle>
        </CardHeader>
        <CardContent>
          <form
            className="grid gap-3 md:grid-cols-[1fr_14rem_auto]"
            onSubmit={(event) => {
              event.preventDefault()
              if (isAddress(targetAccount) && bpjsId.trim()) {
                registerBpjs.mutate({
                  account: targetAccount,
                  bpjsId: bpjsId.trim(),
                })
              }
            }}
          >
            <UserCombobox
              allowNewAddress
              users={usersQuery.data ?? []}
              value={targetAccount}
              onValueChange={setTargetAccount}
              label="Pasien"
            />
            <Field data-invalid={bpjsId.length > 0 && !bpjsId.trim()}>
              <FieldLabel htmlFor="bpjsId">Nomor BPJS</FieldLabel>
              <Input
                id="bpjsId"
                value={bpjsId}
                aria-invalid={bpjsId.length > 0 && !bpjsId.trim()}
                onChange={(event) => setBpjsId(event.target.value)}
              />
            </Field>
            <Button
              type="submit"
              className="self-end"
              aria-label={
                registerBpjs.isPending ? "Menyimpan nomor BPJS" : "Simpan"
              }
              disabled={
                !isAddress(targetAccount) ||
                !bpjsId.trim() ||
                registerBpjs.isPending
              }
            >
              Simpan
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Pengguna</CardTitle>
          <Input
            className="max-w-sm"
            placeholder="Cari wallet, identitas, BPJS"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </CardHeader>
        <CardContent>
          {usersQuery.isLoading ? <LoadingRows /> : null}
          {usersQuery.isError ? (
            <ErrorState>{String(usersQuery.error)}</ErrorState>
          ) : null}
          {usersQuery.data ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Wallet</TableHead>
                    <TableHead>Identitas</TableHead>
                    <TableHead>BPJS</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.map((user) => (
                    <TableRow key={user.account}>
                      <TableCell className="font-mono text-xs">
                        {shortAddress(user.account)}
                      </TableCell>
                      <TableCell>{user.decodedIdentity || "-"}</TableCell>
                      <TableCell>{user.bpjsId || "-"}</TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {user.roles.map((role) => (
                            <Badge key={role} variant="secondary">
                              {roleLabel(role)}
                            </Badge>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell>
                        <RoleCheckboxes
                          account={user.account}
                          activeRoles={user.roles}
                          pendingKeys={roleActions.pendingKeys}
                          onChange={(key, role, active) => {
                            void roleActions
                              .run(key, () =>
                                setRole.mutateAsync({
                                  account: user.account,
                                  role,
                                  active,
                                })
                              )
                              .catch(() => undefined)
                          }}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  )
}

export function RoleCheckboxes({
  account,
  activeRoles,
  pendingKeys,
  onChange,
}: {
  account: `0x${string}`
  activeRoles: Role[]
  pendingKeys: ReadonlySet<string>
  onChange: (key: string, role: Role, active: boolean) => void
}) {
  const [confirmation, setConfirmation] = useState<{
    key: string
    role: Role
  } | null>(null)

  return (
    <FieldGroup className="flex-row flex-wrap gap-2">
      {roles.map((role) => {
        const key = roleActionKey(account, role)
        const isPending = pendingKeys.has(key)
        const checked = activeRoles.includes(role)
        const checkboxId = `${key}-checkbox`

        return (
          <Field key={role} orientation="horizontal" className="w-auto gap-1">
            <Checkbox
              id={checkboxId}
              checked={checked}
              disabled={isPending}
              onCheckedChange={(nextChecked) => {
                const active = nextChecked === true
                if (!active && checked) {
                  setConfirmation({ key, role })
                  return
                }
                onChange(key, role, active)
              }}
            />
            <FieldLabel htmlFor={checkboxId} className="text-xs">
              <span className="sr-only">
                {roleLabel(role)} untuk {shortAddress(account)}
              </span>
              <span aria-hidden="true">{roleLabel(role)}</span>
            </FieldLabel>
          </Field>
        )
      })}
      <Dialog
        open={confirmation !== null}
        onOpenChange={(open) => {
          if (!open) setConfirmation(null)
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nonaktifkan role?</DialogTitle>
            <DialogDescription>
              Role {confirmation ? roleLabel(confirmation.role) : ""} untuk{" "}
              {shortAddress(account)} akan dinonaktifkan.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose render={<Button type="button" variant="outline" />}>
              Batal
            </DialogClose>
            <Button
              type="button"
              variant="destructive"
              disabled={
                confirmation ? pendingKeys.has(confirmation.key) : false
              }
              onClick={() => {
                if (!confirmation) return
                onChange(confirmation.key, confirmation.role, false)
                setConfirmation(null)
              }}
            >
              Nonaktifkan role
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </FieldGroup>
  )
}
