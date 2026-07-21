const express = require("express")

const { listCatalogCourses } = require("../controllers/CatalogV2")
const { sendV2Error } = require("../domains/catalog/catalogErrors")

const router = express.Router()

router.get("/courses", listCatalogCourses)

router.use((req, res) =>
  sendV2Error(req, res, {
    code: "ROUTE_NOT_FOUND",
    message: "Route not found",
    statusCode: 404,
  })
)

module.exports = router
