import { fileURLToPath, URL } from "node:url"
import tailwindcss from "@tailwindcss/vite"
import react from "@vitejs/plugin-react"
import { defineConfig, loadEnv } from "vite"

const webRoot = fileURLToPath(new URL(".", import.meta.url))
const repositoryRoot = fileURLToPath(new URL("../..", import.meta.url))

export default defineConfig(({ mode }) => {
  const environment = {
    ...loadEnv(mode, repositoryRoot, "VITE_"),
    ...loadEnv(mode, webRoot, "VITE_"),
  }

  for (const [name, value] of Object.entries(environment)) {
    if (process.env[name] === undefined) process.env[name] = value
  }

  return {
    envDir: webRoot,
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        "@": fileURLToPath(new URL("./src", import.meta.url)),
      },
    },
    optimizeDeps: {
      include: ["@studynotion/contracts/catalog"],
    },
    server: {
      host: "127.0.0.1",
      port: 3000,
    },
    preview: {
      host: "127.0.0.1",
      port: 4173,
    },
    build: {
      outDir: "dist",
      sourcemap: false,
    },
    test: {
      environment: "jsdom",
      setupFiles: ["./test/setup.js"],
      include: ["src/**/*.test.{js,jsx}"],
      exclude: ["node_modules", "dist"],
      css: true,
      globals: true,
    },
  }
})
