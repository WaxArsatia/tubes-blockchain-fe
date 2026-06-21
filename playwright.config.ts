import { defineConfig, devices } from "@playwright/test"

export default defineConfig({
  testDir: "./e2e",
  timeout: 60_000,
  use: {
    baseURL: "http://127.0.0.1:3000",
    trace: "retain-on-failure",
  },
  webServer: {
    command: "bun run dev --host 127.0.0.1",
    reuseExistingServer: true,
    url: "http://127.0.0.1:3000",
  },
  projects: [
    {
      name: "chromium",
      testMatch: /app\.spec\.ts/,
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "wallet-local",
      testMatch: /wallet\.spec\.ts/,
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "wallet-real",
      testMatch: /wallet\.spec\.ts/,
      use: { ...devices["Desktop Chrome"] },
    },
  ],
})
