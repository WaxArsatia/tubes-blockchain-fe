import { useMemo, useState } from "react"
import { isAddress } from "viem"
import type { Address } from "viem"

import type { AccessRequestRows } from "@/contracts/bpjsMedicalRecords"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { EmptyState, LoadingRows } from "@/components/shared/StateViews"
import { UserCombobox } from "@/components/shared/UserCombobox"
import {
  useAccessRequests,
  useApproveAccess,
  useRevokeAccess,
  useSubmitMedicalRecord,
  useUsers,
} from "@/hooks/useBpjsContract"
import { safeDecode, shortAddress } from "@/lib/users"

const fieldNames = [
  "Tanggal kunjungan",
  "Dokter atau petugas",
  "Fasilitas",
  "Diagnosis",
  "Tindakan",
  "Obat",
  "Catatan",
]

export function FaskesDashboard({ account }: { account: Address }) {
  const usersQuery = useUsers()
  const accessRequests = useAccessRequests()
  const submitRecord = useSubmitMedicalRecord()
  const approveAccess = useApproveAccess()
  const revokeAccess = useRevokeAccess()
  const [patient, setPatient] = useState("")
  const [label, setLabel] = useState("")
  const [fields, setFields] = useState<Record<string, string>>({})

  const patients = useMemo(
    () =>
      (usersQuery.data ?? []).filter((user) => user.roles.includes("pasien")),
    [usersQuery.data]
  )
  const inbox = useMemo(
    () =>
      (accessRequests.data ?? []).filter(
        (request) => request.faskes.toLowerCase() === account.toLowerCase()
      ),
    [accessRequests.data, account]
  )

  return (
    <div className="grid gap-4">
      <div>
        <h2 className="text-xl font-semibold">Dashboard Faskes</h2>
        <p className="text-sm text-muted-foreground">
          Verifikasi pasien, buat rekam medis, dan setujui akses.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Rekam medis baru</CardTitle>
        </CardHeader>
        <CardContent>
          <form
            className="grid gap-3"
            onSubmit={(event) => {
              event.preventDefault()
              if (!isAddress(patient) || !label.trim()) return
              submitRecord.mutate({
                patient: patient,
                faskes: account,
                label: label.trim(),
                fields: fieldNames.map((name) => ({
                  label: name,
                  value: fields[name] ?? "",
                })),
              })
            }}
          >
            <UserCombobox
              users={patients}
              value={patient}
              onValueChange={setPatient}
              label="Pasien"
            />
            <div className="grid gap-2">
              <Label htmlFor="recordLabel">Label rekam medis</Label>
              <Input
                id="recordLabel"
                placeholder="Contoh: Kunjungan rawat jalan Juni"
                value={label}
                onChange={(event) => setLabel(event.target.value)}
              />
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              {fieldNames.map((name) => (
                <div key={name} className="grid gap-2">
                  <Label>{name}</Label>
                  {name === "Catatan" ? (
                    <Textarea
                      value={fields[name] ?? ""}
                      onChange={(event) =>
                        setFields((current) => ({
                          ...current,
                          [name]: event.target.value,
                        }))
                      }
                    />
                  ) : (
                    <Input
                      value={fields[name] ?? ""}
                      onChange={(event) =>
                        setFields((current) => ({
                          ...current,
                          [name]: event.target.value,
                        }))
                      }
                    />
                  )}
                </div>
              ))}
            </div>
            <Button
              disabled={
                !isAddress(patient) || !label.trim() || submitRecord.isPending
              }
            >
              Simpan rekam medis
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Permintaan akses faskes</CardTitle>
        </CardHeader>
        <CardContent>
          {accessRequests.isLoading ? <LoadingRows /> : null}
          {inbox.length === 0 && !accessRequests.isLoading ? (
            <EmptyState
              title="Belum ada permintaan"
              description="Permintaan akses akan muncul di sini."
            />
          ) : (
            <AccessTable
              rows={inbox}
              onApprove={(recordId, requester) =>
                approveAccess.mutate({ recordId, requester })
              }
              onRevoke={(recordId, requester) =>
                revokeAccess.mutate({ recordId, requester })
              }
            />
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function AccessTable({
  rows,
  onApprove,
  onRevoke,
}: {
  rows: AccessRequestRows
  onApprove: (recordId: bigint, requester: Address) => void
  onRevoke: (recordId: bigint, requester: Address) => void
}) {
  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Rekam medis</TableHead>
            <TableHead>Requester</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Aksi</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((request) => (
            <TableRow key={`${request.recordId}-${request.requester}`}>
              <TableCell>{safeDecode(request.recordLabel)}</TableCell>
              <TableCell className="font-mono text-xs">
                {shortAddress(request.requester)}
              </TableCell>
              <TableCell>
                <Badge variant={request.revoked ? "destructive" : "secondary"}>
                  {request.revoked
                    ? "Dicabut"
                    : request.patientApproved && request.faskesApproved
                      ? "Disetujui"
                      : "Menunggu"}
                </Badge>
              </TableCell>
              <TableCell className="space-x-2">
                <Button
                  size="sm"
                  onClick={() => onApprove(request.recordId, request.requester)}
                >
                  Setujui
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onRevoke(request.recordId, request.requester)}
                >
                  Cabut
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
