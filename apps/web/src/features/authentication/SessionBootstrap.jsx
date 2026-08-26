import { restoreSession } from "@/features/authentication/api/authApi"
import { useEffect, useRef } from "react"
import { useDispatch } from "react-redux"

function SessionBootstrap({ children }) {
  const dispatch = useDispatch()
  const hasRestoredSession = useRef(false)

  useEffect(() => {
    if (hasRestoredSession.current) return
    hasRestoredSession.current = true
    dispatch(restoreSession())
  }, [dispatch])

  return children
}

export default SessionBootstrap
