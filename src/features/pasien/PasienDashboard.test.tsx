// @vitest-environment jsdom

import { act, cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { PatientDocumentDownloadButton } from "@/features/pasien/PasienDashboard"

const validKey = "shared-demo-document-key-32-chars"

describe("PatientDocumentDownloadButton", () => {
  beforeEach(() => {
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(
      () => undefined
    )
    vi.stubGlobal(
      "URL",
      Object.assign(URL, {
        createObjectURL: vi.fn(() => "blob:document"),
        revokeObjectURL: vi.fn(),
      })
    )
  })

  afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  it("downloads decrypted bytes through a temporary object URL and revokes it", async () => {
    const download = vi
      .fn()
      .mockResolvedValue(new Blob([new Uint8Array([104, 97, 115, 105, 108])]))

    render(
      <PatientDocumentDownloadButton
        cid="bafybeigdyrztfabcdefabcdefabcdefabcdefabcdefabcdef"
        label="Hasil lab / Juni.pdf"
        encryptionStatus={{ configured: true, key: validKey }}
        onDownload={download}
      />
    )

    await act(async () => {
      fireEvent.click(
        screen.getByRole("button", { name: "Unduh Hasil lab / Juni.pdf" })
      )
    })

    expect(download).toHaveBeenCalledWith(
      "bafybeigdyrztfabcdefabcdefabcdefabcdefabcdefabcdef"
    )
    expect(URL.createObjectURL).toHaveBeenCalledOnce()
    expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:document")
  })

  it("fails closed when the shared key is missing", () => {
    const download = vi.fn()

    render(
      <PatientDocumentDownloadButton
        cid="bafybeigdyrztfabcdefabcdefabcdefabcdefabcdefabcdef"
        label="Hasil lab"
        encryptionStatus={{
          configured: false,
          reason: "missing",
          error: "Kunci enkripsi dokumen belum dikonfigurasi",
        }}
        onDownload={download}
      />
    )

    expect(
      screen.getByText("Kunci enkripsi dokumen belum dikonfigurasi")
    ).toBeTruthy()
    expect(screen.getByRole("status").textContent).toBe(
      "Kunci enkripsi dokumen belum dikonfigurasi"
    )
    expect(
      screen.getByRole("button", { name: "Unduh Hasil lab" })
    ).toHaveProperty("disabled", true)
    expect(download).not.toHaveBeenCalled()
  })

  it("shows gateway and decrypt failures without navigating to the raw CID", async () => {
    const download = vi
      .fn()
      .mockRejectedValue(new Error("Unduh dokumen IPFS gagal"))

    render(
      <PatientDocumentDownloadButton
        cid="bafybeigdyrztfabcdefabcdefabcdefabcdefabcdefabcdef"
        label="Hasil lab"
        encryptionStatus={{ configured: true, key: validKey }}
        onDownload={download}
      />
    )

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Unduh Hasil lab" }))
    })

    expect(screen.getByRole("status").textContent).toBe(
      "Unduh dokumen IPFS gagal"
    )
    expect(screen.queryByRole("link")).toBeNull()
  })
})
