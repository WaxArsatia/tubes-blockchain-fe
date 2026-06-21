// @vitest-environment jsdom

import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { AppShell } from "@/app/AppShell"
import { TransactionProvider } from "@/app/TransactionProvider"
import { TransactionStatus } from "@/components/shared/TransactionStatus"
import { env } from "@/config/env"

const account = `0x${"1".repeat(40)}`
const hash = `0x${"2".repeat(64)}`

describe("AppShell", () => {
  it("shows role, network, encryption configuration, and latest transaction", () => {
    render(
      <TransactionProvider>
        <AppShell
          account={account}
          chainId="0x539"
          roles={["faskes", "pasien"]}
          selectedRole="faskes"
          onRoleChange={() => undefined}
        >
          Konten
        </AppShell>
      </TransactionProvider>
    )

    expect(screen.getByText("Peran aktif: Faskes")).toBeTruthy()
    expect(screen.getByText(`Jaringan: ${env.VITE_CHAIN_NAME}`)).toBeTruthy()
    expect(
      screen.getByText("Enkripsi dokumen: Belum dikonfigurasi")
    ).toBeTruthy()
    expect(screen.getByText("Transaksi terbaru")).toBeTruthy()
    expect(screen.getByText("Siap")).toBeTruthy()
  })
})

describe("TransactionStatus", () => {
  it("renders an accessible explorer link and shadcn icon markers", () => {
    const { container } = render(
      <TransactionStatus
        status="submitted"
        action="Menyimpan rekam medis"
        hash={hash}
      />
    )

    const link = screen.getByRole("link", { name: "Lihat di Blockscout" })
    expect(link.getAttribute("href")).toBe(
      `${env.VITE_BLOCKSCOUT_URL}/tx/${hash}`
    )
    expect(screen.getByText("Menyimpan rekam medis")).toBeTruthy()
    expect(container.querySelectorAll("[data-icon]").length).toBeGreaterThan(0)
  })
})
