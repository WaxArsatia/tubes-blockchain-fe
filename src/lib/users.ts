import { decodeBase64Text } from "./encoding"

export type Role = "admin" | "faskes" | "pasien" | "auditor"

export type RoleFlags = {
  isAdmin: boolean
  isFaskes: boolean
  isPasien: boolean
  isAuditor: boolean
}

export type UserAccount = RoleFlags & {
  account: `0x${string}`
  identity: string
  bpjsId: string
}

export type NormalizedUser = UserAccount & {
  decodedIdentity: string
  roles: Role[]
}

export function getActiveRoles(flags: RoleFlags): Role[] {
  return [
    flags.isAdmin ? "admin" : null,
    flags.isFaskes ? "faskes" : null,
    flags.isPasien ? "pasien" : null,
    flags.isAuditor ? "auditor" : null,
  ].filter(Boolean) as Role[]
}

export function normalizeUser(user: UserAccount): NormalizedUser {
  return {
    ...user,
    decodedIdentity: safeDecode(user.identity),
    roles: getActiveRoles(user),
  }
}

export function safeDecode(value: string) {
  try {
    return decodeBase64Text(value)
  } catch {
    return value
  }
}

export function shortAddress(address: string) {
  return `${address.slice(0, 6)}...${address.slice(-4)}`
}

export function roleLabel(role: Role) {
  return {
    admin: "Admin",
    faskes: "Faskes",
    pasien: "Pasien",
    auditor: "Auditor",
  }[role]
}
