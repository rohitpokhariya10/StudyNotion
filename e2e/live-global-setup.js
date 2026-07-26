import { rm } from "node:fs/promises"

export default async function clearLiveScreenshots() {
  await rm("docs/audits/screenshots/live", { force: true, recursive: true })
}
