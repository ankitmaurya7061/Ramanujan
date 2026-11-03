const mongoose = require("mongoose");

const answerSchema = new mongoose.Schema(
  {
    questionId: {
      type: String,
      required: true,
    },

    question: {
      type: String,
      required: true,
    },

    options: {
      type: [String],
      default: [],
    },

    selectedAnswer: {
      type: Number,
      default: -1,
    },

    correctAnswer: {
      type: Number,
      required: true,
    },

    isCorrect: {
      type: Boolean,
      required: true,
    },

    marks: {
      type: Number,
      default: 1,
      min: 1,
    },
  },
  { _id: false }
);

const testResultSchema = new mongoose.Schema(
  {
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    test: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Test",
      required: true,
    },

    course: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Course",
      required: true,
    },

    score: {
      type: Number,
      required: true,
      min: 0,
    },

    totalMarks: {
      type: Number,
      required: true,
      min: 0,
    },

    percentage: {
      type: Number,
      required: true,
      min: 0,
      max: 100,
    },

    passed: {
      type: Boolean,
      default: false,
    },

    // Question-wise answer details
    answers: {
      type: [answerSchema],
      default: [],
    },

    submittedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

// One student can submit a particular test only once
testResultSchema.index(
  { student: 1, test: 1 },
  { unique: true }
);

module.exports = mongoose.model("TestResult", testResultSchema);