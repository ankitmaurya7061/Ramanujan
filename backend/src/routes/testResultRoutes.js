const express = require("express");

const {
  submitTestResult,
  getMyTestResults,
  getStudentTestResults,
  getAllTestResults,
} = require("../controllers/testResultController");

const protect = require("../middleware/authMiddleware");
const adminOnly = require("../middleware/adminMiddleware");

const router = express.Router();

router.post("/", protect, submitTestResult);

router.get("/my-results", protect, getMyTestResults);

router.get(
  "/student/:studentId",
  protect,
  adminOnly,
  getStudentTestResults
);

router.get(
  "/",
  protect,
  adminOnly,
  getAllTestResults
);

module.exports = router;