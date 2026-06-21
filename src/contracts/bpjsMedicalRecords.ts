import "viem/window"
import {
  createPublicClient,
  createWalletClient,
  custom,
  getAddress,
  http,
} from "viem"
import type { Address } from "viem"

import { bpjsChain } from "@/config/chain"
import { contractAddress } from "@/config/env"

import { bpjsMedicalRecordsAbi } from "./bpjsMedicalRecords.abi"

export type MedicalFieldInput = {
  label: string
  value: string
}

export const publicClient = createPublicClient({
  chain: bpjsChain,
  transport: http(),
})

export function getWalletClient() {
  if (!window.ethereum) throw new Error("MetaMask tidak ditemukan")
  return createWalletClient({
    chain: bpjsChain,
    transport: custom(window.ethereum),
  })
}

export async function getConnectedAccount() {
  const [account] = await getWalletClient().getAddresses()
  return account
}

export async function waitForTransaction(hash: `0x${string}`) {
  return publicClient.waitForTransactionReceipt({ hash })
}

export function asAddress(value: string) {
  return getAddress(value)
}

export const bpjsReads = {
  listUsers: () =>
    publicClient.readContract({
      address: contractAddress,
      abi: bpjsMedicalRecordsAbi,
      functionName: "listUsers",
    }),
  listAccessRequests: () =>
    publicClient.readContract({
      address: contractAddress,
      abi: bpjsMedicalRecordsAbi,
      functionName: "listAccessRequests",
    }),
  listRecordAccessRequests: (recordId: bigint) =>
    publicClient.readContract({
      address: contractAddress,
      abi: bpjsMedicalRecordsAbi,
      functionName: "listRecordAccessRequests",
      args: [recordId],
    }),
  listMedicalRecords: (patient: Address) =>
    publicClient.readContract({
      address: contractAddress,
      abi: bpjsMedicalRecordsAbi,
      functionName: "listMedicalRecords",
      args: [patient],
    }),
  getMedicalRecord: (recordId: bigint, account: Address) =>
    publicClient.readContract({
      account,
      address: contractAddress,
      abi: bpjsMedicalRecordsAbi,
      functionName: "getMedicalRecord",
      args: [recordId],
    }),
  verifyInsurance: (patient: Address) =>
    publicClient.readContract({
      address: contractAddress,
      abi: bpjsMedicalRecordsAbi,
      functionName: "verifyInsurance",
      args: [patient],
    }),
}

export type AccessRequestRows = Awaited<
  ReturnType<typeof bpjsReads.listAccessRequests>
>

export const bpjsWrites = {
  registerUser: async (identity: string) =>
    getWalletClient().writeContract({
      account: await getConnectedAccount(),
      address: contractAddress,
      abi: bpjsMedicalRecordsAbi,
      functionName: "registerUser",
      args: [identity],
    }),
  setRole: async (
    role: "admin" | "faskes" | "pasien" | "auditor",
    account: Address,
    active: boolean
  ) => {
    const functionName = {
      admin: "setAdmin",
      faskes: "setFaskes",
      pasien: "setPasien",
      auditor: "setAuditor",
    } as const satisfies Record<
      typeof role,
      "setAdmin" | "setFaskes" | "setPasien" | "setAuditor"
    >

    return getWalletClient().writeContract({
      account: await getConnectedAccount(),
      address: contractAddress,
      abi: bpjsMedicalRecordsAbi,
      functionName: functionName[role],
      args: [account, active],
    })
  },
  registerBPJS: async (account: Address, bpjsId: string) =>
    getWalletClient().writeContract({
      account: await getConnectedAccount(),
      address: contractAddress,
      abi: bpjsMedicalRecordsAbi,
      functionName: "registerBPJS",
      args: [account, bpjsId],
    }),
  submitMedicalRecord: async (
    patient: Address,
    faskes: Address,
    label: string,
    fieldLabels: string[],
    fieldValues: string[]
  ) =>
    getWalletClient().writeContract({
      account: await getConnectedAccount(),
      address: contractAddress,
      abi: bpjsMedicalRecordsAbi,
      functionName: "submitMedicalRecord",
      args: [patient, faskes, label, fieldLabels, fieldValues],
    }),
  addDocuments: async (recordId: bigint, cids: string[], labels: string[]) =>
    getWalletClient().writeContract({
      account: await getConnectedAccount(),
      address: contractAddress,
      abi: bpjsMedicalRecordsAbi,
      functionName: "addDocuments",
      args: [recordId, cids, labels],
    }),
  requestRecordAccess: async (recordId: bigint) =>
    getWalletClient().writeContract({
      account: await getConnectedAccount(),
      address: contractAddress,
      abi: bpjsMedicalRecordsAbi,
      functionName: "requestRecordAccess",
      args: [recordId],
    }),
  approveRecordAccess: async (recordId: bigint, requester: Address) =>
    getWalletClient().writeContract({
      account: await getConnectedAccount(),
      address: contractAddress,
      abi: bpjsMedicalRecordsAbi,
      functionName: "approveRecordAccess",
      args: [recordId, requester],
    }),
  revokeRecordAccess: async (recordId: bigint, requester: Address) =>
    getWalletClient().writeContract({
      account: await getConnectedAccount(),
      address: contractAddress,
      abi: bpjsMedicalRecordsAbi,
      functionName: "revokeRecordAccess",
      args: [recordId, requester],
    }),
}
