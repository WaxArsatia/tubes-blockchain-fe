import { useMemo, useState } from "react"
import { isAddress } from "viem"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
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
            <div className="grid gap-2">
              <Label htmlFor="bpjsId">Nomor BPJS</Label>
              <Input
                id="bpjsId"
                value={bpjsId}
                onChange={(event) => setBpjsId(event.target.value)}
              />
            </div>
            <Button
              className="self-end"
              disabled={!isAddress(targetAccount) || !bpjsId.trim()}
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
                        <div className="flex flex-wrap gap-2">
                          {roles.map((role) => (
                            <label
                              key={role}
                              className="flex items-center gap-1 text-xs"
                            >
                              <Checkbox
                                checked={user.roles.includes(role)}
                                onCheckedChange={(checked) =>
                                  setRole.mutate({
                                    account: user.account,
                                    role,
                                    active: checked === true,
                                  })
                                }
                              />
                              {roleLabel(role)}
                            </label>
                          ))}
                        </div>
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
