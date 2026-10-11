import { defineConfig, devices } from "@playwright/test"

// Real end-to-end NEET suite: NO request interception. Run it through
// `npm run test:neet:e2e:real`, which starts a disposable stack (replica-set
// Mongo, seeded mocks and students, the real API and a real web build) and
// passes its addresses in the environment.
export default defineConfig({
  testDir: "./e2e",
  testMatch: "neet-real.spec.js",
  outputDir: "test-results/neet-real",
  reporter: "list",
  workers: 1,
  timeout: 120_000,
  use: {
    baseURL: process.env.NEET_REAL_WEB_BASE,
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
    reducedMotion: "reduce",
  },
  projects: [
    {
      name: "neet-real-chromium",
      use: {
        ...devices["Desktop Chrome"],
        ...(process.env.CI ? {} : { channel: "chrome" }),
        // Synthetic camera/microphone for the monitored-mode flow; real
        // hardware and permission prompts still need manual verification.
        launchOptions: {
          args: [
            "--use-fake-ui-for-media-stream",
            "--use-fake-device-for-media-stream",
          ],
        },
      },
    },
  ],
})
