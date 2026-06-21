import { expect, test } from "@playwright/test"

test("loads BPJS app shell", async ({ page }) => {
  await page.goto("/")
  await expect(page.getByText("BPJS Rekam Medis").first()).toBeVisible()
})

test("shows wallet connection or dashboard state", async ({ page }) => {
  await page.goto("/")
  await expect(
    page
      .getByRole("button", { name: /hubungkan wallet|tambah\/switch/i })
      .or(page.getByText(/dashboard|rekam medis|admin/i))
  ).toBeVisible()
})
