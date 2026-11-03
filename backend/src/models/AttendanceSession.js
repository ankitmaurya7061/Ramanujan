const mongoose = require("mongoose");

const attendanceSessionSchema = new mongoose.Schema(
  {
    course: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Course",
      required: true,
    },

    date: {
      type: Date,
      required: true,
    },

    locked: {
      type: Boolean,
      default: true,
    },

    lockedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    lockedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

// One attendance session per course per date
attendanceSessionSchema.index(
  { course: 1, date: 1 },
  { unique: true }
);

module.exports = mongoose.model(
  "AttendanceSession",
  attendanceSessionSchema
);