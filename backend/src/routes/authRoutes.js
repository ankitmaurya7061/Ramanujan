const express = require("express");

const {
  login,
  forgotPassword,
  verifyResetOTP,
  resetPassword,
} = require("../controllers/authController");

const router = express.Router();

// Student/Admin Login
router.post("/login", login);

// Forgot Password
router.post("/forgot-password", forgotPassword);

router.post("/verify-reset-otp", verifyResetOTP);

router.post("/reset-password", resetPassword);

module.exports = router;