const express = require("express");

const {
  createCourse,
  getCourses,
  getCourseById,
  updateCourse,
  uploadCoursePhoto,
  deleteCourse,
} = require("../controllers/courseController");

const protect = require("../middleware/authMiddleware");

const adminOnly = require("../middleware/adminMiddleware");

const uploadCourseImage = require(
  "../middleware/courseUploadMiddleware"
);

const router = express.Router();

/*
|--------------------------------------------------------------------------
| GET ALL COURSES
|--------------------------------------------------------------------------
|
| Login required.
|
| Admin:
|   Gets all courses.
|
| Student:
|   Gets only courses of their class.
|
*/

router.get(
  "/",
  protect,
  getCourses
);

/*
|--------------------------------------------------------------------------
| GET SINGLE COURSE
|--------------------------------------------------------------------------
|
| Login required.
|
| Student can only access
| their own class course.
|
*/

router.get(
  "/:id",
  protect,
  getCourseById
);

/*
|--------------------------------------------------------------------------
| CREATE COURSE
|--------------------------------------------------------------------------
|
| Admin only.
|
*/

router.post(
  "/",
  protect,
  adminOnly,
  createCourse
);

/*
|--------------------------------------------------------------------------
| UPLOAD COURSE PHOTO
|--------------------------------------------------------------------------
|
| Admin only.
|
*/

router.post(
  "/:id/image",
  protect,
  adminOnly,
  uploadCourseImage.single(
    "courseImage"
  ),
  uploadCoursePhoto
);

/*
|--------------------------------------------------------------------------
| UPDATE COURSE
|--------------------------------------------------------------------------
|
| Admin only.
|
*/

router.put(
  "/:id",
  protect,
  adminOnly,
  updateCourse
);

/*
|--------------------------------------------------------------------------
| DELETE COURSE
|--------------------------------------------------------------------------
|
| Admin only.
|
*/

router.delete(
  "/:id",
  protect,
  adminOnly,
  deleteCourse
);

module.exports = router;