const mongoose = require("mongoose");

const paymentSchema = new mongoose.Schema(
  {
    // Class fee configuration
    fee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Fee",
      required: true,
    },

    // Student ID
    // Student delete hone ke baad bhi payment record rahega
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    // IMPORTANT:
    // Student ka naam payment ke time permanently save hoga.
    // Student account delete hone ke baad bhi ye naam available rahega.
    studentName: {
      type: String,
      required: true,
      trim: true,
    },

    // Student email ka historical snapshot
    studentEmail: {
      type: String,
      trim: true,
      default: "",
    },

    // Student's class
    classId: {
      type: Number,
      enum: [6, 7, 8, 9, 10, 11, 12],
      required: true,
    },

    // IMPORTANT:
    // Which month's fee this payment belongs to.
    //
    // Format:
    // YYYY-MM
    //
    // Example:
    // 2026-09 = September 2026
    // 2026-10 = October 2026
    // 2026-11 = November 2026
    billingMonth: {
      type: String,
      required: true,
      match: /^\d{4}-(0[1-9]|1[0-2])$/,
    },

    // Payment amount
    amount: {
      type: Number,
      required: true,
      min: 1,
    },

    // Payment method
    mode: {
      type: String,
      enum: [
        "cash",
        "upi",
        "bank",
        "cheque",
        "online",
      ],
      required: true,
    },

    // Actual date when payment was made
    paymentDate: {
      type: Date,
      required: true,
      default: Date.now,
    },

    // UPI reference / transaction ID /
    // cheque number / bank reference etc.
    reference: {
      type: String,
      trim: true,
      default: "",
    },

    // Optional payment note
    note: {
      type: String,
      trim: true,
      default: "",
    },

    // Payment status
    status: {
      type: String,
      enum: [
        "success",
        "pending",
        "failed",
      ],
      default: "success",
    },

    // Admin who recorded offline payment
    addedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

/*
|--------------------------------------------------------------------------
| INDEXES
|--------------------------------------------------------------------------
*/

// Student payment history
paymentSchema.index({
  student: 1,
  paymentDate: -1,
});

// Student + month
paymentSchema.index({
  student: 1,
  billingMonth: 1,
});

// Class + month
paymentSchema.index({
  classId: 1,
  billingMonth: 1,
});

// Fee + student + month
paymentSchema.index({
  fee: 1,
  student: 1,
  billingMonth: 1,
});

// Class + month + payment status
// Useful for collection reports
paymentSchema.index({
  classId: 1,
  billingMonth: 1,
  status: 1,
});

// Historical student payment lookup
paymentSchema.index({
  studentName: 1,
  billingMonth: 1,
});

module.exports = mongoose.model(
  "Payment",
  paymentSchema
);

