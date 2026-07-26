import { Toaster } from "react-hot-toast"
import { Provider } from "react-redux"
import { BrowserRouter } from "react-router-dom"

import ErrorBoundary from "../../shared/ui/ErrorBoundary"
import { store as defaultStore } from "../store"

function AppProviders({ children, store = defaultStore }) {
  return (
    <Provider store={store}>
      <BrowserRouter
        future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
      >
        <ErrorBoundary scope="application">{children}</ErrorBoundary>
        <Toaster position="top-center" />
      </BrowserRouter>
    </Provider>
  )
}

export default AppProviders
