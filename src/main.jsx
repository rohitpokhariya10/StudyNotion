import React from "react"
import ReactDOM from "react-dom/client"
import { Toaster } from "react-hot-toast"
import { Provider } from "react-redux"
import { BrowserRouter } from "react-router-dom"

import App from "./App"
import ErrorBoundary from "./components/Common/ErrorBoundary"
import { store } from "./store"

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <Provider store={store}>
      <BrowserRouter
        future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
      >
        <ErrorBoundary scope="application">
          <App />
        </ErrorBoundary>
        <Toaster position="top-center" />
      </BrowserRouter>
    </Provider>
  </React.StrictMode>
)
