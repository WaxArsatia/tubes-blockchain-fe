import { useMemo, useState } from "react"
import type { Address } from "viem"

import { getSharedDocumentEncryptionStatus } from "@/app/AppShell"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Field, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
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
  useMedicalRecord,
  useRequestRecordAccess,
  useUsers,
} from "@/hooks/useBpjsContract"
import { PatientDocumentDownloadButton } from "@/features/pasien/PasienDashboard"
import { downloadEncryptedFile } from "@/lib/ipfs"
import { roleLabel, safeDecode, shortAddress } from "@/lib/users"
import type { Role } from "@/lib/users"

const roles: Role[] = ["admin", "faskes", "pasien", "auditor"]

export function AuditorDashboard({ account }: { account: Address }) {
  const users = useUsers()
  const accessRequests = useAccessRequests()
  const requestAccess = useRequestRecordAccess()
  const [recordId, setRecordId] = useState("")
  const [status, setStatus] = useState("all")
  const [selectedRecord, setSelectedRecord] = useState<bigint | null>(null)
  const recordDetail = useMedicalRecord(selectedRecord, account)

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

  const canOpenRecord = (request: {
    requester: Address
    patientApproved: boolean
    faskesApproved: boolean
    revoked: boolean
  }) =>
    request.requester.toLowerCase() === account.toLowerCase() &&
    request.patientApproved &&
    request.faskesApproved &&
    !request.revoked

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
            <Field data-invalid={recordId.length > 0 && !recordId}>
              <FieldLabel htmlFor="recordId">ID rekam medis</FieldLabel>
              <Input
                id="recordId"
                min="1"
                type="number"
                value={recordId}
                aria-invalid={recordId.length > 0 && !recordId}
                onChange={(event) => setRecordId(event.target.value)}
              />
            </Field>
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

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.1fr)_minmax(22rem,0.9fr)]">
        <Card>
          <CardHeader>
            <CardTitle>Permintaan akses</CardTitle>
            <Select
              value={status}
              onValueChange={(value) => {
                if (value) setStatus(value)
              }}
            >
              <SelectTrigger aria-label="Filter status permintaan">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectItem value="all">Semua status</SelectItem>
                  <SelectItem value="pending">Menunggu</SelectItem>
                  <SelectItem value="approved">Disetujui</SelectItem>
                  <SelectItem value="revoked">Dicabut</SelectItem>
                </SelectGroup>
              </SelectContent>
            </Select>
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
                      <TableHead>Aksi</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredRequests.map((request) => (
                      <TableRow
                        key={`${request.recordId}-${request.requester}`}
                      >
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
                              : request.patientApproved &&
                                  request.faskesApproved
                                ? "Disetujui"
                                : "Menunggu"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {canOpenRecord(request) ? (
                            <Button
                              type="button"
                              size="sm"
                              variant={
                                selectedRecord === request.recordId
                                  ? "default"
                                  : "outline"
                              }
                              aria-label={`Buka detail rekam medis ${request.recordId}`}
                              onClick={() => setSelectedRecord(request.recordId)}
                            >
                              Buka
                            </Button>
                          ) : (
                            <span className="text-xs text-muted-foreground">
                              -
                            </span>
                          )}
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
            <CardTitle>Detail rekam medis</CardTitle>
          </CardHeader>
          <CardContent>
            {!selectedRecord ? (
              <EmptyState
                title="Pilih akses disetujui"
                description="Rekam medis dan dokumen tampil setelah akses auditor disetujui."
              />
            ) : recordDetail.isLoading ? (
              <LoadingRows rows={4} />
            ) : recordDetail.data ? (
              <div className="grid gap-4">
                <div>
                  <h3 className="font-medium">
                    {safeDecode(recordDetail.data.label)}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Pasien {shortAddress(recordDetail.data.patient)} · Faskes{" "}
                    {shortAddress(recordDetail.data.faskes)}
                  </p>
                </div>
                <div className="grid gap-2">
                  {recordDetail.data.fields.map((field) => (
                    <div key={field.label} className="rounded-md border p-3">
                      <div className="text-xs font-medium text-muted-foreground">
                        {safeDecode(field.label)}
                      </div>
                      <div>{safeDecode(field.value) || "-"}</div>
                    </div>
                  ))}
                </div>
                <div className="grid gap-2">
                  <h4 className="font-medium">Dokumen terenkripsi</h4>
                  {recordDetail.data.documents.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      Belum ada dokumen.
                    </p>
                  ) : (
                    recordDetail.data.documents.map((document) => (
                      <div
                        key={document.cid}
                        className="flex flex-wrap items-center justify-between gap-2 rounded-md border p-3"
                      >
                        <span>{safeDecode(document.label)}</span>
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge variant="outline">
                            {document.cid.slice(0, 12)}...
                          </Badge>
                          <PatientDocumentDownloadButton
                            cid={document.cid}
                            label={safeDecode(document.label)}
                            encryptionStatus={getSharedDocumentEncryptionStatus()}
                            onDownload={downloadEncryptedFile}
                          />
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            ) : null}
          </CardContent>
        </Card>
      </div>

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
