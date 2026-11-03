const express = require("express");

const {
  createTest,
  getTestsByCourse,
  getTestById,
  updateTest,
  deleteTest,
} = require("../controllers/testController");

const protect = require("../middleware/authMiddleware");
const adminOnly = require("../middleware/adminMiddleware");

const router = express.Router();

/*
|--------------------------------------------------------------------------
| Student / Admin - Get tests of a course
|--------------------------------------------------------------------------
| Backend controller will verify student's class.
*/
router.get(
  "/course/:courseId",
  protect,
  getTestsByCourse
);

/*
|--------------------------------------------------------------------------
| Student / Admin - Get single test
|--------------------------------------------------------------------------
| Backend controller will verify student's class.
*/
router.get(
  "/:id",
  protect,
  getTestById
);

/*
|--------------------------------------------------------------------------
| Admin - Create test
|--------------------------------------------------------------------------
*/
router.post(
  "/",
  protect,
  adminOnly,
  createTest
);

/*
|--------------------------------------------------------------------------
| Admin - Update test
|--------------------------------------------------------------------------
*/
router.put(
  "/:id",
  protect,
  adminOnly,
  updateTest
);

/*
|--------------------------------------------------------------------------
| Admin - Delete test
|--------------------------------------------------------------------------
*/
router.delete(
  "/:id",
  protect,
  adminOnly,
  deleteTest
);

module.exports = router;


