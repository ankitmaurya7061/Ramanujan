const mongoose = require("mongoose");

const feeSchema = new mongoose.Schema(
  {
    // One fee configuration for each class
    classId: {
      type: Number,
      enum: [6, 7, 8, 9, 10, 11, 12],
      required: true,
      unique: true,
    },

    // Monthly fee for the whole class
    monthlyFee: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },

    status: {
      type: String,
      enum: ["active", "inactive"],
      default: "active",
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Fee", feeSchema);