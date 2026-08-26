import { contactusEndpoint } from "@/shared/api/endpoints"
import { apiConnector } from "@/shared/api/httpClient"

export async function sendContactMessage(payload) {
  const response = await apiConnector(
    "POST",
    contactusEndpoint.CONTACT_US_API,
    payload
  )

  if (!response?.data?.success) {
    throw new Error(response?.data?.message || "Message delivery failed")
  }

  return response.data
}
