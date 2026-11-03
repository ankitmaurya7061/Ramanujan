
const nodemailer = require("nodemailer");

const Fee = require("../models/Fee");
const Payment = require("../models/Payment");

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

const escapeHtml = (value = "") =>
  String(value).replace(/[&<>"']/g, (character) => {
    const entities = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    };

    return entities[character];
  });

const formatINR = (amount) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(amount || 0));

const formatBillingMonth = (billingMonth) => {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(String(billingMonth || ""))) {
    return String(billingMonth || "N/A");
  }

  const [year, month] = billingMonth.split("-");

  return new Date(Number(year), Number(month) - 1, 1).toLocaleDateString(
    "en-IN",
    {
      month: "long",
      year: "numeric",
      timeZone: "Asia/Kolkata",
    }
  );
};

const formatPaymentDate = (date) => {
  const parsedDate = date ? new Date(date) : new Date();

  return parsedDate.toLocaleString("en-IN", {
    dateStyle: "long",
    timeStyle: "short",
    timeZone: "Asia/Kolkata",
  });
};

const buildReceiptHtml = ({
  receiptNumber,
  studentName,
  studentEmail,
  classId,
  billingMonth,
  paymentDate,
  transactionId,
  orderId,
  amountPaid,
  monthlyFee,
  totalPaid,
  remainingBalance,
  contactEmail,
  contactPhone,
  instituteAddress,
}) => {
  const rows = [
    ["Student name", studentName],
    ["Registered email", studentEmail || "Not provided"],
    ["Class", classId ? `Class ${classId}` : "Not provided"],
    ["Fee month", formatBillingMonth(billingMonth)],
    ["Payment date", formatPaymentDate(paymentDate)],
    ["Payment method", "Razorpay · Online"],
    ["Transaction ID", transactionId],
    ["Order ID", orderId || "Not available"],
    ["Payment status", "Successful"],
  ];

  const detailRows = rows
    .map(
      ([label, value]) => `
        <tr>
          <td class="label">${escapeHtml(label)}</td>
          <td class="value">${escapeHtml(value)}</td>
        </tr>`
    )
    .join("");

  const contactLines = [
    contactEmail ? `Email: ${escapeHtml(contactEmail)}` : "",
    contactPhone ? `Phone: ${escapeHtml(contactPhone)}` : "",
    instituteAddress ? escapeHtml(instituteAddress) : "",
  ]
    .filter(Boolean)
    .join("<br />");

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Official Fee Receipt - ${escapeHtml(receiptNumber)}</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      background: #f3f5f3;
      color: #1f2937;
      font-family: Arial, Helvetica, sans-serif;
    }
    .outer { width: 100%; padding: 28px 10px; box-sizing: border-box; }
    .receipt {
      max-width: 640px; margin: 0 auto; background: #fff;
      border: 1px solid #e2e8e4; border-radius: 14px; overflow: hidden;
    }
    .header { background: #004741; color: #fff; padding: 30px 28px; }
    .brand { margin: 0; font-size: 22px; font-weight: 800; letter-spacing: 1px; }
    .brand-sub { margin-top: 5px; color: #dbe9e4; font-size: 12px; letter-spacing: 1.5px; }
    .eyebrow { margin-top: 26px; color: #dbe9e4; font-size: 11px; letter-spacing: 1.7px; }
    h1 { margin: 9px 0 0; font-size: 26px; line-height: 1.3; }
    .header-copy { margin: 9px 0 0; color: #e5efeb; font-size: 13px; line-height: 1.7; }
    .content { padding: 28px; }
    .success {
      display: inline-block; background: #e6f5ec; color: #166534;
      border: 1px solid #b9e4c8; border-radius: 20px;
      padding: 7px 12px; font-size: 11px; font-weight: 700; letter-spacing: .5px;
    }
    .amount-label { margin-top: 22px; color: #64748b; font-size: 11px; letter-spacing: 1.3px; }
    .amount { margin-top: 7px; color: #004741; font-size: 34px; font-weight: 800; overflow-wrap: anywhere; }
    .receipt-no { margin-top: 8px; color: #64748b; font-size: 12px; overflow-wrap: anywhere; }
    h2 { margin: 28px 0 12px; color: #004741; font-size: 15px; }
    table { width: 100%; border-collapse: collapse; }
    td { padding: 12px 0; border-bottom: 1px solid #edf0ed; font-size: 13px; line-height: 1.5; vertical-align: top; overflow-wrap: anywhere; }
    td.label { width: 43%; color: #64748b; padding-right: 12px; }
    td.value { color: #1f2937; font-weight: 600; text-align: right; }
    .summary { margin-top: 24px; padding: 17px; background: #f7f7f1; border: 1px solid #e7e6d9; border-radius: 10px; }
    .summary-row { display: flex; justify-content: space-between; gap: 14px; padding: 8px 0; font-size: 13px; }
    .summary-row span:first-child { color: #64748b; }
    .summary-row span:last-child { text-align: right; font-weight: 700; }
    .balance { color: #004741; font-size: 16px; font-weight: 800; }
    .note { margin-top: 24px; color: #64748b; font-size: 12px; line-height: 1.7; }
    .footer { padding: 20px 28px; background: #f8f8f3; border-top: 1px solid #e7e9e2; color: #64748b; font-size: 11px; line-height: 1.8; text-align: center; overflow-wrap: anywhere; }
    .footer strong { color: #004741; }
    @media print {
      body, .outer { background: #fff; padding: 0; }
      .receipt { max-width: none; border: 1px solid #bbb; border-radius: 0; }
      .header { background: #fff !important; color: #004741 !important; border-bottom: 2px solid #004741; }
      .brand, .brand-sub, .eyebrow, h1, .header-copy { color: #004741 !important; }
      .summary { background: #fff; }
    }
  </style>
</head>
<body>
  <div class="outer">
    <main class="receipt">
      <header class="header">
        <p class="brand">THE WINNER</p>
        <div class="brand-sub">RAMANUJAN CLASSES</div>
        <div class="eyebrow">OFFICIAL FEE RECEIPT · STUDYPOINT</div>
        <h1>Payment Successful</h1>
        <p class="header-copy">
          Your payment has been verified and recorded successfully.
          Please keep this receipt for your records.
        </p>
      </header>
      <section class="content">
        <span class="success">&#10003; PAYMENT CONFIRMED</span>
        <div class="amount-label">AMOUNT RECEIVED</div>
        <div class="amount">${escapeHtml(formatINR(amountPaid))}</div>
        <div class="receipt-no">Receipt No: ${escapeHtml(receiptNumber)}</div>

        <h2>Student &amp; Payment Details</h2>
        <table role="presentation">${detailRows}</table>

        <h2>Fee Summary</h2>
        <div class="summary">
          <div class="summary-row"><span>Monthly fee</span><span>${escapeHtml(formatINR(monthlyFee))}</span></div>
          <div class="summary-row"><span>Total paid for this month</span><span>${escapeHtml(formatINR(totalPaid))}</span></div>
          <div class="summary-row"><span>Remaining balance</span><span class="balance">${escapeHtml(formatINR(remainingBalance))}</span></div>
        </div>

        <p class="note">
          This is a computer-generated receipt for the successful online fee payment
          recorded by The Winner Ramanujan Classes. No physical signature is required.
          You can print this email using your email app's Print option.
        </p>
      </section>
      <footer class="footer">
        <strong>The Winner Ramanujan Classes</strong><br />
        Powered by StudyPoint<br />
        ${contactLines || "For assistance, contact the institute administration."}
        <br />Please retain this receipt for your records.
      </footer>
    </main>
  </div>
</body>
</html>`;
};

const buildReceiptText = ({
  receiptNumber,
  studentName,
  studentEmail,
  classId,
  billingMonth,
  paymentDate,
  transactionId,
  orderId,
  amountPaid,
  monthlyFee,
  totalPaid,
  remainingBalance,
  contactEmail,
  contactPhone,
  instituteAddress,
}) =>
  [
    "THE WINNER RAMANUJAN CLASSES",
    "OFFICIAL FEE RECEIPT · STUDYPOINT",
    "PAYMENT SUCCESSFUL",
    "",
    `Receipt Number: ${receiptNumber}`,
    `Student: ${studentName}`,
    `Email: ${studentEmail || "Not provided"}`,
    `Class: ${classId ? `Class ${classId}` : "Not provided"}`,
    `Fee Month: ${formatBillingMonth(billingMonth)}`,
    `Payment Date: ${formatPaymentDate(paymentDate)}`,
    "Payment Method: Razorpay · Online",
    `Transaction ID: ${transactionId}`,
    `Order ID: ${orderId || "Not available"}`,
    "",
    `Amount Paid: ${formatINR(amountPaid)}`,
    `Monthly Fee: ${formatINR(monthlyFee)}`,
    `Total Paid This Month: ${formatINR(totalPaid)}`,
    `Remaining Balance: ${formatINR(remainingBalance)}`,
    "",
    "This is a computer-generated fee receipt.",
    contactEmail ? `Contact email: ${contactEmail}` : "",
    contactPhone ? `Contact phone: ${contactPhone}` : "",
    instituteAddress || "",
  ]
    .filter(Boolean)
    .join("\n");

const sendPaymentReceipt = async (payment) => {
  if (!payment) {
    throw new Error("Payment data is required to send a receipt.");
  }

  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    throw new Error("EMAIL_USER or EMAIL_PASS is not configured.");
  }

  const recipient = String(payment.studentEmail || "").trim();

  if (!recipient) {
    throw new Error("Student email is missing; receipt cannot be sent.");
  }

  const receiptNumber = `WRRC-${String(payment._id)}`;
  const fee = await Fee.findById(payment.fee).select("monthlyFee classId");

  if (!fee) {
    throw new Error("Fee configuration for this payment was not found.");
  }

  const aggregation = await Payment.aggregate([
    {
      $match: {
        fee: payment.fee,
        student: payment.student,
        billingMonth: payment.billingMonth,
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

  const totalPaid = Number(aggregation[0]?.total || 0);
  const monthlyFee = Number(fee.monthlyFee || 0);
  const remainingBalance = Math.max(monthlyFee - totalPaid, 0);

  const orderIdMatch = String(payment.note || "").match(
    /Razorpay Order:\s*(\S+)/
  );
  const orderId = orderIdMatch ? orderIdMatch[1] : "";

  const receiptData = {
    receiptNumber,
    studentName: payment.studentName || "Student",
    studentEmail: recipient,
    classId: payment.classId || fee.classId,
    billingMonth: payment.billingMonth,
    paymentDate: payment.paymentDate || new Date(),
    transactionId: payment.reference || "Not available",
    orderId,
    amountPaid: Number(payment.amount || 0),
    monthlyFee,
    totalPaid,
    remainingBalance,
    contactEmail: process.env.INSTITUTE_CONTACT_EMAIL || process.env.EMAIL_USER,
    contactPhone: process.env.INSTITUTE_PHONE || "",
    instituteAddress: process.env.INSTITUTE_ADDRESS || "",
  };

  const html = buildReceiptHtml(receiptData);
  const text = buildReceiptText(receiptData);

  await transporter.sendMail({
    from: {
      name: "The Winner Ramanujan Classes",
      address: process.env.EMAIL_USER,
    },
    to: recipient,
    subject: `Fee Payment Receipt | ${receiptNumber}`,
    text,
    html,
  });

  return {
    receiptNumber,
    sentTo: recipient,
  };
};

module.exports = {
  sendPaymentReceipt,
};
