const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 150,
    },

    message: {
      type: String,
      required: true,
      trim: true,
      maxlength: 1000,
    },

    type: {
      type: String,
      enum: [
        "general",
        "course",
        "test",
        "attendance",
        "announcement",
      ],
      default: "general",
    },

    isRead: {
      type: Boolean,
      default: false,
    },

    // Optional related data
    relatedId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
    },

    relatedType: {
      type: String,
      enum: [
        "course",
        "test",
        "attendance",
        "none",
      ],
      default: "none",
    },
  },
  {
    timestamps: true,
  }
);

notificationSchema.index({
  user: 1,
  createdAt: -1,
});

notificationSchema.index({
  user: 1,
  isRead: 1,
});

module.exports =
  mongoose.model(
    "Notification",
    notificationSchema
  );