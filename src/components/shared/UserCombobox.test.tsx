// @vitest-environment jsdom

import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from "@testing-library/react"
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest"
import { getAddress } from "viem"

import { UserCombobox } from "@/components/shared/UserCombobox"

const accountA = `0x${"a".repeat(40)}` as const
const accountB = `0x${"b".repeat(40)}` as const

const users = [
  {
    account: accountA,
    decodedIdentity: "Klinik Melati",
    identity: "0x4b6c696e696b204d656c617469",
    bpjsId: "BPJS-001",
  },
  {
    account: accountB,
    decodedIdentity: "",
    identity: "RS Kenanga",
    bpjsId: "BPJS-002",
  },
]

beforeAll(() => {
  class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  }

  vi.stubGlobal("ResizeObserver", ResizeObserver)
  Element.prototype.scrollIntoView = vi.fn()
})

afterEach(cleanup)

describe("UserCombobox", () => {
  it("searches by decoded identity, identity fallback, BPJS ID, and address", () => {
    render(<UserCombobox users={users} value="" onValueChange={vi.fn()} />)

    const combobox = screen.getByRole("combobox", { name: "Wallet" })
    fireEvent.click(combobox)
    fireEvent.change(
      screen.getByPlaceholderText("Cari wallet atau identitas"),
      {
        target: { value: "melati" },
      }
    )
    expect(screen.getByRole("option", { name: /Klinik Melati/ })).toBeTruthy()

    fireEvent.change(
      screen.getByPlaceholderText("Cari wallet atau identitas"),
      {
        target: { value: "kenanga" },
      }
    )
    expect(screen.getByRole("option", { name: /RS Kenanga/ })).toBeTruthy()

    fireEvent.change(
      screen.getByPlaceholderText("Cari wallet atau identitas"),
      {
        target: { value: "BPJS-001" },
      }
    )
    expect(screen.getByRole("option", { name: /BPJS-001/ })).toBeTruthy()

    fireEvent.change(
      screen.getByPlaceholderText("Cari wallet atau identitas"),
      {
        target: { value: accountB.slice(0, 10) },
      }
    )
    expect(screen.getByRole("option", { name: /RS Kenanga/ })).toBeTruthy()
  })

  it("selects a searched user with the keyboard and returns a normalized address", () => {
    const onValueChange = vi.fn()
    render(
      <UserCombobox users={users} value="" onValueChange={onValueChange} />
    )

    const combobox = screen.getByRole("combobox", { name: "Wallet" })
    fireEvent.click(combobox)
    fireEvent.change(
      screen.getByPlaceholderText("Cari wallet atau identitas"),
      {
        target: { value: "melati" },
      }
    )
    fireEvent.keyDown(
      screen.getByPlaceholderText("Cari wallet atau identitas"),
      { key: "Enter" }
    )

    expect(onValueChange).toHaveBeenCalledTimes(1)
    expect(onValueChange).toHaveBeenCalledWith(getAddress(accountA))
  })

  it("selects the highlighted second user exactly once with the keyboard", () => {
    const onValueChange = vi.fn()
    render(
      <UserCombobox users={users} value="" onValueChange={onValueChange} />
    )

    fireEvent.click(screen.getByRole("combobox", { name: "Wallet" }))
    const search = screen.getByPlaceholderText("Cari wallet atau identitas")
    fireEvent.keyDown(search, { key: "ArrowDown" })
    fireEvent.keyDown(search, { key: "Enter" })

    expect(onValueChange).toHaveBeenCalledTimes(1)
    expect(onValueChange).toHaveBeenCalledWith(getAddress(accountB))
  })

  it("shows an empty state and only offers a new address for valid typed addresses", () => {
    const onValueChange = vi.fn()
    render(
      <UserCombobox
        allowNewAddress
        users={users}
        value=""
        onValueChange={onValueChange}
      />
    )

    fireEvent.click(screen.getByRole("combobox", { name: "Wallet" }))
    const search = screen.getByPlaceholderText("Cari wallet atau identitas")
    fireEvent.change(search, { target: { value: "tidak ada" } })

    expect(screen.getByText("Pengguna tidak ditemukan.")).toBeTruthy()
    expect(
      screen.queryByRole("option", { name: /Gunakan alamat baru/ })
    ).toBeNull()

    fireEvent.change(search, { target: { value: accountB.toLowerCase() } })
    const list = screen.getByRole("listbox")
    expect(
      within(list).getByRole("option", { name: /Gunakan alamat baru/ })
    ).toBeTruthy()
  })

  it("selects a valid new address with the keyboard", () => {
    const onValueChange = vi.fn()
    render(
      <UserCombobox
        allowNewAddress
        users={[]}
        value=""
        onValueChange={onValueChange}
      />
    )

    fireEvent.click(screen.getByRole("combobox", { name: "Wallet" }))
    const search = screen.getByPlaceholderText("Cari wallet atau identitas")
    fireEvent.change(search, { target: { value: accountB.toLowerCase() } })
    fireEvent.keyDown(search, { key: "Enter" })

    expect(onValueChange).toHaveBeenCalledTimes(1)
    expect(onValueChange).toHaveBeenCalledWith(getAddress(accountB))
  })
})
