import { isAddress } from "viem"

import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { shortAddress } from "@/lib/users"

type UserComboboxProps = {
  users: Array<{
    account: string
    decodedIdentity?: string
    identity: string
    bpjsId: string
  }>
  value: string
  onValueChange: (address: string) => void
  allowNewAddress?: boolean
  placeholder?: string
  label?: string
}

export function UserCombobox({
  users,
  value,
  onValueChange,
  allowNewAddress = false,
  placeholder = "Cari wallet atau identitas",
  label = "Wallet",
}: UserComboboxProps) {
  const inputId = `user-combobox-${label.toLowerCase().replace(/\s+/g, "-")}`
  const options = users.map((user) => ({
    account: user.account,
    name: user.decodedIdentity || user.identity || shortAddress(user.account),
    bpjsId: user.bpjsId,
  }))

  return (
    <div className="grid gap-2">
      <Label htmlFor={inputId}>{label}</Label>
      <Input
        id={inputId}
        list="bpjs-user-options"
        placeholder={placeholder}
        value={value}
        onChange={(event) => onValueChange(event.target.value)}
      />
      <datalist id="bpjs-user-options">
        {options.map((user) => (
          <option key={user.account} value={user.account}>
            {user.name} {user.bpjsId ? `- ${user.bpjsId}` : ""}
          </option>
        ))}
        {allowNewAddress && isAddress(value) ? (
          <option value={value}>Gunakan alamat baru</option>
        ) : null}
      </datalist>
    </div>
  )
}
