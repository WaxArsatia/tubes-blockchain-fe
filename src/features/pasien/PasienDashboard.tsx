import { useMemo, useState } from "react"
import type { Address } from "viem"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { EmptyState, LoadingRows } from "@/components/shared/StateViews"
import { AccessActionButtons } from "@/features/shared/AccessActionButtons"
import {
  useAccessRequests,
  useApproveAccess,
  useMedicalRecord,
  usePatientRecords,
  useRevokeAccess,
  useUsers,
} from "@/hooks/useBpjsContract"
import {
  accessActionKey,
  usePendingActionKeys,
} from "@/hooks/usePendingActionKeys"
import { safeDecode, shortAddress } from "@/lib/users"

export function PasienDashboard({ account }: { account: Address }) {
  const records = usePatientRecords(account)
  const accessRequests = useAccessRequests()
  const users = useUsers()
  const approveAccess = useApproveAccess()
  const revokeAccess = useRevokeAccess()
  const [selectedRecord, setSelectedRecord] = useState<bigint | null>(null)
  const recordDetail = useMedicalRecord(selectedRecord, account)
  const accessActions = usePendingActionKeys()

  const requestsForPatient = useMemo(
    () =>
      (accessRequests.data ?? []).filter(
        (request) => request.patient.toLowerCase() === account.toLowerCase()
      ),
    [accessRequests.data, account]
  )

  const nameFor = (address: string) =>
    users.data?.find(
      (user) => user.account.toLowerCase() === address.toLowerCase()
    )?.decodedIdentity ?? shortAddress(address)

  return (
    <div className="grid gap-4">
      <div>
        <h2 className="text-xl font-semibold">Dashboard Pasien</h2>
        <p className="text-sm text-muted-foreground">
          Lihat ringkasan rekam medis dan kelola persetujuan akses.
        </p>
      </div>

      <div className="grid gap-4 xl:grid-cols-[24rem_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Rekam medis saya</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-2">
            {records.isLoading ? <LoadingRows rows={3} /> : null}
            {records.data?.length === 0 ? (
              <EmptyState
                title="Belum ada rekam medis"
                description="Data akan muncul setelah faskes mengirim catatan."
              />
            ) : null}
            {records.data?.map((record) => (
              <Button
                key={record.id.toString()}
                className="justify-start"
                variant={selectedRecord === record.id ? "default" : "outline"}
                onClick={() => setSelectedRecord(record.id)}
              >
                #{record.id.toString()} {safeDecode(record.label)}
              </Button>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Detail rekam medis</CardTitle>
          </CardHeader>
          <CardContent>
            {!selectedRecord ? (
              <EmptyState
                title="Pilih rekam medis"
                description="Detail dan dokumen terenkripsi muncul setelah dipilih."
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
                    Faskes {shortAddress(recordDetail.data.faskes)}
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
                        className="flex items-center justify-between rounded-md border p-3"
                      >
                        <span>{safeDecode(document.label)}</span>
                        <Badge variant="outline">
                          {document.cid.slice(0, 12)}...
                        </Badge>
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
          <CardTitle>Persetujuan akses</CardTitle>
        </CardHeader>
        <CardContent>
          {requestsForPatient.length === 0 ? (
            <EmptyState
              title="Tidak ada permintaan"
              description="Permintaan akses dari auditor atau pihak lain tampil di sini."
            />
          ) : (
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
                  {requestsForPatient.map((request) => {
                    const key = accessActionKey(
                      request.recordId,
                      request.requester
                    )
                    const isPending = accessActions.pendingKeys.has(key)

                    return (
                      <TableRow
                        key={`${request.recordId}-${request.requester}`}
                      >
                        <TableCell>{safeDecode(request.recordLabel)}</TableCell>
                        <TableCell>{nameFor(request.requester)}</TableCell>
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
                        <TableCell className="space-x-2">
                          <AccessActionButtons
                            recordId={request.recordId}
                            requester={request.requester}
                            isPending={isPending}
                            onApprove={() => {
                              void accessActions
                                .run(key, () =>
                                  approveAccess.mutateAsync({
                                    recordId: request.recordId,
                                    requester: request.requester,
                                  })
                                )
                                .catch(() => undefined)
                            }}
                            onRevoke={() => {
                              void accessActions
                                .run(key, () =>
                                  revokeAccess.mutateAsync({
                                    recordId: request.recordId,
                                    requester: request.requester,
                                  })
                                )
                                .catch(() => undefined)
                            }}
                          />
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
