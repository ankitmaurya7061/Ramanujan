const express = require("express");

const {
  getAdminDashboard,
  createStudent,
} = require("../controllers/adminController");

const protect = require("../middleware/authMiddleware");
const adminOnly = require("../middleware/adminMiddleware");

const router = express.Router();

// Admin Dashboard
router.get(
  "/dashboard",
  protect,
  adminOnly,
  getAdminDashboard
);

// Create Student - Admin Only
router.post(
  "/students",
  protect,
  adminOnly,
  createStudent
);

module.exports = router;