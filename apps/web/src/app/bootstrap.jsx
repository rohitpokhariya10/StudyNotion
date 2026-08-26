import App from "@/app/App"
import AppProviders from "@/app/providers/AppProviders"
import React from "react"
import ReactDOM from "react-dom/client"

export const createApplicationElement = () => (
  <React.StrictMode>
    <AppProviders>
      <App />
    </AppProviders>
  </React.StrictMode>
)

export const mountApplication = (rootElement) => {
  const root = ReactDOM.createRoot(rootElement)
  root.render(createApplicationElement())
  return root
}
