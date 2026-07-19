import React from "react"
import ReactDOM from "react-dom/client"
import { Toaster } from "react-hot-toast"
import { Provider } from "react-redux"
import { BrowserRouter } from "react-router-dom"

import App from "./App"
import { store } from "./store"

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <Provider store={store}>
      <BrowserRouter
        future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
      >
        <App />
        <Toaster position="top-center" />
      </BrowserRouter>
    </Provider>
  </React.StrictMode>
)
