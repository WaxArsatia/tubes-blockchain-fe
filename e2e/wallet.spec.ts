import { expect, test } from "@playwright/test"
import type { Page } from "@playwright/test"
import { readFile } from "node:fs/promises"
import path from "node:path"
import { fileURLToPath } from "node:url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const fixtureDocumentPath = path.join(
  __dirname,
  "fixtures",
  "synthetic-document.pdf"
)

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

async function transactionWriteCount() {
  const providerUrl = process.env.E2E_PROVIDER_URL
  if (!providerUrl) throw new Error("E2E_PROVIDER_URL is required")

  const response = await fetch(`${providerUrl}/metrics`)
  if (!response.ok) throw new Error("Wallet metrics are unavailable")
  const metrics = (await response.json()) as { transactionWriteCount: number }
  return metrics.transactionWriteCount
}

async function chooseUser(page: Page, label: string, query: string) {
  await page.getByRole("combobox", { name: label, exact: true }).click()
  const dialog = page.getByRole("dialog", { name: label })
  await dialog.getByPlaceholder("Cari wallet atau identitas").fill(query)
  const option = dialog.getByRole("option").first()
  await expect(option).toBeVisible()
  await option.click()
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
  await chooseUser(page, "Pasien", process.env.E2E_DEPLOYER_ADDRESS ?? "")
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
  const writesBeforeSubmit = await transactionWriteCount()
  await submitRecord.click()
  const pendingSubmit = page.getByRole("button", {
    name: "Menyimpan rekam medis",
  })
  await expect(pendingSubmit).toBeDisabled()
  await pendingSubmit.click({ force: true })

  const submittedMessage = page.getByText(
    "Transaksi dikirim. Menunggu konfirmasi jaringan."
  )
  await expect(submittedMessage).toBeVisible({ timeout: 30_000 })
  await expect(page.getByText("Transaksi berhasil dikonfirmasi.")).toHaveCount(
    0
  )
  await expect(
    page.getByRole("link", { name: "Lihat di Blockscout" })
  ).toBeVisible()
  expect(await transactionWriteCount()).toBe(writesBeforeSubmit + 1)

  await expect(page.getByText("Transaksi berhasil dikonfirmasi.")).toBeVisible({
    timeout: 45_000,
  })
  expect(await transactionWriteCount()).toBe(writesBeforeSubmit + 1)
  await expect(page.getByText("Rekam medis tersimpan")).toBeVisible({
    timeout: 45_000,
  })

  await chooseUser(
    page,
    "Pasien untuk dokumen",
    process.env.E2E_DEPLOYER_ADDRESS ?? ""
  )
  await page.getByRole("combobox", { name: "Rekam medis tujuan" }).click()
  await page
    .getByRole("option", { name: /Kunjungan E2E browser/ })
    .click({ timeout: 30_000 })
  await page.getByLabel("File dokumen").setInputFiles(fixtureDocumentPath)
  await page.getByLabel("Label dokumen 1").fill("Fixture dokumen E2E.pdf")

  const writesBeforeDocuments = await transactionWriteCount()
  await page.getByRole("button", { name: "Unggah dokumen terenkripsi" }).click()
  await expect(page.getByText("Dokumen terkonfirmasi")).toBeVisible({
    timeout: 45_000,
  })
  expect(await transactionWriteCount()).toBe(writesBeforeDocuments + 1)
  await expect(page.getByText("Dokumen ditambahkan")).toBeVisible({
    timeout: 45_000,
  })

  await page.getByRole("button", { name: "Pasien" }).click()
  const patientRecord = page.getByRole("button", {
    name: /#\d+ Kunjungan E2E browser/,
  })
  await expect(patientRecord).toBeVisible({
    timeout: 30_000,
  })
  await patientRecord.click()
  await expect(page.getByText("Fixture dokumen E2E.pdf")).toBeVisible({
    timeout: 30_000,
  })
  const downloadPromise = page.waitForEvent("download")
  await page
    .getByRole("button", { name: "Unduh Fixture dokumen E2E.pdf" })
    .click()
  const download = await downloadPromise
  expect(download.suggestedFilename()).toBe("Fixture-dokumen-E2E.pdf")
  const downloadedPath = await download.path()
  expect(await readFile(downloadedPath)).toEqual(
    await readFile(fixtureDocumentPath)
  )
})
