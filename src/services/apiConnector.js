import axios from "axios"

export const NORMAL_REQUEST_TIMEOUT_MS = 15000
export const UPLOAD_REQUEST_TIMEOUT_MS = 120000

export const axiosInstance = axios.create({
  timeout: NORMAL_REQUEST_TIMEOUT_MS,
  withCredentials: true,
})

export const SESSION_RESPONSE_SIGNALS = Object.freeze({
  UNAUTHORIZED: "SESSION_UNAUTHORIZED",
  ACCOUNT_DELETION_PENDING: "ACCOUNT_DELETION_PENDING",
  POLICY_ACCEPTANCE_REQUIRED: "POLICY_ACCEPTANCE_REQUIRED",
})

let sessionResponseHandler = null

export const classifySessionResponseError = (error) => {
  const status = error?.response?.status
  const code = error?.response?.data?.code

  if (status === 401) return SESSION_RESPONSE_SIGNALS.UNAUTHORIZED
  if (
    status === 423 &&
    code === SESSION_RESPONSE_SIGNALS.ACCOUNT_DELETION_PENDING
  ) {
    return SESSION_RESPONSE_SIGNALS.ACCOUNT_DELETION_PENDING
  }
  if (
    status === 428 &&
    code === SESSION_RESPONSE_SIGNALS.POLICY_ACCEPTANCE_REQUIRED
  ) {
    return SESSION_RESPONSE_SIGNALS.POLICY_ACCEPTANCE_REQUIRED
  }

  return null
}

export const registerSessionResponseHandler = (handler) => {
  sessionResponseHandler = typeof handler === "function" ? handler : null

  return () => {
    if (sessionResponseHandler === handler) sessionResponseHandler = null
  }
}

axiosInstance.interceptors.response.use(undefined, (error) => {
  const signal = classifySessionResponseError(error)

  if (signal && sessionResponseHandler) {
    try {
      sessionResponseHandler(signal)
    } catch {
      // Client-state synchronization must never replace the server error that
      // the original request caller is responsible for handling.
    }
  }

  return Promise.reject(error)
})

export const apiConnector = (method, url, bodyData, headers, params) => {
  // Authentication is carried by the HttpOnly session cookie. Drop legacy
  // bearer headers while older call sites are migrated so no placeholder or
  // stale token is sent over the wire.
  const cookieSessionHeaders = { ...(headers || {}) }
  delete cookieSessionHeaders.Authorization
  delete cookieSessionHeaders.authorization

  const isFormData =
    typeof FormData !== "undefined" && bodyData instanceof FormData

  return axiosInstance({
    method,
    url,
    data: bodyData ?? null,
    headers: cookieSessionHeaders,
    params: params ?? null,
    timeout: isFormData ? UPLOAD_REQUEST_TIMEOUT_MS : NORMAL_REQUEST_TIMEOUT_MS,
  })
}
