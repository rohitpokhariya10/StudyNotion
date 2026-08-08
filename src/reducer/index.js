import { combineReducers } from "@reduxjs/toolkit"

import { learningApi } from "../entities/learning/api/learningApi"
import { catalogApi } from "../services/catalogApi"
import authReducer from "../slices/authSlice"
import cartReducer from "../slices/cartSlice"
import courseReducer from "../slices/courseSlice"
import profileReducer from "../slices/profileSlice"
import viewCourseReducer from "../slices/viewCourseSlice"

const rootReducer = combineReducers({
  auth: authReducer,
  profile: profileReducer,
  course: courseReducer,
  cart: cartReducer,
  viewCourse: viewCourseReducer,
  [catalogApi.reducerPath]: catalogApi.reducer,
  [learningApi.reducerPath]: learningApi.reducer,
})

export default rootReducer
