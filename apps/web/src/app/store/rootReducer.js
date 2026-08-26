import { cartReducer } from "@/entities/cart"
import { catalogApi } from "@/entities/catalog"
import { courseReducer } from "@/entities/course"
import {
  learningApi,
  legacyViewCourseReducer as viewCourseReducer,
} from "@/entities/learning"
import { authReducer, profileReducer } from "@/entities/user"
import { combineReducers } from "@reduxjs/toolkit"

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
