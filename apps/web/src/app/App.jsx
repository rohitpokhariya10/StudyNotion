import "@/shared/styles/globals.css"

import AppRouter from "@/app/router/AppRouter"
import { SessionBootstrap } from "@/features/authentication"
import AppShell from "@/widgets/app-shell"

function App() {
  return (
    <SessionBootstrap>
      <AppShell>
        <AppRouter />
      </AppShell>
    </SessionBootstrap>
  )
}

export default App
