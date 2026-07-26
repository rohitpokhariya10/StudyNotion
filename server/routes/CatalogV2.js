const express = require("express")
const {
  catalogCourseListQuerySchema,
} = require("@studynotion/contracts/catalog")

const { listCatalogCourses } = require("../controllers/CatalogV2")
const { sendV2Error } = require("../domains/catalog/catalogErrors")
const { validateV2Request } = require("../shared/http/validateV2Request")

const router = express.Router()

router.get(
  "/courses",
  validateV2Request({
    query: {
      schema: catalogCourseListQuerySchema,
      message: "The catalog query is invalid",
    },
  }),
  listCatalogCourses
)

router.use((req, res) =>
  sendV2Error(req, res, {
    code: "ROUTE_NOT_FOUND",
    message: "Route not found",
    statusCode: 404,
  })
)

module.exports = router
