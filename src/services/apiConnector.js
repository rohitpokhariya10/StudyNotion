import axios from "axios"

export const NORMAL_REQUEST_TIMEOUT_MS = 15000
export const UPLOAD_REQUEST_TIMEOUT_MS = 120000

export const axiosInstance = axios.create({
  timeout: NORMAL_REQUEST_TIMEOUT_MS,
  withCredentials: true,
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
    timeout: isFormData
      ? UPLOAD_REQUEST_TIMEOUT_MS
      : NORMAL_REQUEST_TIMEOUT_MS,
  })
}
