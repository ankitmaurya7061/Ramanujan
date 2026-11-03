
const crypto = require("crypto");
const Razorpay = require("razorpay");

const User = require("../models/User");
const Fee = require("../models/Fee");
const Payment = require("../models/Payment");

const {
  sendPaymentReceipt,
} = require("../services/paymentReceiptService");

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

const ALLOWED_CLASSES = [6, 7, 8, 9, 10, 11, 12];

const isValidBillingMonth = (billingMonth) =>
  /^\d{4}-(0[1-9]|1[0-2])$/.test(
    String(billingMonth || "")
  );

const areRazorpayCredentialsConfigured = () =>
  Boolean(
    process.env.RAZORPAY_KEY_ID &&
    process.env.RAZORPAY_KEY_SECRET
  );

const getStudentPaidAmount = async (
  feeId,
  studentId,
  billingMonth
) => {
  const result = await Payment.aggregate([
    {
      $match: {
        fee: feeId,
        student: studentId,
        billingMonth,
        status: "success",
      },
    },
    {
      $group: {
        _id: null,
        total: { $sum: "$amount" },
      },
    },
  ]);

  return result[0]?.total || 0;
};

/*
|--------------------------------------------------------------------------
| CREATE RAZORPAY ORDER
|--------------------------------------------------------------------------
*/

const createRazorpayOrder = async (req, res) => {
  try {
    if (!areRazorpayCredentialsConfigured()) {
      return res.status(503).json({
        message: "Razorpay is not configured on the server",
      });
    }

    const studentId = req.user.id;
    const { billingMonth } = req.body;

    if (!isValidBillingMonth(billingMonth)) {
      return res.status(400).json({
        message: "Invalid billing month. Expected YYYY-MM",
      });
    }

    const student = await User.findById(studentId).select(
      "name email role classId"
    );

    if (!student) {
      return res.status(404).json({
        message: "Student not found",
      });
    }

    if (
      student.role !== "user" ||
      !ALLOWED_CLASSES.includes(student.classId)
    ) {
      return res.status(403).json({
        message: "Only valid students can make fee payments",
      });
    }

    const fee = await Fee.findOne({
      classId: student.classId,
      status: "active",
    });

    if (!fee || Number(fee.monthlyFee) <= 0) {
      return res.status(404).json({
        message: "Monthly fee is not configured for your class",
      });
    }

    const monthlyFee = Number(fee.monthlyFee);

    const paidAmount = await getStudentPaidAmount(
      fee._id,
      student._id,
      billingMonth
    );

    const dueAmount = Math.max(
      monthlyFee - paidAmount,
      0
    );

    if (dueAmount <= 0) {
      return res.status(400).json({
        message: "This month's fee is already fully paid",
      });
    }

    const amountInPaise = Math.round(dueAmount * 100);

    const order = await razorpay.orders.create({
      amount: amountInPaise,
      currency: "INR",
      receipt: `fee_${billingMonth.replace("-", "")}_${crypto
        .randomBytes(12)
        .toString("hex")}`,
      notes: {
        studentId: String(student._id),
        classId: String(student.classId),
        billingMonth,
        feeId: String(fee._id),
      },
    });

    return res.status(200).json({
      message: "Razorpay order created successfully",
      order: {
        id: order.id,
        amount: order.amount,
        currency: order.currency,
      },
      keyId: process.env.RAZORPAY_KEY_ID,
      fee: {
        monthlyFee,
        paid: paidAmount,
        due: dueAmount,
        billingMonth,
      },
      student: {
        name: student.name,
        email: student.email,
      },
    });
  } catch (error) {
    console.error("Create Razorpay Order Error:", error);

    return res.status(500).json({
      message: "Unable to create payment order",
    });
  }
};

/*
|--------------------------------------------------------------------------
| VERIFY RAZORPAY PAYMENT
|--------------------------------------------------------------------------
*/

const verifyRazorpayPayment = async (req, res) => {
  try {
    if (!areRazorpayCredentialsConfigured()) {
      return res.status(503).json({
        message: "Razorpay is not configured on the server",
      });
    }

    const studentId = req.user.id;

    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      billingMonth,
    } = req.body;

    if (
      !razorpay_order_id ||
      !razorpay_payment_id ||
      !razorpay_signature
    ) {
      return res.status(400).json({
        message: "Incomplete Razorpay payment data",
      });
    }

    if (!isValidBillingMonth(billingMonth)) {
      return res.status(400).json({
        message: "Invalid billing month. Expected YYYY-MM",
      });
    }

    // Verify Razorpay signature.
    const generatedSignature = crypto
      .createHmac(
        "sha256",
        process.env.RAZORPAY_KEY_SECRET
      )
      .update(
        `${razorpay_order_id}|${razorpay_payment_id}`
      )
      .digest("hex");

    const generatedBuffer = Buffer.from(
      generatedSignature,
      "utf8"
    );

    const receivedBuffer = Buffer.from(
      String(razorpay_signature),
      "utf8"
    );

    if (
      generatedBuffer.length !== receivedBuffer.length ||
      !crypto.timingSafeEqual(
        generatedBuffer,
        receivedBuffer
      )
    ) {
      return res.status(400).json({
        message: "Payment signature verification failed",
      });
    }

    const student = await User.findById(studentId).select(
      "name email role classId"
    );

    if (!student) {
      return res.status(404).json({
        message: "Student not found",
      });
    }

    if (
      student.role !== "user" ||
      !ALLOWED_CLASSES.includes(student.classId)
    ) {
      return res.status(403).json({
        message: "Only students can verify fee payments",
      });
    }

    const fee = await Fee.findOne({
      classId: student.classId,
      status: "active",
    });

    if (!fee) {
      return res.status(404).json({
        message: "Fee configuration not found",
      });
    }

    const order = await razorpay.orders.fetch(
      razorpay_order_id
    );

    if (!order) {
      return res.status(404).json({
        message: "Razorpay order not found",
      });
    }

    // Ensure this order belongs to the logged-in student.
    if (
      order.notes?.studentId !== String(student._id)
    ) {
      return res.status(403).json({
        message: "This order does not belong to this student",
      });
    }

    if (
      order.notes?.billingMonth !== billingMonth ||
      order.notes?.feeId !== String(fee._id) ||
      order.notes?.classId !== String(student.classId) ||
      order.currency !== "INR"
    ) {
      return res.status(400).json({
        message: "Payment order does not match the student's fee",
      });
    }

    // Check for an already-recorded transaction.
    const existingPayment = await Payment.findOne({
      reference: razorpay_payment_id,
    });

    if (existingPayment) {
      const samePayment =
        String(existingPayment.student) === String(student._id) &&
        String(existingPayment.fee) === String(fee._id) &&
        existingPayment.billingMonth === billingMonth &&
        existingPayment.note ===
          `Razorpay Order: ${razorpay_order_id}`;

      if (!samePayment) {
        return res.status(409).json({
          message: "This payment has already been recorded",
        });
      }

      return res.status(200).json({
        message: "Payment already verified",
        payment: existingPayment,
      });
    }

    // Fetch payment status directly from Razorpay.
    let razorpayPayment = await razorpay.payments.fetch(
      razorpay_payment_id
    );

    if (
      razorpayPayment.order_id !== razorpay_order_id ||
      razorpayPayment.amount !== order.amount ||
      razorpayPayment.currency !== order.currency
    ) {
      return res.status(400).json({
        message: "Razorpay payment does not match the order",
      });
    }

    // Capture an authorized payment if necessary.
    if (razorpayPayment.status === "authorized") {
      razorpayPayment = await razorpay.payments.capture(
        razorpay_payment_id,
        order.amount,
        order.currency
      );
    }

    if (razorpayPayment.status !== "captured") {
      return res.status(409).json({
        message: "Razorpay payment has not been captured",
      });
    }

    const paymentAmount =
      Number(razorpayPayment.amount) / 100;

    if (
      !Number.isFinite(paymentAmount) ||
      paymentAmount <= 0
    ) {
      return res.status(400).json({
        message: "Invalid payment amount",
      });
    }

    // Save the verified payment first.
    const payment = await Payment.create({
      fee: fee._id,
      student: student._id,
      studentName: student.name,
      studentEmail: student.email || "",
      classId: student.classId,
      billingMonth,
      amount: paymentAmount,
      mode: "online",
      paymentDate: new Date(),
      reference: razorpay_payment_id,
      note: `Razorpay Order: ${razorpay_order_id}`,
      status: "success",
      addedBy: null,
    });

    // Email failure must not undo a successful payment.
    let receiptEmailSent = false;
    let receiptNumber = `WRRC-${String(payment._id)}`;

    try {
      const receiptResult = await sendPaymentReceipt(payment);

      receiptEmailSent = true;

      if (receiptResult?.receiptNumber) {
        receiptNumber = receiptResult.receiptNumber;
      }

      console.log(
        "Payment receipt sent to:",
        payment.studentEmail
      );
    } catch (emailError) {
      console.error(
        "Payment succeeded, but receipt email failed:",
        emailError
      );
    }

    const totalPaid = await getStudentPaidAmount(
      fee._id,
      student._id,
      billingMonth
    );

    const monthlyFee = Number(fee.monthlyFee || 0);

    const dueAmount = Math.max(
      monthlyFee - totalPaid,
      0
    );

    let status = "due";

    if (dueAmount <= 0) {
      status = "paid";
    } else if (totalPaid > 0) {
      status = "partial";
    }

    return res.status(200).json({
      message: "Payment verified successfully",
      payment: {
        id: payment._id,
        razorpayPaymentId: razorpay_payment_id,
        razorpayOrderId: razorpay_order_id,
        amount: paymentAmount,
        billingMonth,
        receiptNumber,
      },
      receiptEmailSent,
      summary: {
        total: monthlyFee,
        paid: totalPaid,
        due: dueAmount,
        status,
      },
    });
  } catch (error) {
    console.error("Verify Razorpay Payment Error:", error);

    return res.status(500).json({
      message: "Unable to verify payment",
    });
  }
};

module.exports = {
  createRazorpayOrder,
  verifyRazorpayPayment,
};
