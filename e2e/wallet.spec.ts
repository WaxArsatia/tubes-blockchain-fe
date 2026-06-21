import { expect, test } from "@playwright/test"
import type { Page } from "@playwright/test"

test.beforeEach(async ({ context }) => {
  const providerUrl = process.env.E2E_PROVIDER_URL
  const account = process.env.E2E_DEPLOYER_ADDRESS
  const chainId = process.env.VITE_CHAIN_ID_HEX
  if (!providerUrl) throw new Error("E2E_PROVIDER_URL is required")
  if (!account) throw new Error("E2E_DEPLOYER_ADDRESS is required")
  if (!chainId) throw new Error("VITE_CHAIN_ID_HEX is required")

  await context.addInitScript(
    ({
      url,
      injectedAccount,
      injectedChainId,
    }: {
      url: string
      injectedAccount: string
      injectedChainId: string
    }) => {
      const listeners = new Map<string, Set<(...args: unknown[]) => void>>()

      window.ethereum = {
        request: async ({ method, params }) => {
          if (method === "eth_requestAccounts" || method === "eth_accounts") {
            return [injectedAccount]
          }
          if (method === "eth_chainId") {
            return injectedChainId
          }
          if (
            method === "wallet_switchEthereumChain" ||
            method === "wallet_addEthereumChain"
          ) {
            return null
          }

          const response = await fetch(url, {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ method, params }),
          })
          const payload = await response.json()
          if (!response.ok || payload.error) {
            throw new Error(
              payload.error ?? `Provider request failed: ${method}`
            )
          }
          return payload.result
        },
        on: (event: string, listener: (...args: unknown[]) => void) => {
          const eventListeners = listeners.get(event) ?? new Set()
          eventListeners.add(listener)
          listeners.set(event, eventListeners)
        },
        removeListener: (
          event: string,
          listener: (...args: unknown[]) => void
        ) => {
          listeners.get(event)?.delete(listener)
        },
      }
    },
    {
      url: providerUrl,
      injectedAccount: account,
      injectedChainId: chainId,
    }
  )
})

async function connectWallet(page: Page) {
  await page.goto("/")
  const workspace = page.getByText("Workspace aktif:")
  const connectButton = page.getByRole("button", { name: "Hubungkan wallet" })

  await expect(workspace.or(connectButton)).toBeVisible({ timeout: 30_000 })
  if (await connectButton.isVisible().catch(() => false)) {
    await connectButton.click()
  }
  await expect(
    page
      .getByText("Workspace aktif:")
      .or(page.getByRole("button", { name: "Tambah/Switch Jaringan" }))
  ).toBeVisible({ timeout: 15_000 })

  const switchButton = page.getByRole("button", {
    name: "Tambah/Switch Jaringan",
  })
  if (await switchButton.isVisible({ timeout: 15_000 }).catch(() => false)) {
    await switchButton.click()
  }
}

test("runs BPJS role workflows with real wallet transactions", async ({
  page,
}) => {
  page.on("console", (message) => {
    if (message.type() === "error") {
      console.error(`[browser:${message.type()}] ${message.text()}`)
    }
  })
  page.on("pageerror", (error) => console.error(`[pageerror] ${error.message}`))
  page.on("requestfailed", (request) =>
    console.error(
      `[requestfailed] ${request.method()} ${request.url()} ${request.failure()?.errorText ?? ""}`
    )
  )

  await connectWallet(page)

  await expect(page.getByText("Workspace aktif:")).toBeVisible({
    timeout: 30_000,
  })
  await expect(page.getByRole("button", { name: "Admin" })).toBeVisible()

  await page.getByRole("button", { name: "Faskes" }).click()
  await page.getByLabel("Pasien").fill(process.env.E2E_DEPLOYER_ADDRESS ?? "")
  await page.getByLabel("Label rekam medis").fill("Kunjungan E2E browser")
  await page.getByLabel("Tanggal kunjungan").fill("2026-06-22")
  await page.getByLabel("Dokter atau petugas").fill("dr. E2E")
  await page.getByLabel("Fasilitas").fill("Klinik E2E")
  await page.getByLabel("Diagnosis").fill("Observasi E2E")
  await page.getByLabel("Tindakan").fill("Pemeriksaan")
  await page.getByLabel("Obat").fill("Vitamin")
  await page
    .getByLabel("Catatan")
    .fill("Transaksi dibuat dari Playwright injected wallet")

  const submitRecord = page.getByRole("button", {
    name: "Simpan rekam medis",
  })
  await submitRecord.click()
  await expect(
    page.getByRole("button", { name: "Menyimpan rekam medis" })
  ).toBeDisabled()
  await expect(
    page.getByText("Menyimpan rekam medis", { exact: true })
  ).toBeVisible()
  await expect(
    page.getByRole("link", { name: "Lihat di Blockscout" })
  ).toBeVisible({ timeout: 30_000 })
  await expect(page.getByText("Transaksi berhasil dikonfirmasi.")).toBeVisible({
    timeout: 45_000,
  })
  await expect(page.getByText("Rekam medis tersimpan")).toBeVisible({
    timeout: 45_000,
  })

  await page.getByRole("button", { name: "Pasien" }).click()
  await expect(
    page.getByRole("button", { name: /#\d+ Kunjungan E2E browser/ })
  ).toBeVisible({
    timeout: 30_000,
  })
})
