const mongoose = require("mongoose");

const lessonSchema = new mongoose.Schema(
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

    videoUrl: {
      type: String,
      default: "",
      trim: true,
    },

    notesUrl: {
      type: String,
      default: "",
      trim: true,
    },

    duration: {
      type: String,
      default: "0 min",
      trim: true,
    },

    course: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Course",
      required: true,
    },

    /*
     * Lesson order
     *
     * Example:
     * 1 = Introduction
     * 2 = Algebra
     * 3 = Linear Equations
     */
    order: {
      type: Number,
      default: 1,
      min: 1,
    },

    /*
     * Lesson visibility
     *
     * draft:
     *   Admin can see/edit
     *   Student cannot access
     *
     * published:
     *   Student can access
     */
    status: {
      type: String,
      enum: ["draft", "published"],
      default: "draft",
    },
  },
  {
    timestamps: true,
  }
);

/*
 * Faster course lesson loading
 */
lessonSchema.index({
  course: 1,
  order: 1,
});

lessonSchema.index({
  course: 1,
  status: 1,
  order: 1,
});

module.exports = mongoose.model("Lesson", lessonSchema);