import { useEffect, useMemo, useState } from "react"
import { isAddress } from "viem"
import type { Address } from "viem"

import { getSharedDocumentEncryptionStatus } from "@/app/AppShell"
import type { AccessRequestRows } from "@/contracts/bpjsMedicalRecords"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
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
import { AccessActionButtons } from "@/features/shared/AccessActionButtons"
import {
  useAccessRequests,
  useAddDocuments,
  useApproveAccess,
  useFaskesPatientRecords,
  useRevokeAccess,
  useSubmitMedicalRecord,
  useUsers,
} from "@/hooks/useBpjsContract"
import {
  accessActionKey,
  usePendingActionKeys,
} from "@/hooks/usePendingActionKeys"
import { safeDecode, shortAddress } from "@/lib/users"
import {
  getDocumentUploadErrorMessage,
  uploadEncryptedFile,
  validateDocumentUploadInputs,
} from "@/lib/ipfs"
import type { DocumentEncryptionKeyStatus } from "@/config/env"

export { accessActionKey } from "@/hooks/usePendingActionKeys"

const fieldNames = [
  "Tanggal kunjungan",
  "Dokter atau petugas",
  "Fasilitas",
  "Diagnosis",
  "Tindakan",
  "Obat",
  "Catatan",
]
const emptyPendingKeys = new Set<string>()
const emptyPendingMetadata = new Map<string, string>()

export function FaskesDashboard({ account }: { account: Address }) {
  const usersQuery = useUsers()
  const accessRequests = useAccessRequests()
  const submitRecord = useSubmitMedicalRecord()
  const approveAccess = useApproveAccess()
  const revokeAccess = useRevokeAccess()
  const [patient, setPatient] = useState("")
  const [label, setLabel] = useState("")
  const [fields, setFields] = useState<Record<string, string>>({})
  const [documentPatient, setDocumentPatient] = useState("")
  const documentRecords = useFaskesPatientRecords(
    isAddress(documentPatient) ? documentPatient : null,
    account
  )
  const addDocuments = useAddDocuments()
  const accessActions = usePendingActionKeys()

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
  const submitMedicalRecordForm = () => {
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
  }

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
              submitMedicalRecordForm()
            }}
          >
            <UserCombobox
              users={patients}
              value={patient}
              onValueChange={setPatient}
              label="Pasien"
            />
            <Field data-invalid={label.length > 0 && !label.trim()}>
              <FieldLabel htmlFor="recordLabel">Label rekam medis</FieldLabel>
              <Input
                id="recordLabel"
                placeholder="Contoh: Kunjungan rawat jalan Juni"
                value={label}
                aria-invalid={label.length > 0 && !label.trim()}
                onChange={(event) => setLabel(event.target.value)}
              />
            </Field>
            <FieldGroup className="gap-3 md:grid md:grid-cols-2">
              {fieldNames.map((name) => (
                <Field key={name}>
                  <FieldLabel htmlFor={`record-${name}`}>{name}</FieldLabel>
                  {name === "Catatan" ? (
                    <Textarea
                      id={`record-${name}`}
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
                      id={`record-${name}`}
                      value={fields[name] ?? ""}
                      onChange={(event) =>
                        setFields((current) => ({
                          ...current,
                          [name]: event.target.value,
                        }))
                      }
                    />
                  )}
                </Field>
              ))}
            </FieldGroup>
            <Button
              type="submit"
              aria-label={
                submitRecord.isPending
                  ? "Menyimpan rekam medis"
                  : "Simpan rekam medis"
              }
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
              onApprove={(recordId, requester) => {
                const key = accessActionKey(recordId, requester)
                void accessActions
                  .run(
                    key,
                    () => approveAccess.mutateAsync({ recordId, requester }),
                    "approve"
                  )
                  .catch(() => undefined)
              }}
              onRevoke={(recordId, requester) => {
                const key = accessActionKey(recordId, requester)
                void accessActions
                  .run(
                    key,
                    () => revokeAccess.mutateAsync({ recordId, requester }),
                    "revoke"
                  )
                  .catch(() => undefined)
              }}
              pendingActionKeys={accessActions.pendingKeys}
              pendingActionMetadata={accessActions.pendingMetadata}
            />
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Dokumen rekam medis</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3">
          <UserCombobox
            users={patients}
            value={documentPatient}
            onValueChange={setDocumentPatient}
            label="Pasien untuk dokumen"
          />
          <DocumentUploadPanel
            records={documentRecords.data ?? []}
            encryptionStatus={getSharedDocumentEncryptionStatus()}
            onUploadFile={uploadEncryptedFile}
            onRegisterDocuments={(input) =>
              addDocuments.mutateAsync({
                ...input,
                account,
              })
            }
          />
        </CardContent>
      </Card>
    </div>
  )
}

type DocumentRecordOption = {
  id: bigint
  label: string
}

type UploadedDocumentRegistration = {
  recordId: bigint
  cids: string[]
  labels: string[]
}

export function DocumentUploadPanel({
  records,
  encryptionStatus,
  onUploadFile,
  onRegisterDocuments,
}: {
  records: readonly DocumentRecordOption[]
  encryptionStatus: DocumentEncryptionKeyStatus
  onUploadFile: (file: File) => Promise<{ cid: string }>
  onRegisterDocuments: (input: UploadedDocumentRegistration) => Promise<unknown>
}) {
  const [recordId, setRecordId] = useState("")
  const [files, setFiles] = useState<File[]>([])
  const [labels, setLabels] = useState<string[]>([])
  const [status, setStatus] = useState("")
  const [isWorking, setIsWorking] = useState(false)
  const [pendingRegistration, setPendingRegistration] =
    useState<UploadedDocumentRegistration | null>(null)

  const selectedRecordId =
    records.find((record) => record.id.toString() === recordId)?.id ?? null
  const validRecordId = selectedRecordId?.toString() ?? ""

  useEffect(() => {
    if (!recordId || selectedRecordId !== null) return
    setRecordId("")
    setPendingRegistration(null)
    setStatus("")
  }, [recordId, selectedRecordId])

  const disabled =
    isWorking ||
    !encryptionStatus.configured ||
    selectedRecordId === null ||
    files.length === 0 ||
    labels.some((label) => !label.trim()) ||
    pendingRegistration !== null

  async function registerDocuments(input: UploadedDocumentRegistration) {
    setStatus("Mendaftarkan CID ke blockchain")
    await onRegisterDocuments(input)
    setPendingRegistration(null)
    setStatus("Dokumen terkonfirmasi")
  }

  async function startUpload() {
    if (selectedRecordId === null) return
    const validation = validateDocumentUploadInputs({
      files,
      labels,
      encryptionKey: encryptionStatus,
    })
    if (!validation.ok) {
      setStatus(getDocumentUploadErrorMessage(validation.code))
      return
    }

    setIsWorking(true)
    setPendingRegistration(null)
    let uploadedRegistration: UploadedDocumentRegistration | null = null
    try {
      setStatus("Mengenkripsi dokumen")
      const uploaded: string[] = []
      for (const file of files) {
        setStatus("Mengunggah dokumen terenkripsi ke IPFS")
        uploaded.push((await onUploadFile(file)).cid)
      }
      uploadedRegistration = {
        recordId: selectedRecordId,
        cids: uploaded,
        labels: labels.map((label) => label.trim()),
      }
      setPendingRegistration(uploadedRegistration)
      await registerDocuments(uploadedRegistration)
    } catch (error) {
      if (uploadedRegistration) {
        setPendingRegistration(uploadedRegistration)
        setStatus("Upload IPFS berhasil. Registrasi gagal.")
      } else {
        setStatus(
          error instanceof Error ? error.message : "Upload dokumen gagal"
        )
      }
    } finally {
      setIsWorking(false)
    }
  }

  async function retryRegistration() {
    if (!pendingRegistration) return
    setIsWorking(true)
    try {
      await registerDocuments(pendingRegistration)
    } catch {
      setStatus("Upload IPFS berhasil. Registrasi gagal.")
    } finally {
      setIsWorking(false)
    }
  }

  return (
    <div className="grid gap-3">
      {!encryptionStatus.configured ? (
        <p className="text-sm text-muted-foreground">
          {encryptionStatus.error}
        </p>
      ) : null}
      <Field data-invalid={!recordId && files.length > 0}>
        <FieldLabel htmlFor="document-record">Rekam medis tujuan</FieldLabel>
        <Select
          value={validRecordId}
          onValueChange={(value) => setRecordId(value ?? "")}
        >
          <SelectTrigger
            id="document-record"
            aria-invalid={!recordId && files.length > 0}
          >
            <SelectValue placeholder="Pilih rekam medis" />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              {records.map((record) => (
                <SelectItem
                  key={record.id.toString()}
                  value={record.id.toString()}
                >
                  #{record.id.toString()} {safeDecode(record.label)}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
      </Field>
      <Field>
        <FieldLabel htmlFor="document-files">File dokumen</FieldLabel>
        <Input
          id="document-files"
          type="file"
          multiple
          accept="application/pdf,image/jpeg,image/png"
          onChange={(event) => {
            const nextFiles = Array.from(event.target.files ?? [])
            setFiles(nextFiles)
            setLabels(
              nextFiles.map((file) => file.name.replace(/\.[^.]+$/, ""))
            )
            setPendingRegistration(null)
            setStatus("")
          }}
        />
      </Field>
      {files.map((file, index) => (
        <Field
          key={`${file.name}-${index}`}
          data-invalid={!labels[index]?.trim()}
        >
          <FieldLabel htmlFor={`document-label-${index}`}>
            Label dokumen {index + 1}
          </FieldLabel>
          <Input
            id={`document-label-${index}`}
            value={labels[index] ?? ""}
            aria-invalid={!labels[index]?.trim()}
            onChange={(event) =>
              setLabels((current) =>
                current.map((label, labelIndex) =>
                  labelIndex === index ? event.target.value : label
                )
              )
            }
          />
        </Field>
      ))}
      {status ? (
        <p
          className="text-sm text-muted-foreground"
          role="status"
          aria-live="polite"
        >
          {status}
        </p>
      ) : null}
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          onClick={() => void startUpload()}
          disabled={disabled}
        >
          Unggah dokumen terenkripsi
        </Button>
        {pendingRegistration ? (
          <Button
            type="button"
            variant="outline"
            onClick={() => void retryRegistration()}
            disabled={isWorking}
          >
            Coba registrasi lagi
          </Button>
        ) : null}
      </div>
    </div>
  )
}

export function AccessTable({
  rows,
  onApprove,
  onRevoke,
  pendingActionKeys = emptyPendingKeys,
  pendingActionMetadata = emptyPendingMetadata,
}: {
  rows: AccessRequestRows
  onApprove: (recordId: bigint, requester: Address) => void
  onRevoke: (recordId: bigint, requester: Address) => void
  pendingActionKeys?: ReadonlySet<string>
  pendingActionMetadata?: ReadonlyMap<string, string>
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
          {rows.map((request) => {
            const isPending = pendingActionKeys.has(
              accessActionKey(request.recordId, request.requester)
            )

            return (
              <TableRow key={`${request.recordId}-${request.requester}`}>
                <TableCell>{safeDecode(request.recordLabel)}</TableCell>
                <TableCell className="font-mono text-xs">
                  {shortAddress(request.requester)}
                </TableCell>
                <TableCell>
                  <Badge
                    variant={request.revoked ? "destructive" : "secondary"}
                  >
                    {request.revoked
                      ? "Dicabut"
                      : request.patientApproved && request.faskesApproved
                        ? "Disetujui"
                        : "Menunggu"}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-2">
                    <AccessActionButtons
                      recordId={request.recordId}
                      requester={request.requester}
                      isPending={isPending}
                      pendingAction={
                        isPending
                          ? (pendingActionMetadata.get(
                              accessActionKey(
                                request.recordId,
                                request.requester
                              )
                            ) as "approve" | "revoke" | undefined)
                          : undefined
                      }
                      onApprove={onApprove}
                      onRevoke={onRevoke}
                    />
                  </div>
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </div>
  )
}
