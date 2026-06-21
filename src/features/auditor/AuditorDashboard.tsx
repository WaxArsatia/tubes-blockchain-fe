import { useMemo, useState } from "react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
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
import { EmptyState, LoadingRows } from "@/components/shared/StateViews"
import {
  useAccessRequests,
  useRequestRecordAccess,
  useUsers,
} from "@/hooks/useBpjsContract"
import { roleLabel, safeDecode, shortAddress } from "@/lib/users"
import type { Role } from "@/lib/users"

const roles: Role[] = ["admin", "faskes", "pasien", "auditor"]

export function AuditorDashboard() {
  const users = useUsers()
  const accessRequests = useAccessRequests()
  const requestAccess = useRequestRecordAccess()
  const [recordId, setRecordId] = useState("")
  const [status, setStatus] = useState("all")

  const stats = useMemo(() => {
    const allUsers = users.data ?? []
    const requests = accessRequests.data ?? []
    return {
      users: allUsers.length,
      activeBpjs: allUsers.filter(
        (user) => user.roles.includes("pasien") && user.bpjsId
      ).length,
      pending: requests.filter(
        (request) =>
          !request.revoked &&
          (!request.patientApproved || !request.faskesApproved)
      ).length,
      approved: requests.filter(
        (request) =>
          request.patientApproved && request.faskesApproved && !request.revoked
      ).length,
      revoked: requests.filter((request) => request.revoked).length,
    }
  }, [accessRequests.data, users.data])

  const filteredRequests = useMemo(() => {
    const requests = accessRequests.data ?? []
    if (status === "approved") {
      return requests.filter(
        (request) =>
          request.patientApproved && request.faskesApproved && !request.revoked
      )
    }
    if (status === "revoked")
      return requests.filter((request) => request.revoked)
    if (status === "pending") {
      return requests.filter(
        (request) =>
          !request.revoked &&
          (!request.patientApproved || !request.faskesApproved)
      )
    }
    return requests
  }, [accessRequests.data, status])

  return (
    <div className="grid gap-4">
      <div>
        <h2 className="text-xl font-semibold">Dashboard Auditor</h2>
        <p className="text-sm text-muted-foreground">
          Monitor pengguna dan permintaan akses tanpa melewati persetujuan
          pasien/faskes.
        </p>
      </div>

      <div className="grid gap-3 md:grid-cols-5">
        {[
          ["Pengguna", stats.users],
          ["Pasien BPJS", stats.activeBpjs],
          ["Menunggu", stats.pending],
          ["Disetujui", stats.approved],
          ["Dicabut", stats.revoked],
        ].map(([label, value]) => (
          <Card key={label} size="sm">
            <CardHeader>
              <CardTitle className="text-sm">{label}</CardTitle>
            </CardHeader>
            <CardContent className="text-2xl font-semibold">
              {value}
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Minta akses rekam medis</CardTitle>
        </CardHeader>
        <CardContent>
          <form
            className="grid gap-3 md:grid-cols-[16rem_auto]"
            onSubmit={(event) => {
              event.preventDefault()
              if (recordId) requestAccess.mutate(BigInt(recordId))
            }}
          >
            <div className="grid gap-2">
              <Label htmlFor="recordId">ID rekam medis</Label>
              <Input
                id="recordId"
                min="1"
                type="number"
                value={recordId}
                onChange={(event) => setRecordId(event.target.value)}
              />
            </div>
            <Button
              type="submit"
              className="self-end"
              disabled={!recordId || requestAccess.isPending}
            >
              Kirim permintaan
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Permintaan akses</CardTitle>
          <select
            className="h-8 w-fit rounded-lg border bg-background px-2 text-sm"
            value={status}
            onChange={(event) => setStatus(event.target.value)}
          >
            <option value="all">Semua status</option>
            <option value="pending">Menunggu</option>
            <option value="approved">Disetujui</option>
            <option value="revoked">Dicabut</option>
          </select>
        </CardHeader>
        <CardContent>
          {accessRequests.isLoading ? <LoadingRows /> : null}
          {filteredRequests.length === 0 && !accessRequests.isLoading ? (
            <EmptyState
              title="Belum ada data"
              description="Permintaan akses yang tercatat kontrak tampil di sini."
            />
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Record</TableHead>
                    <TableHead>Pasien</TableHead>
                    <TableHead>Faskes</TableHead>
                    <TableHead>Requester</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRequests.map((request) => (
                    <TableRow key={`${request.recordId}-${request.requester}`}>
                      <TableCell>{safeDecode(request.recordLabel)}</TableCell>
                      <TableCell className="font-mono text-xs">
                        {shortAddress(request.patient)}
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        {shortAddress(request.faskes)}
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        {shortAddress(request.requester)}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            request.revoked ? "destructive" : "secondary"
                          }
                        >
                          {request.revoked
                            ? "Dicabut"
                            : request.patientApproved && request.faskesApproved
                              ? "Disetujui"
                              : "Menunggu"}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Distribusi role</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          {roles.map((role) => (
            <Badge key={role} variant="outline">
              {roleLabel(role)}:{" "}
              {users.data?.filter((user) => user.roles.includes(role)).length ??
                0}
            </Badge>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}
