const express = require("express");

const {
  createLesson,
  getLessonsByCourse,
  getLessonById,
  updateLesson,
  deleteLesson,
} = require("../controllers/lessonController");

const protect = require("../middleware/authMiddleware");
const adminOnly = require("../middleware/adminMiddleware");

const router = express.Router();

/*
|--------------------------------------------------------------------------
| STUDENT + ADMIN
|--------------------------------------------------------------------------
| Authentication required.
|
| Admin can access all courses.
| Student can only access their own class
| because lessonController checks course.classId.
|--------------------------------------------------------------------------
*/

// Get all lessons of a course
router.get(
  "/course/:courseId",
  protect,
  getLessonsByCourse
);

// Get single lesson
router.get(
  "/:id",
  protect,
  getLessonById
);


/*
|--------------------------------------------------------------------------
| ADMIN ONLY
|--------------------------------------------------------------------------
*/

// Create lesson
router.post(
  "/",
  protect,
  adminOnly,
  createLesson
);

// Update lesson
router.put(
  "/:id",
  protect,
  adminOnly,
  updateLesson
);

// Delete lesson
router.delete(
  "/:id",
  protect,
  adminOnly,
  deleteLesson
);

module.exports = router;