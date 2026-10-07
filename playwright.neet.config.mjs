import { defineConfig, devices } from "@playwright/test"

export default defineConfig({
  testDir: "./e2e",
  testMatch: "project-neet.spec.js",
  fullyParallel: true,
  outputDir: "test-results/project-neet",
  reporter: "list",
  workers: 3,
  use: {
    baseURL: "http://127.0.0.1:4185",
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
    reducedMotion: "reduce",
  },
  webServer: {
    command:
      "npm run build:local && npm run preview --workspace studynotion-web -- --host 127.0.0.1 --port 4185",
    env: { ...process.env, VITE_API_BASE_URL: "/api/v1" },
    url: "http://127.0.0.1:4185",
    reuseExistingServer: false,
    timeout: 120000,
  },
  projects: [
    {
      name: "neet-chromium",
      use: {
        ...devices["Desktop Chrome"],
        ...(process.env.CI ? {} : { channel: "chrome" }),
      },
    },
    {
      name: "neet-mobile",
      use: {
        ...devices["Pixel 7"],
        ...(process.env.CI ? {} : { channel: "chrome" }),
      },
    },
    { name: "neet-webkit", use: { ...devices["Desktop Safari"] } },
  ],
})
