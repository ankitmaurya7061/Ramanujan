const Notification = require("../models/Notification");
const User = require("../models/User");

/*
|--------------------------------------------------------------------------
| Create Notification
|--------------------------------------------------------------------------
| Admin can:
| 1. Send notification to all students
| 2. Send notification to one specific student
|--------------------------------------------------------------------------
*/
const createNotification = async (req, res) => {
  try {
    const {
      userId,
      sendTo = "specific",
      title,
      message,
      type = "general",
      relatedId = null,
      relatedType = "none",
    } = req.body;

    // --------------------------------------------------
    // VALIDATION
    // --------------------------------------------------

    if (!title || !title.trim()) {
      return res.status(400).json({
        success: false,
        message: "Notification title is required",
      });
    }

    if (!message || !message.trim()) {
      return res.status(400).json({
        success: false,
        message: "Notification message is required",
      });
    }

    if (title.trim().length > 150) {
      return res.status(400).json({
        success: false,
        message: "Title cannot exceed 150 characters",
      });
    }

    if (message.trim().length > 1000) {
      return res.status(400).json({
        success: false,
        message: "Message cannot exceed 1000 characters",
      });
    }

    const allowedTypes = [
      "general",
      "course",
      "test",
      "attendance",
      "announcement",
    ];

    if (!allowedTypes.includes(type)) {
      return res.status(400).json({
        success: false,
        message: "Invalid notification type",
      });
    }

    const allowedRelatedTypes = [
      "course",
      "test",
      "attendance",
      "none",
    ];

    if (!allowedRelatedTypes.includes(relatedType)) {
      return res.status(400).json({
        success: false,
        message: "Invalid related type",
      });
    }

    // --------------------------------------------------
    // SEND TO ALL STUDENTS
    // --------------------------------------------------

    if (sendTo === "all") {
      /*
       * IMPORTANT:
       * In StudyPoint, normal students have role = "user".
       * Admin has role = "admin".
       */
      const students = await User.find({
        role: "user",
      }).select("_id");

      if (students.length === 0) {
        return res.status(404).json({
          success: false,
          message: "No students found",
        });
      }

      const notifications = students.map((student) => ({
        user: student._id,
        title: title.trim(),
        message: message.trim(),
        type,
        isRead: false,
        relatedId: relatedId || null,
        relatedType,
      }));

      const createdNotifications =
        await Notification.insertMany(
          notifications
        );

      return res.status(201).json({
        success: true,
        message: `Notification sent to ${createdNotifications.length} students`,
        count: createdNotifications.length,
        notifications: createdNotifications,
      });
    }

    // --------------------------------------------------
    // SEND TO SPECIFIC STUDENT
    // --------------------------------------------------

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: "Student ID is required",
      });
    }

    const student = await User.findById(userId).select(
      "_id name email role"
    );

    if (!student) {
      return res.status(404).json({
        success: false,
        message: "Student not found",
      });
    }

    /*
     * StudyPoint student role = "user"
     */
    if (student.role !== "user") {
      return res.status(400).json({
        success: false,
        message: "Selected user is not a student",
      });
    }

    const notification =
      await Notification.create({
        user: student._id,
        title: title.trim(),
        message: message.trim(),
        type,
        isRead: false,
        relatedId: relatedId || null,
        relatedType,
      });

    return res.status(201).json({
      success: true,
      message: "Notification sent successfully",
      notification,
    });
  } catch (error) {
    console.error(
      "Create Notification Error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Server error while creating notification",
    });
  }
};

/*
|--------------------------------------------------------------------------
| Get My Notifications
|--------------------------------------------------------------------------
*/
const getMyNotifications = async (req, res) => {
  try {
    const notifications =
      await Notification.find({
        user: req.user._id,
      })
        .sort({
          createdAt: -1,
        })
        .lean();

    const unreadCount = notifications.filter(
      (notification) =>
        !notification.isRead
    ).length;

    return res.status(200).json({
      success: true,
      count: notifications.length,
      unreadCount,
      notifications,
    });
  } catch (error) {
    console.error(
      "Get My Notifications Error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Server error while fetching notifications",
    });
  }
};

/*
|--------------------------------------------------------------------------
| Mark Notification As Read
|--------------------------------------------------------------------------
*/
const markNotificationAsRead = async (
  req,
  res
) => {
  try {
    const { id } = req.params;

    const notification =
      await Notification.findOneAndUpdate(
        {
          _id: id,
          user: req.user._id,
        },
        {
          $set: {
            isRead: true,
          },
        },
        {
          new: true,
        }
      );

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: "Notification not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Notification marked as read",
      notification,
    });
  } catch (error) {
    console.error(
      "Mark Notification Read Error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Server error while marking notification as read",
    });
  }
};

/*
|--------------------------------------------------------------------------
| Mark All Notifications As Read
|--------------------------------------------------------------------------
*/
const markAllNotificationsAsRead = async (
  req,
  res
) => {
  try {
    const result =
      await Notification.updateMany(
        {
          user: req.user._id,
          isRead: false,
        },
        {
          $set: {
            isRead: true,
          },
        }
      );

    return res.status(200).json({
      success: true,
      message:
        "All notifications marked as read",
      modifiedCount: result.modifiedCount,
    });
  } catch (error) {
    console.error(
      "Mark All Notifications Read Error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Server error while marking notifications as read",
    });
  }
};

/*
|--------------------------------------------------------------------------
| Delete Notification
|--------------------------------------------------------------------------
*/
const deleteNotification = async (
  req,
  res
) => {
  try {
    const { id } = req.params;

    const notification =
      await Notification.findOneAndDelete({
        _id: id,
        user: req.user._id,
      });

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: "Notification not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Notification deleted successfully",
    });
  } catch (error) {
    console.error(
      "Delete Notification Error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Server error while deleting notification",
    });
  }
};

/*
|--------------------------------------------------------------------------
| Delete All Read Notifications
|--------------------------------------------------------------------------
*/
const deleteReadNotifications = async (
  req,
  res
) => {
  try {
    const result =
      await Notification.deleteMany({
        user: req.user._id,
        isRead: true,
      });

    return res.status(200).json({
      success: true,
      message:
        "Read notifications deleted successfully",
      deletedCount: result.deletedCount,
    });
  } catch (error) {
    console.error(
      "Delete Read Notifications Error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Server error while deleting read notifications",
    });
  }
};

module.exports = {
  createNotification,
  getMyNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  deleteNotification,
  deleteReadNotifications,
};