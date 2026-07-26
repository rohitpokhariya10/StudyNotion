import { useEffect, useRef } from "react"
import { useDispatch } from "react-redux"

import { restoreSession } from "../../services/operations/authAPI"

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
