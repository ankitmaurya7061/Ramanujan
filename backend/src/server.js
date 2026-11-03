const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const path = require("path");

// Load environment variables from backend/.env regardless of the launch directory.
dotenv.config({
  path: path.join(__dirname, "../.env"),
});

const connectDB = require("./config/db");

// =========================
// ROUTES
// =========================

const authRoutes = require("./routes/authRoutes");
const userRoutes = require("./routes/userRoutes");
const adminRoutes = require("./routes/adminRoutes");
const courseRoutes = require("./routes/courseRoutes");
const lessonRoutes = require("./routes/lessonRoutes");
const testRoutes = require("./routes/testRoutes");
const testResultRoutes = require("./routes/testResultRoutes");
const attendanceRoutes = require("./routes/attendanceRoutes");
const notificationRoutes = require("./routes/notificationRoutes");
const progressRoutes = require("./routes/progressRoutes");

const feeRoutes = require("./routes/feeRoutes");
const feeAuthRoutes = require("./routes/feeAuthRoutes");

// Razorpay payment routes
const paymentRoutes = require("./routes/paymentRoutes");

const app = express();

// =========================
// CONNECT MONGODB
// =========================

connectDB();

// =========================
// MIDDLEWARE
// =========================

app.use(cors());

app.use(express.json());

// =========================
// SERVE UPLOADED FILES
// =========================

app.use(
  "/uploads",
  express.static(
    path.join(__dirname, "../uploads")
  )
);

// =========================
// ENV TEST
// =========================

console.log(
  "FEE ADMIN PASSWORD:",
  process.env.FEE_ADMIN_PASSWORD
    ? "Loaded"
    : "Missing"
);

// Razorpay environment check
console.log(
  "RAZORPAY KEY ID:",
  process.env.RAZORPAY_KEY_ID
    ? "Loaded"
    : "Missing"
);

console.log(
  "RAZORPAY KEY SECRET:",
  process.env.RAZORPAY_KEY_SECRET
    ? "Loaded"
    : "Missing"
);

// =========================
// ROOT ROUTE
// =========================

app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "StudyPoint Backend is running",
  });
});

// =========================
// API ROUTES
// =========================

// Authentication
app.use(
  "/api/auth",
  authRoutes
);

// Users
app.use(
  "/api/users",
  userRoutes
);

// Admin
app.use(
  "/api/admin",
  adminRoutes
);

// Courses
app.use(
  "/api/courses",
  courseRoutes
);

// Lessons
app.use(
  "/api/lessons",
  lessonRoutes
);

// Tests
app.use(
  "/api/tests",
  testRoutes
);

// Test Results
app.use(
  "/api/test-results",
  testResultRoutes
);

// Attendance
app.use(
  "/api/attendance",
  attendanceRoutes
);

// Notifications
app.use(
  "/api/notifications",
  notificationRoutes
);

// Progress
app.use(
  "/api/progress",
  progressRoutes
);

// =========================
// FEE ADMIN LOGIN
// =========================

app.use(
  "/api/fee-auth",
  feeAuthRoutes
);

// =========================
// FEES
// =========================

app.use(
  "/api/fees",
  feeRoutes
);

// =========================
// RAZORPAY ONLINE PAYMENTS
// =========================

app.use(
  "/api/payments",
  paymentRoutes
);

// =========================
// SERVER
// =========================

const PORT = process.env.PORT || 5000;

app.listen(PORT, "0.0.0.0", () => {
  console.log(
    `StudyPoint Backend running on port ${PORT}`
  );
});