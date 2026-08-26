import { ratingsEndpoints } from "@/shared/api/endpoints"
import { apiConnector } from "@/shared/api/httpClient"

export async function fetchPublicReviews() {
  const { data } = await apiConnector(
    "GET",
    ratingsEndpoints.REVIEWS_DETAILS_API
  )

  return data?.success && Array.isArray(data?.data) ? data.data : []
}
