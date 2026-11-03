const express = require("express");

const {
  getCurrentUser,
  updateCurrentUser,
  changePassword,
  updateProfilePhoto,
  removeProfilePhoto,
  getAllUsers,
  deleteUser,
} = require("../controllers/userController");

const protect = require("../middleware/authMiddleware");
const adminOnly = require("../middleware/adminMiddleware");
const uploadProfilePhoto = require("../middleware/uploadMiddleware");

const router = express.Router();

// Current user
router.get(
  "/me",
  protect,
  getCurrentUser
);

// Update profile
router.put(
  "/me",
  protect,
  updateCurrentUser
);

// Upload / update profile photo
router.put(
  "/profile-photo",
  protect,
  uploadProfilePhoto.single("profilePhoto"),
  updateProfilePhoto
);

// Remove profile photo
router.delete(
  "/profile-photo",
  protect,
  removeProfilePhoto
);

// Change password
router.put(
  "/change-password",
  protect,
  changePassword
);

// Admin - Get all users
router.get(
  "/",
  protect,
  adminOnly,
  getAllUsers
);

// Admin - Delete user
router.delete(
  "/:email",
  protect,
  adminOnly,
  deleteUser
);

module.exports = router;