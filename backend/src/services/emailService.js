const nodemailer = require("nodemailer");

/**
 * Multi-provider Email Service
 * Supports:
 * 1. Brevo (Sendinblue) HTTP REST API via HTTPS (Port 443 - works on Render Free Tier!)
 * 2. Resend HTTP REST API via HTTPS (Port 443 - works on Render Free Tier!)
 * 3. Nodemailer SMTP (Gmail / Custom SMTP) - for local development, VPS, or paid tiers
 */

// Cached SMTP transporter
let smtpTransporter = null;

function getSmtpTransporter() {
  if (!smtpTransporter) {
    const user = process.env.EMAIL_USER;
    const pass = process.env.EMAIL_PASS;

    if (!user || !pass) {
      return null;
    }

    smtpTransporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user,
        pass,
      },
      connectionTimeout: 8000,
      greetingTimeout: 8000,
      socketTimeout: 10000,
    });
  }

  return smtpTransporter;
}

/**
 * Send email using Brevo HTTP API (Port 443 HTTPS)
 */
async function sendViaBrevo({ to, subject, text, html, attachments }) {
  const apiKey = process.env.BREVO_API_KEY;
  if (!apiKey) return null;

  const senderEmail =
    process.env.BREVO_SENDER_EMAIL ||
    process.env.EMAIL_USER ||
    "thewinnerramanujanclasses@gmail.com";

  const senderName =
    process.env.BREVO_SENDER_NAME || "The Winner Ramanujan Classes";

  const payload = {
    sender: {
      name: senderName,
      email: senderEmail,
    },
    to: [{ email: to }],
    subject,
    htmlContent: html,
    textContent: text,
  };

  if (attachments && Array.isArray(attachments)) {
    payload.attachment = attachments.map((att) => ({
      name: att.filename,
      content: Buffer.isBuffer(att.content)
        ? att.content.toString("base64")
        : Buffer.from(att.content).toString("base64"),
    }));
  }

  const response = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: {
      accept: "application/json",
      "api-key": apiKey.trim(),
      "content-type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const responseData = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(
      `Brevo API Error (${response.status}): ${
        responseData.message || JSON.stringify(responseData)
      }`
    );
  }

  return { success: true, provider: "brevo", messageId: responseData.messageId };
}

/**
 * Send email using Resend HTTP API (Port 443 HTTPS)
 */
async function sendViaResend({ to, subject, text, html }) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return null;

  const from =
    process.env.RESEND_FROM ||
    `The Winner Ramanujan Classes <onboarding@resend.dev>`;

  const payload = {
    from,
    to: [to],
    subject,
    text,
    html,
  };

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey.trim()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const responseData = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(
      `Resend API Error (${response.status}): ${
        responseData.message || JSON.stringify(responseData)
      }`
    );
  }

  return { success: true, provider: "resend", id: responseData.id };
}

/**
 * Send email using Nodemailer SMTP
 */
async function sendViaSmtp({ to, subject, text, html, attachments }) {
  const transporter = getSmtpTransporter();
  if (!transporter) {
    throw new Error("SMTP credentials (EMAIL_USER / EMAIL_PASS) not configured.");
  }

  const mailOptions = {
    from: `"The Winner Ramanujan Classes" <${process.env.EMAIL_USER}>`,
    to,
    subject,
    text,
    html,
  };

  if (attachments && Array.isArray(attachments)) {
    mailOptions.attachments = attachments;
  }

  const info = await transporter.sendMail(mailOptions);
  return { success: true, provider: "smtp", messageId: info.messageId };
}

/**
 * Main email sender with automated fallback
 */
async function sendEmail({ to, subject, text, html, attachments }) {
  const errors = [];

  // 1. Try Brevo HTTP API first if BREVO_API_KEY is configured
  if (process.env.BREVO_API_KEY) {
    try {
      console.log(`[EmailService] Attempting delivery via Brevo HTTP API to ${to}...`);
      const result = await sendViaBrevo({ to, subject, text, html, attachments });
      if (result) {
        console.log(`[EmailService] Delivered via Brevo (messageId: ${result.messageId})`);
        return result;
      }
    } catch (err) {
      console.error("[EmailService] Brevo HTTP API delivery failed:", err.message);
      errors.push(`Brevo: ${err.message}`);
    }
  }

  // 2. Try Resend HTTP API if RESEND_API_KEY is configured
  if (process.env.RESEND_API_KEY) {
    try {
      console.log(`[EmailService] Attempting delivery via Resend HTTP API to ${to}...`);
      const result = await sendViaResend({ to, subject, text, html });
      if (result) {
        console.log(`[EmailService] Delivered via Resend (id: ${result.id})`);
        return result;
      }
    } catch (err) {
      console.error("[EmailService] Resend HTTP API delivery failed:", err.message);
      errors.push(`Resend: ${err.message}`);
    }
  }

  // 3. Try Nodemailer SMTP
  if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
    try {
      console.log(`[EmailService] Attempting delivery via SMTP to ${to}...`);
      const result = await sendViaSmtp({ to, subject, text, html, attachments });
      console.log(`[EmailService] Delivered via SMTP (messageId: ${result.messageId})`);
      return result;
    } catch (err) {
      console.error("[EmailService] SMTP delivery failed:", err.message);
      errors.push(`SMTP: ${err.message}`);
    }
  } else {
    errors.push("No email credentials configured (EMAIL_USER/EMAIL_PASS, BREVO_API_KEY, or RESEND_API_KEY).");
  }

  const finalError = new Error(
    `All email delivery methods failed: ${errors.join("; ")}`
  );
  finalError.details = errors;
  throw finalError;
}

module.exports = {
  sendEmail,
};
