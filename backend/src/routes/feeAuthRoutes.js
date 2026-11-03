const express = require("express");

const {
  feeAdminLogin,
} = require("../controllers/feeAuthController");

const router = express.Router();

router.post(
  "/login",
  feeAdminLogin
);

module.exports = router;