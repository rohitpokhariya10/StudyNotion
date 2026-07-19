import { ACCOUNT_TYPE } from "../utils/constants"

export const sidebarLinks = [
  {
    id: 1,
    name: "My Profile",
    path: "/dashboard/my-profile",
    icon: "VscAccount",
  },
  {
    id: 2,
    name: "Dashboard",
    path: "/dashboard/instructor",
    type: ACCOUNT_TYPE.INSTRUCTOR,
    icon: "VscDashboard",
  },
  {
    id: 3,
    name: "My Courses",
    path: "/dashboard/my-courses",
    type: ACCOUNT_TYPE.INSTRUCTOR,
    icon: "VscVm",
  },
  {
    id: 4,
    name: "Add Course",
    path: "/dashboard/add-course",
    type: ACCOUNT_TYPE.INSTRUCTOR,
    icon: "VscAdd",
  },
  {
    id: 5,
    name: "Enrolled Courses",
    path: "/dashboard/enrolled-courses",
    type: ACCOUNT_TYPE.STUDENT,
    icon: "VscMortarBoard",
  },
  {
    id: 7,
    name: "Cart",
    path: "/dashboard/cart",
    type: ACCOUNT_TYPE.STUDENT,
    icon: "VscArchive",
  },
  {
    id: 6,
    name: "Purchases & Refunds",
    path: "/dashboard/purchases",
    type: ACCOUNT_TYPE.STUDENT,
    icon: "VscHistory",
  },
  {
    id: 8,
    name: "Instructor Approvals",
    path: "/dashboard/instructor-approvals",
    type: ACCOUNT_TYPE.ADMIN,
    icon: "VscVerified",
  },
  {
    id: 9,
    name: "Payment Reconciliation",
    path: "/dashboard/payment-reconciliation",
    type: ACCOUNT_TYPE.ADMIN,
    icon: "VscCreditCard",
  },
]
