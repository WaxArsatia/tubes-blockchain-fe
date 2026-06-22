// @vitest-environment jsdom

import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vitest"

import { AppShell } from "@/app/AppShell"
import { TransactionProvider } from "@/app/TransactionProvider"
import { TransactionStatus } from "@/components/shared/TransactionStatus"
import { env } from "@/config/env"

const account = `0x${"1".repeat(40)}`
const hash = `0x${"2".repeat(64)}`
const originalKey = env.VITE_DOCUMENT_ENCRYPTION_KEY
const placeholderKey = ["change", "this", "demo", "key"].join("-")

function renderShell() {
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
}

describe("AppShell", () => {
  afterEach(() => {
    env.VITE_DOCUMENT_ENCRYPTION_KEY = originalKey
    cleanup()
  })

  it("shows role, network, encryption configuration, and latest transaction", () => {
    renderShell()

    expect(screen.getByText("Peran aktif: Faskes")).toBeTruthy()
    expect(screen.getByText(`Jaringan: ${env.VITE_CHAIN_NAME}`)).toBeTruthy()
    expect(screen.getByText(/Enkripsi dokumen:/)).toBeTruthy()
    expect(screen.getByText("Transaksi terbaru")).toBeTruthy()
    expect(screen.getByText("Siap")).toBeTruthy()
  })

  it("shows configured only when the shared document key is valid", () => {
    env.VITE_DOCUMENT_ENCRYPTION_KEY = placeholderKey
    renderShell()

    expect(screen.getByText("Enkripsi dokumen: Kunci placeholder")).toBeTruthy()
  })

  it("shows configured for a valid shared document key", () => {
    env.VITE_DOCUMENT_ENCRYPTION_KEY = "shared-demo-document-key-32-chars"
    renderShell()

    expect(screen.getByText("Enkripsi dokumen: Terkonfigurasi")).toBeTruthy()
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
