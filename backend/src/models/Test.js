const mongoose = require("mongoose");

const testSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },

    description: {
      type: String,
      default: "",
      trim: true,
    },

    course: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Course",
      required: true,
    },

    duration: {
      type: Number,
      default: 30,
      min: 1,
    },

    totalMarks: {
      type: Number,
      default: 0,
      min: 0,
    },

    questions: {
      type: [
        {
          question: {
            type: String,
            required: true,
            trim: true,
          },

          options: {
            type: [String],
            required: true,
          },

          correctAnswer: {
            type: String,
            required: true,
            trim: true,
          },

          marks: {
            type: Number,
            default: 1,
            min: 1,
          },
        },
      ],
      default: [],
    },
  },
  {
    timestamps: true,
  },
);

module.exports = mongoose.model("Test", testSchema);
