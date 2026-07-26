import React from "react"
import ReactDOM from "react-dom/client"

import App from "./App"
import AppProviders from "./providers/AppProviders"

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
