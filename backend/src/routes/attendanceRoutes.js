const express = require("express");

const {
  markAttendance,
  markAttendanceBatch,
  getMyAttendance,
  getStudentAttendance,
  getCourseAttendance,
} = require("../controllers/attendanceController");

const protect = require("../middleware/authMiddleware");
const adminOnly = require("../middleware/adminMiddleware");

const router = express.Router();

router.post(
  "/batch",
  protect,
  adminOnly,
  markAttendanceBatch
);

router.post(
  "/",
  protect,
  adminOnly,
  markAttendance
);

router.get(
  "/my-attendance",
  protect,
  getMyAttendance
);

router.get(
  "/student/:studentId",
  protect,
  adminOnly,
  getStudentAttendance
);

router.get(
  "/course/:courseId",
  protect,
  adminOnly,
  getCourseAttendance
);

module.exports = router;