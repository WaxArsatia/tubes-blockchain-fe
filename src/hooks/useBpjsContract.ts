import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import type { Address } from "viem"

import { useTransactionRunner } from "@/app/TransactionProvider"
import { bpjsReads, bpjsWrites } from "@/contracts/bpjsMedicalRecords"
import { encodeBase64Text } from "@/lib/encoding"
import { toUserFacingError } from "@/lib/errors"
import { normalizeUser } from "@/lib/users"

export const bpjsKeys = {
  users: ["bpjs", "users"] as const,
  accessRequests: ["bpjs", "accessRequests"] as const,
  recordAccessRequests: (recordId: bigint) =>
    ["bpjs", "record-access-requests", recordId.toString()] as const,
  records: (patient: string) => ["bpjs", "records", patient] as const,
  record: (recordId: bigint, account: string) =>
    ["bpjs", "record", recordId.toString(), account] as const,
}

export function useUsers() {
  return useQuery({
    queryKey: bpjsKeys.users,
    queryFn: async () => (await bpjsReads.listUsers()).map(normalizeUser),
  })
}

export function useAccessRequests() {
  return useQuery({
    queryKey: bpjsKeys.accessRequests,
    queryFn: bpjsReads.listAccessRequests,
  })
}

export function usePatientRecords(patient?: Address | null) {
  return useQuery({
    queryKey: bpjsKeys.records(patient ?? ""),
    queryFn: () => bpjsReads.listMedicalRecords(patient as Address),
    enabled: Boolean(patient),
  })
}

export function useMedicalRecord(
  recordId: bigint | null,
  account?: Address | null
) {
  return useQuery({
    queryKey: bpjsKeys.record(recordId ?? 0n, account ?? ""),
    queryFn: () =>
      bpjsReads.getMedicalRecord(recordId as bigint, account as Address),
    enabled: Boolean(recordId && account),
  })
}

export function useRegisterUser() {
  const queryClient = useQueryClient()
  const runTransaction = useTransactionRunner()
  return useMutation({
    mutationFn: (identity: string) =>
      runTransaction("Menyimpan identitas", () =>
        bpjsWrites.registerUser(encodeBase64Text(identity))
      ),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: bpjsKeys.users })
      toast.success("Identitas tersimpan")
    },
    onError: (error) => toast.error(toUserFacingError(error)),
  })
}

export function useSetRole() {
  const queryClient = useQueryClient()
  const runTransaction = useTransactionRunner()
  return useMutation({
    mutationFn: (input: {
      role: "admin" | "faskes" | "pasien" | "auditor"
      account: Address
      active: boolean
    }) =>
      runTransaction("Memperbarui role", () =>
        bpjsWrites.setRole(input.role, input.account, input.active)
      ),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: bpjsKeys.users })
      toast.success("Role diperbarui")
    },
    onError: (error) => toast.error(toUserFacingError(error)),
  })
}

export function useRegisterBpjs() {
  const queryClient = useQueryClient()
  const runTransaction = useTransactionRunner()
  return useMutation({
    mutationFn: (input: { account: Address; bpjsId: string }) =>
      runTransaction("Menyimpan nomor BPJS", () =>
        bpjsWrites.registerBPJS(input.account, input.bpjsId)
      ),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: bpjsKeys.users })
      toast.success("Nomor BPJS tersimpan")
    },
    onError: (error) => toast.error(toUserFacingError(error)),
  })
}

export function useSubmitMedicalRecord() {
  const queryClient = useQueryClient()
  const runTransaction = useTransactionRunner()
  return useMutation({
    mutationFn: async (input: {
      patient: Address
      faskes: Address
      label: string
      fields: Array<{ label: string; value: string }>
    }) => {
      const [active] = await bpjsReads.verifyInsurance(input.patient)
      if (!active) throw new Error("InactivePatient")
      return runTransaction("Menyimpan rekam medis", () =>
        bpjsWrites.submitMedicalRecord(
          input.patient,
          input.faskes,
          encodeBase64Text(input.label),
          input.fields.map((field) => encodeBase64Text(field.label)),
          input.fields.map((field) => encodeBase64Text(field.value))
        )
      )
    },
    onSuccess: (_hash, input) => {
      void queryClient.invalidateQueries({
        queryKey: bpjsKeys.records(input.patient),
      })
      toast.success("Rekam medis tersimpan")
    },
    onError: (error) => toast.error(toUserFacingError(error)),
  })
}

export function useAddDocuments() {
  const queryClient = useQueryClient()
  const runTransaction = useTransactionRunner()
  return useMutation({
    mutationFn: (input: {
      recordId: bigint
      cids: string[]
      labels: string[]
    }) =>
      runTransaction("Menambahkan dokumen", () =>
        bpjsWrites.addDocuments(
          input.recordId,
          input.cids,
          input.labels.map(encodeBase64Text)
        )
      ),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["bpjs"] })
      toast.success("Dokumen ditambahkan")
    },
    onError: (error) => toast.error(toUserFacingError(error)),
  })
}

export function useApproveAccess() {
  const queryClient = useQueryClient()
  const runTransaction = useTransactionRunner()
  return useMutation({
    mutationFn: (input: { recordId: bigint; requester: Address }) =>
      runTransaction("Menyetujui akses", () =>
        bpjsWrites.approveRecordAccess(input.recordId, input.requester)
      ),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: bpjsKeys.accessRequests })
      toast.success("Akses disetujui")
    },
    onError: (error) => toast.error(toUserFacingError(error)),
  })
}

export function useRevokeAccess() {
  const queryClient = useQueryClient()
  const runTransaction = useTransactionRunner()
  return useMutation({
    mutationFn: (input: { recordId: bigint; requester: Address }) =>
      runTransaction("Mencabut akses", () =>
        bpjsWrites.revokeRecordAccess(input.recordId, input.requester)
      ),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: bpjsKeys.accessRequests })
      toast.success("Akses dicabut")
    },
    onError: (error) => toast.error(toUserFacingError(error)),
  })
}

export function useRequestRecordAccess() {
  const queryClient = useQueryClient()
  const runTransaction = useTransactionRunner()
  return useMutation({
    mutationFn: (recordId: bigint) =>
      runTransaction("Meminta akses rekam medis", () =>
        bpjsWrites.requestRecordAccess(recordId)
      ),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: bpjsKeys.accessRequests })
      toast.success("Permintaan akses dikirim")
    },
    onError: (error) => toast.error(toUserFacingError(error)),
  })
}
