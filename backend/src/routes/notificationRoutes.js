const express = require("express");

const {
  createNotification,
  getMyNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  deleteNotification,
  deleteReadNotifications,
} = require("../controllers/notificationController");

const protect = require("../middleware/authMiddleware");
const adminOnly = require("../middleware/adminMiddleware");

const router = express.Router();

/*
|--------------------------------------------------------------------------
| ADMIN ROUTES
|--------------------------------------------------------------------------
*/

// Admin creates notification
// Can send to one student or all students
router.post(
  "/",
  protect,
  adminOnly,
  createNotification
);


/*
|--------------------------------------------------------------------------
| STUDENT ROUTES
|--------------------------------------------------------------------------
*/

// Get logged-in student's notifications
router.get(
  "/my-notifications",
  protect,
  getMyNotifications
);

// Mark one notification as read
router.put(
  "/:id/read",
  protect,
  markNotificationAsRead
);

// Mark all notifications as read
router.put(
  "/read-all",
  protect,
  markAllNotificationsAsRead
);

// Delete one notification
router.delete(
  "/:id",
  protect,
  deleteNotification
);

// Delete all read notifications
router.delete(
  "/read-read",
  protect,
  deleteReadNotifications
);

module.exports = router;










