import { toast } from "react-hot-toast"

import { apiConnector } from "../apiConnector"
import { catalogData } from "../apis"

export const getCatalogPageData = async (categoryId) => {
  const toastId = toast.loading("Loading...")
  let result = []
  try {
    const response = await apiConnector(
      "POST",
      catalogData.CATALOGPAGEDATA_API,
      {
        categoryId: categoryId,
      }
    )
    if (!response?.data?.success) {
      throw new Error("Could Not Fetch Catagory page data.")
    }
    result = response?.data
  } catch (error) {
    toast.error(
      error?.response?.data?.message ||
        error?.message ||
        "Could not load catalog"
    )
    result = error?.response?.data || { success: false }
  } finally {
    toast.dismiss(toastId)
  }
  return result
}
