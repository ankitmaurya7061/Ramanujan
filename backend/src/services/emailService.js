const nodemailer = require("nodemailer");
const dns = require("node:dns");

// Force IPv4 as default result order in Node.js DNS resolution.
// This prevents ENETUNREACH errors on networks without working IPv6 routes.
try {
  dns.setDefaultResultOrder("ipv4first");
} catch {
  // Ignore in environments where setDefaultResultOrder is unavailable
}

/**
 * Multi-provider Email Service
 * Supports:
 * 1. Brevo (Sendinblue) HTTP REST API via HTTPS (Port 443 - works on Render Free Tier!)
 * 2. Resend HTTP REST API via HTTPS (Port 443 - works on Render Free Tier!)
 * 3. Nodemailer SMTP (Gmail / Custom SMTP) - for local development, VPS, or paid tiers
 */

// Cached SMTP transporters (strictly IPv4)
let smtpTransporter465 = null;
let smtpTransporter587 = null;

function getSmtpTransporter(port = 465) {
  const user = process.env.EMAIL_USER;
  const pass = process.env.EMAIL_PASS;

  if (!user || !pass) {
    return null;
  }

  if (port === 465) {
    if (!smtpTransporter465) {
      smtpTransporter465 = nodemailer.createTransport({
        host: "smtp.gmail.com",
        port: 465,
        secure: true,
        family: 4, // Strictly force IPv4 to avoid IPv6 ENETUNREACH
        auth: {
          user,
          pass,
        },
        connectionTimeout: 10000,
        greetingTimeout: 10000,
        socketTimeout: 15000,
      });
    }
    return smtpTransporter465;
  }

  if (!smtpTransporter587) {
    smtpTransporter587 = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 587,
      secure: false,
      family: 4, // Strictly force IPv4
      auth: {
        user,
        pass,
      },
      connectionTimeout: 10000,
      greetingTimeout: 10000,
      socketTimeout: 15000,
    });
  }

  return smtpTransporter587;
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
 * Send email using Nodemailer SMTP (Strictly IPv4)
 */
async function sendViaSmtp({ to, subject, text, html, attachments }) {
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

  // 1. Try port 465 (SSL IPv4)
  try {
    const transporter465 = getSmtpTransporter(465);
    if (!transporter465) {
      throw new Error("SMTP credentials (EMAIL_USER / EMAIL_PASS) not configured.");
    }
    const info = await transporter465.sendMail(mailOptions);
    return { success: true, provider: "smtp (port 465, IPv4)", messageId: info.messageId };
  } catch (err465) {
    console.warn(`[EmailService] SMTP port 465 failed: ${err465.message}. Retrying via port 587 IPv4...`);

    // 2. Fallback to port 587 (STARTTLS IPv4)
    const transporter587 = getSmtpTransporter(587);
    if (!transporter587) {
      throw err465;
    }
    const info = await transporter587.sendMail(mailOptions);
    return { success: true, provider: "smtp (port 587, IPv4)", messageId: info.messageId };
  }
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

  // 3. Try Nodemailer SMTP (Strictly IPv4)
  if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
    try {
      console.log(`[EmailService] Attempting delivery via SMTP (IPv4) to ${to}...`);
      const result = await sendViaSmtp({ to, subject, text, html, attachments });
      console.log(`[EmailService] Delivered via ${result.provider} (messageId: ${result.messageId})`);
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
