const mongoose = require("mongoose");

const Fee = require("../models/Fee");
const Payment = require("../models/Payment");
const User = require("../models/User");

const ALLOWED_CLASSES = [
  6,
  7,
  8,
  9,
  10,
  11,
  12,
];

/*
====================================================
HELPERS
====================================================
*/

// Current month in YYYY-MM format
const getCurrentBillingMonth = () => {
  const now = new Date();

  const year = now.getFullYear();

  const month = String(
    now.getMonth() + 1
  ).padStart(2, "0");

  return `${year}-${month}`;
};

// Validate YYYY-MM
const isValidBillingMonth = (billingMonth) => {
  return /^\d{4}-(0[1-9]|1[0-2])$/.test(
    String(billingMonth)
  );
};

// Get month name
const getMonthName = (billingMonth) => {
  const [year, month] =
    String(billingMonth).split("-");

  const date = new Date(
    Number(year),
    Number(month) - 1,
    1
  );

  return date.toLocaleString("en-IN", {
    month: "long",
    year: "numeric",
  });
};

/*
====================================================
GET STUDENT PAID AMOUNT FOR ONE MONTH
====================================================
*/

const getStudentPaidAmount = async (
  feeId,
  studentId,
  billingMonth
) => {
  const result =
    await Payment.aggregate([
      {
        $match: {
          fee: new mongoose.Types.ObjectId(
            feeId
          ),

          student:
            new mongoose.Types.ObjectId(
              studentId
            ),

          billingMonth,

          status: "success",
        },
      },

      {
        $group: {
          _id: null,

          total: {
            $sum: "$amount",
          },
        },
      },
    ]);

  return result.length > 0
    ? Number(result[0].total)
    : 0;
};

/*
====================================================
GET TOTAL COLLECTED FROM PAYMENTS
====================================================

IMPORTANT:

This calculation does NOT depend on current users.

So if a student is deleted later,
their old payment still remains counted.
*/

const getClassCollectedAmount = async (
  feeId,
  classId,
  billingMonth
) => {
  const result =
    await Payment.aggregate([
      {
        $match: {
          fee: new mongoose.Types.ObjectId(
            feeId
          ),

          classId: Number(classId),

          billingMonth,

          status: "success",
        },
      },

      {
        $group: {
          _id: null,

          total: {
            $sum: "$amount",
          },
        },
      },
    ]);

  return result.length > 0
    ? Number(result[0].total)
    : 0;
};

/*
====================================================
BUILD MONTHLY STUDENT SUMMARY
====================================================
*/

const buildStudentSummary = async (
  fee,
  studentId,
  billingMonth
) => {
  const total = Number(
    fee.monthlyFee || 0
  );

  const paid =
    await getStudentPaidAmount(
      fee._id,
      studentId,
      billingMonth
    );

  const due = Math.max(
    total - paid,
    0
  );

  let status = "due";

  if (paid >= total && total > 0) {
    status = "paid";
  } else if (paid > 0) {
    status = "partial";
  }

  return {
    billingMonth,

    monthName:
      getMonthName(billingMonth),

    total,

    paid,

    due,

    status,
  };
};

/*
====================================================
ADMIN: CREATE / UPDATE CLASS MONTHLY FEE
====================================================
*/

const createOrUpdateFee = async (
  req,
  res
) => {
  try {
    const {
      classId,
      monthlyFee,
    } = req.body;

    const selectedClass =
      Number(classId);

    if (
      !ALLOWED_CLASSES.includes(
        selectedClass
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Class must be between 6 and 12",
      });
    }

    const monthly =
      Number(monthlyFee);

    if (
      !Number.isFinite(monthly) ||
      monthly <= 0
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Monthly fee must be greater than 0",
      });
    }

    const fee =
      await Fee.findOneAndUpdate(
        {
          classId: selectedClass,
        },

        {
          classId: selectedClass,
          monthlyFee: monthly,
          status: "active",
        },

        {
          new: true,
          upsert: true,
          runValidators: true,
          setDefaultsOnInsert: true,
        }
      );

    return res.status(200).json({
      success: true,

      message:
        `Class ${selectedClass} monthly fee saved successfully`,

      fee,
    });
  } catch (error) {
    console.error(
      "Create/Update Class Fee Error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Server error while saving class fee",
    });
  }
};

/*
====================================================
ADMIN: GET CLASS FEE
====================================================
*/

const getClassFee = async (
  req,
  res
) => {
  try {
    const selectedClass =
      Number(req.params.classId);

    if (
      !ALLOWED_CLASSES.includes(
        selectedClass
      )
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid class",
      });
    }

    const fee =
      await Fee.findOne({
        classId: selectedClass,
      });

    return res.status(200).json({
      success: true,
      fee: fee || null,
    });
  } catch (error) {
    console.error(
      "Get Class Fee Error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Server error while loading class fee",
    });
  }
};

/*
====================================================
ADMIN: GET ALL CLASS FEES
====================================================
*/

const getAllFees = async (
  req,
  res
) => {
  try {
    const { classId } =
      req.query;

    const filter = {};

    if (
      classId !== undefined
    ) {
      const selectedClass =
        Number(classId);

      if (
        !ALLOWED_CLASSES.includes(
          selectedClass
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid class",
        });
      }

      filter.classId =
        selectedClass;
    }

    const fees =
      await Fee.find(filter).sort({
        classId: 1,
      });

    return res.status(200).json({
      success: true,
      fees,
    });
  } catch (error) {
    console.error(
      "Get All Fees Error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Server error while loading fees",
    });
  }
};

/*
====================================================
ADMIN: GET CLASS STUDENTS
WITH MONTH-WISE FEE STATUS
====================================================

Example:

GET
/fees/class/7/students?billingMonth=2026-10
*/

const getClassStudentsFees =
  async (req, res) => {
    try {
      const selectedClass =
        Number(req.params.classId);

      if (
        !ALLOWED_CLASSES.includes(
          selectedClass
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid class",
        });
      }

      const billingMonth =
        req.query.billingMonth ||
        getCurrentBillingMonth();

      if (
        !isValidBillingMonth(
          billingMonth
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid billing month. Use YYYY-MM format.",
        });
      }

      const fee =
        await Fee.findOne({
          classId: selectedClass,
        });

      if (!fee) {
        return res.status(200).json({
          success: true,

          billingMonth,

          monthName:
            getMonthName(
              billingMonth
            ),

          fee: null,

          students: [],

          summary: {
            totalStudents: 0,
            paid: 0,
            partial: 0,
            due: 0,
            totalCollected: 0,
            totalDue: 0,
          },
        });
      }

      const students =
        await User.find({
          role: "user",
          classId: selectedClass,
        })
          .select(
            "name email classId profilePhoto"
          )
          .sort({
            name: 1,
          });

      const studentsWithFees =
        [];

      let paidCount = 0;
      let partialCount = 0;
      let dueCount = 0;

      let totalDue = 0;

      /*
      IMPORTANT:

      Do NOT calculate totalCollected
      from current students.

      We calculate it directly from
      Payment collection below.
      */

      for (
        const student of students
      ) {
        const summary =
          await buildStudentSummary(
            fee,
            student._id,
            billingMonth
          );

        if (
          summary.status ===
          "paid"
        ) {
          paidCount++;
        } else if (
          summary.status ===
          "partial"
        ) {
          partialCount++;
        } else {
          dueCount++;
        }

        totalDue +=
          summary.due;

        studentsWithFees.push({
          student,

          summary,
        });
      }

      /*
      ================================================
      TOTAL COLLECTED

      This comes directly from Payment collection.

      Therefore:

      Student exists    -> counted
      Student deleted   -> still counted
      ================================================
      */

      const totalCollected =
        await getClassCollectedAmount(
          fee._id,
          selectedClass,
          billingMonth
        );

      return res.status(200).json({
        success: true,

        billingMonth,

        monthName:
          getMonthName(
            billingMonth
          ),

        fee,

        summary: {
          totalStudents:
            students.length,

          paid: paidCount,

          partial:
            partialCount,

          due: dueCount,

          totalCollected,

          totalDue,
        },

        students:
          studentsWithFees,
      });
    } catch (error) {
      console.error(
        "Get Class Students Fees Error:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Server error while loading class students fees",
      });
    }
  };

/*
====================================================
ADMIN: GET ONE STUDENT FEE
MONTH-WISE
====================================================

Example:

GET
/fees/student/:studentId?billingMonth=2026-10
*/

const getStudentFee =
  async (req, res) => {
    try {
      const {
        studentId,
      } = req.params;

      const billingMonth =
        req.query.billingMonth ||
        getCurrentBillingMonth();

      if (
        !isValidBillingMonth(
          billingMonth
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid billing month. Use YYYY-MM format.",
        });
      }

      const student =
        await User.findOne({
          _id: studentId,
          role: "user",
        }).select(
          "name email classId profilePhoto"
        );

      if (!student) {
        return res.status(404).json({
          success: false,
          message:
            "Student not found",
        });
      }

      const fee =
        await Fee.findOne({
          classId:
            Number(student.classId),
        });

      if (!fee) {
        return res.status(200).json({
          success: true,

          student,

          billingMonth,

          monthName:
            getMonthName(
              billingMonth
            ),

          fee: null,

          payments: [],

          summary: {
            billingMonth,

            total: 0,
            paid: 0,
            due: 0,

            status: "due",
          },
        });
      }

      const summary =
        await buildStudentSummary(
          fee,
          student._id,
          billingMonth
        );

      const payments =
        await Payment.find({
          fee: fee._id,

          student:
            student._id,

          billingMonth,

          status: {
            $ne: "failed",
          },
        }).sort({
          paymentDate: -1,
        });

      return res.status(200).json({
        success: true,

        student,

        fee,

        billingMonth,

        monthName:
          getMonthName(
            billingMonth
          ),

        payments,

        summary,
      });
    } catch (error) {
      console.error(
        "Get Student Fee Error:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Server error while loading student fee",
      });
    }
  };

/*
====================================================
STUDENT: GET MY FEE
MONTH-WISE
====================================================
*/

const getMyFee = async (
  req,
  res
) => {
  try {
    if (
      req.user.role !== "user"
    ) {
      return res.status(403).json({
        success: false,
        message:
          "Student access only",
      });
    }

    const studentClass =
      Number(req.user.classId);

    if (
      !ALLOWED_CLASSES.includes(
        studentClass
      )
    ) {
      return res.status(403).json({
        success: false,
        message:
          "Student class is not assigned",
      });
    }

    const billingMonth =
      req.query.billingMonth ||
      getCurrentBillingMonth();

    if (
      !isValidBillingMonth(
        billingMonth
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid billing month. Use YYYY-MM format.",
      });
    }

    const fee =
      await Fee.findOne({
        classId: studentClass,
      });

    if (!fee) {
      return res.status(200).json({
        success: true,

        billingMonth,

        monthName:
          getMonthName(
            billingMonth
          ),

        fee: null,

        payments: [],

        summary: {
          billingMonth,

          total: 0,
          paid: 0,
          due: 0,

          status: "due",
        },
      });
    }

    const summary =
      await buildStudentSummary(
        fee,
        req.user._id,
        billingMonth
      );

    const payments =
      await Payment.find({
        fee: fee._id,

        student:
          req.user._id,

        billingMonth,

        status: {
          $ne: "failed",
        },
      }).sort({
        paymentDate: -1,
      });

    return res.status(200).json({
      success: true,

      billingMonth,

      monthName:
        getMonthName(
          billingMonth
        ),

      fee,

      payments,

      summary,
    });
  } catch (error) {
    console.error(
      "Get My Fee Error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Server error while loading your fee",
    });
  }
};

/*
====================================================
ADMIN: ADD OFFLINE PAYMENT
====================================================

Body:

{
  studentId,
  amount,
  billingMonth,
  mode,
  paymentDate,
  reference,
  note
}
*/

const addOfflinePayment =
  async (req, res) => {
    try {
      const {
        studentId,
        amount,
        billingMonth,
        mode,
        paymentDate,
        reference,
        note,
      } = req.body;

      if (
        !studentId ||
        amount === undefined ||
        !mode ||
        !billingMonth
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Student, amount, billing month and payment mode are required",
        });
      }

      if (
        !isValidBillingMonth(
          billingMonth
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid billing month. Use YYYY-MM format.",
        });
      }

      const allowedModes = [
        "cash",
        "upi",
        "bank",
        "cheque",
      ];

      if (
        !allowedModes.includes(
          mode
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid offline payment mode",
        });
      }

      const paymentAmount =
        Number(amount);

      if (
        !Number.isFinite(
          paymentAmount
        ) ||
        paymentAmount <= 0
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid payment amount",
        });
      }

      const student =
        await User.findOne({
          _id: studentId,
          role: "user",
        });

      if (!student) {
        return res.status(404).json({
          success: false,
          message:
            "Student not found",
        });
      }

      const fee =
        await Fee.findOne({
          classId:
            Number(student.classId),
        });

      if (!fee) {
        return res.status(404).json({
          success: false,
          message:
            "Fee is not configured for this class",
        });
      }

      const total =
        Number(
          fee.monthlyFee || 0
        );

      const paid =
        await getStudentPaidAmount(
          fee._id,
          student._id,
          billingMonth
        );

      const due = Math.max(
        total - paid,
        0
      );

      if (due <= 0) {
        return res.status(400).json({
          success: false,
          message:
            `This month's fee is already fully paid`,
        });
      }

      if (
        paymentAmount > due
      ) {
        return res.status(400).json({
          success: false,
          message:
            `Payment cannot exceed due amount of ₹${due}`,
        });
      }

      /*
      ================================================
      CREATE PAYMENT

      IMPORTANT:

      Save studentName and studentEmail as
      historical snapshot data.

      Even if the User is deleted later,
      payment still contains the student's
      name/email.
      ================================================
      */

      const payment =
        await Payment.create({
          fee: fee._id,

          student:
            student._id,

          studentName:
            student.name,

          studentEmail:
            student.email,

          classId:
            Number(
              student.classId
            ),

          billingMonth,

          amount:
            paymentAmount,

          mode,

          paymentDate:
            paymentDate ||
            new Date(),

          reference:
            reference || "",

          note:
            note || "",

          status: "success",

          addedBy: null,
        });

      const newPaid =
        paid + paymentAmount;

      const newDue =
        Math.max(
          total - newPaid,
          0
        );

      let status = "due";

      if (
        newPaid >= total
      ) {
        status = "paid";
      } else if (
        newPaid > 0
      ) {
        status = "partial";
      }

      return res.status(201).json({
        success: true,

        message:
          "Offline payment recorded successfully",

        payment,

        summary: {
          billingMonth,

          monthName:
            getMonthName(
              billingMonth
            ),

          total,

          paid: newPaid,

          due: newDue,

          status,
        },
      });
    } catch (error) {
      console.error(
        "Offline Payment Error:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Server error while recording payment",
      });
    }
  };

/*
====================================================
EXPORTS
====================================================
*/

module.exports = {
  createOrUpdateFee,
  getClassFee,
  getAllFees,
  getClassStudentsFees,
  getStudentFee,
  getMyFee,
  addOfflinePayment,
};