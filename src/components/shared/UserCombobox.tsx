import { useId, useMemo, useState } from "react"
import { CheckIcon, ChevronsUpDownIcon } from "lucide-react"
import { getAddress, isAddress } from "viem"

import { Button } from "@/components/ui/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { cn } from "@/lib/utils"
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
  const inputId = useId()
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState("")
  const normalizedValue = isAddress(value) ? getAddress(value) : value
  const options = useMemo(
    () =>
      users.map((user) => ({
        account: getAddress(user.account),
        name:
          user.decodedIdentity || user.identity || shortAddress(user.account),
        identity: user.identity,
        bpjsId: user.bpjsId,
      })),
    [users]
  )
  const selectedUser = options.find(
    (user) => user.account.toLowerCase() === normalizedValue.toLowerCase()
  )
  const keyword = search.trim().toLowerCase()
  const filteredOptions = options.filter((user) =>
    [user.account, user.name, user.identity, user.bpjsId]
      .join(" ")
      .toLowerCase()
      .includes(keyword)
  )
  const canUseNewAddress = allowNewAddress && isAddress(search.trim())

  function selectAddress(address: string) {
    onValueChange(getAddress(address))
    setOpen(false)
    setSearch("")
  }

  return (
    <Field>
      <FieldLabel htmlFor={inputId}>{label}</FieldLabel>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger
          render={
            <Button
              id={inputId}
              type="button"
              variant="outline"
              role="combobox"
              aria-expanded={open}
              className="w-full justify-between"
            />
          }
        >
          <span className="truncate">
            {selectedUser?.name ||
              (isAddress(value) ? shortAddress(value) : "") ||
              placeholder}
          </span>
          <ChevronsUpDownIcon data-icon="inline-end" aria-hidden="true" />
        </PopoverTrigger>
        <PopoverContent
          role="dialog"
          aria-label={label}
          className="w-(--anchor-width) p-0"
          align="start"
          onKeyDown={(event) => {
            if (event.key === "Escape") setOpen(false)
          }}
        >
          <Command
            shouldFilter={false}
            onKeyDown={(event) => {
              if (event.key === "Escape") setOpen(false)
            }}
          >
            <CommandInput
              placeholder={placeholder}
              value={search}
              onValueChange={setSearch}
            />
            <CommandList role="listbox">
              <CommandEmpty>Pengguna tidak ditemukan.</CommandEmpty>
              <CommandGroup>
                {filteredOptions.map((user) => (
                  <CommandItem
                    key={user.account}
                    value={[
                      user.account,
                      user.name,
                      user.identity,
                      user.bpjsId,
                    ].join(" ")}
                    onSelect={() => selectAddress(user.account)}
                  >
                    <CheckIcon
                      aria-hidden="true"
                      className={cn(
                        selectedUser?.account === user.account
                          ? "opacity-100"
                          : "opacity-0"
                      )}
                    />
                    <span className="flex flex-col">
                      <span>{user.name}</span>
                      <span className="text-xs text-muted-foreground">
                        {shortAddress(user.account)}
                        {user.bpjsId ? ` - ${user.bpjsId}` : ""}
                      </span>
                    </span>
                  </CommandItem>
                ))}
                {canUseNewAddress ? (
                  <CommandItem
                    value={search.trim()}
                    onSelect={() => selectAddress(search.trim())}
                  >
                    Gunakan alamat baru {shortAddress(search.trim())}
                  </CommandItem>
                ) : null}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      <FieldDescription>
        Pilih pengguna terdaftar atau cari berdasarkan BPJS.
      </FieldDescription>
    </Field>
  )
}
