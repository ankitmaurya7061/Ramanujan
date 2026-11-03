const express = require("express");

const {
  getMyProgress,
  completeLesson,
  addLearningTime,
  getAllMyProgress,
  getStudentProgress,
  getAllProgress,
} = require("../controllers/progressController");

const protect = require("../middleware/authMiddleware");
const adminOnly = require("../middleware/adminMiddleware");

const router = express.Router();

/*
|--------------------------------------------------------------------------
| Student Routes
|--------------------------------------------------------------------------
*/

// Get progress of a particular course
router.get(
  "/course/:courseId",
  protect,
  getMyProgress
);

// Mark lesson as completed
router.post(
  "/complete",
  protect,
  completeLesson
);

// Add learning time
router.post(
  "/learning-time",
  protect,
  addLearningTime
);

// Get progress of all courses of logged-in student
router.get(
  "/my-progress",
  protect,
  getAllMyProgress
);

/*
|--------------------------------------------------------------------------
| Admin Routes
|--------------------------------------------------------------------------
*/

// Get progress of a particular student
router.get(
  "/student/:studentId",
  protect,
  adminOnly,
  getStudentProgress
);

// Get progress of all students
router.get(
  "/all",
  protect,
  adminOnly,
  getAllProgress
);

module.exports = router;