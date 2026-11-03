const express = require("express");

const {
  createOrUpdateFee,
  getClassFee,
  getAllFees,
  getClassStudentsFees,
  getStudentFee,
  getMyFee,
  addOfflinePayment,
} = require("../controllers/feeController");

const protect = require("../middleware/authMiddleware");
const feeAdminOnly = require("../middleware/feeAdminMiddleware");

const router = express.Router();

/*
====================================================
FEE ADMIN
====================================================
*/

// Create / update class fee
router.post(
  "/",
  feeAdminOnly,
  createOrUpdateFee
);

// Get one class fee
router.get(
  "/class/:classId",
  feeAdminOnly,
  getClassFee
);

// Get all class fee configurations
router.get(
  "/all",
  feeAdminOnly,
  getAllFees
);

// Get all students of one class + fee summary
router.get(
  "/class/:classId/students",
  feeAdminOnly,
  getClassStudentsFees
);

// Get one student's fee summary
router.get(
  "/student/:studentId",
  feeAdminOnly,
  getStudentFee
);

// Add offline payment
router.post(
  "/payments/offline",
  feeAdminOnly,
  addOfflinePayment
);

/*
====================================================
STUDENT
====================================================
*/

router.get(
  "/my",
  protect,
  getMyFee
);

module.exports = router;