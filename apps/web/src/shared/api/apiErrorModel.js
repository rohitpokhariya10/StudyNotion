const nonEmptyString = (value) =>
  typeof value === "string" && value.trim() ? value.trim() : null

export const readApiErrorResponse = (error) => {
  const response = error?.response || error
  const payload = response?.data
  const envelope = payload?.error

  return {
    status: response?.status,
    code: nonEmptyString(envelope?.code) || nonEmptyString(payload?.code),
    message:
      nonEmptyString(envelope?.message) || nonEmptyString(payload?.message),
    requestId:
      nonEmptyString(envelope?.requestId) || nonEmptyString(payload?.requestId),
  }
}

export const getSafeApiErrorPresentation = (error, { fallbackMessage }) => {
  const { message, requestId } = readApiErrorResponse(error)

  return {
    message: message || fallbackMessage,
    requestId,
  }
}

export const getSafeApiErrorEnvelopePresentation = (
  error,
  { fallbackMessage }
) => {
  const response = error?.response || error
  const envelope = response?.data?.error

  return {
    message: nonEmptyString(envelope?.message) || fallbackMessage,
    requestId: nonEmptyString(envelope?.requestId),
  }
}
