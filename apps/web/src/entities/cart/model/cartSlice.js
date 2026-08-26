import { createSlice } from "@reduxjs/toolkit"
import { toast } from "react-hot-toast"

const getStorage = () => {
  if (typeof window === "undefined") return null

  try {
    return window.localStorage || null
  } catch {
    return null
  }
}

const readCart = () => {
  try {
    const value = getStorage()?.getItem("cart")
    const parsed = value ? JSON.parse(value) : []
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

const persistCart = (cart) => {
  const storage = getStorage()
  if (!storage) return

  const total = cart.reduce(
    (sum, course) => sum + (Number(course?.price) || 0),
    0
  )

  try {
    storage.setItem("cart", JSON.stringify(cart))
    storage.setItem("total", JSON.stringify(total))
    storage.setItem("totalItems", JSON.stringify(cart.length))
  } catch {
    // A full or disabled browser storage must not break the cart UI.
  }
}

const storedCart = readCart()

const initialState = {
  cart: storedCart,
  total: storedCart.reduce(
    (sum, course) => sum + (Number(course?.price) || 0),
    0
  ),
  totalItems: storedCart.length,
}

const cartSlice = createSlice({
  name: "cart",
  initialState,
  reducers: {
    addToCart: (state, action) => {
      const course = action.payload
      const index = state.cart.findIndex((item) => item._id === course._id)

      if (index >= 0) {
        // If the course is already in the cart, do not modify the quantity
        toast.error("Course already in cart")
        return
      }
      // If the course is not in the cart, add it to the cart
      state.cart.push(course)
      // Update the total quantity and price
      state.totalItems++
      state.total += Number(course.price) || 0
      // Update to localstorage
      persistCart(state.cart)
      // show toast
      toast.success("Course added to cart")
    },
    removeFromCart: (state, action) => {
      const courseId = action.payload
      const index = state.cart.findIndex((item) => item._id === courseId)

      if (index >= 0) {
        // If the course is found in the cart, remove it
        state.totalItems--
        state.total -= Number(state.cart[index].price) || 0
        state.cart.splice(index, 1)
        // Update to localstorage
        persistCart(state.cart)
        // show toast
        toast.success("Course removed from cart")
      }
    },
    resetCart: (state) => {
      state.cart = []
      state.total = 0
      state.totalItems = 0
      // Update to localstorage
      const storage = getStorage()
      try {
        storage?.removeItem("cart")
        storage?.removeItem("total")
        storage?.removeItem("totalItems")
      } catch {
        // Local state is authoritative when browser storage is unavailable.
      }
    },
  },
})

export const { addToCart, removeFromCart, resetCart } = cartSlice.actions

export default cartSlice.reducer
