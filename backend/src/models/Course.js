const mongoose = require("mongoose");

const courseSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },

    description: {
      type: String,
      required: true,
      trim: true,
    },

    image: {
      type: String,
      default: "",
    },

    instructor: {
      type: String,
      default: "",
      trim: true,
    },

    category: {
      type: String,
      default: "Development",
      trim: true,
    },

    level: {
      type: String,
      default: "Beginner",
      trim: true,
    },

    lessons: {
      type: Number,
      default: 0,
      min: 0,
    },

    duration: {
      type: String,
      default: "0h",
      trim: true,
    },

    rating: {
      type: Number,
      default: 0,
      min: 0,
      max: 5,
    },

    students: {
      type: Number,
      default: 0,
      min: 0,
    },

    icon: {
      type: String,
      default: "CO",
      trim: true,
    },

    color: {
      type: String,
      default: "#DBEAFE",
      trim: true,
    },

    iconColor: {
      type: String,
      default: "#2563EB",
      trim: true,
    },

    // Student class
    classId: {
      type: Number,
      enum: [6, 7, 8, 9, 10, 11, 12],
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model(
  "Course",
  courseSchema
);

