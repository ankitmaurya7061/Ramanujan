const dns = require("node:dns");
const nodemailer = require("nodemailer");

// Prefer IPv4 in DNS lookups to prevent IPv6 ENETUNREACH in environments with limited IPv6 routes
try {
  dns.setDefaultResultOrder("ipv4first");
} catch {
  // Not available in older Node runtimes
}

/**
 * Centralized Email Service
 *
 * Primary: Resend HTTPS API (Port 443 - 100% reliable on Render, no SMTP port blocks)
 * Secondary: Brevo HTTPS API (Port 443)
 * Fallback: Nodemailer SMTP (Strictly IPv4 for local offline development)
 */

/**
 * Send email using Resend HTTPS API
 */
async function sendViaResend({ to, subject, text, html, attachments }) {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) {
    return null;
  }

  // Sender email / domain configured in Resend
  // Defaults to Resend's free test sender if EMAIL_FROM is not explicitly configured
  const from =
    process.env.EMAIL_FROM?.trim() ||
    process.env.RESEND_FROM?.trim() ||
    "The Winner Ramanujan Classes <onboarding@resend.dev>";

  const payload = {
    from,
    to: Array.isArray(to) ? to : [to],
    subject,
    text: text || "",
    html: html || undefined,
  };

  // Convert attachments to Resend format if provided
  if (attachments && Array.isArray(attachments) && attachments.length > 0) {
    payload.attachments = attachments.map((att) => ({
      filename: att.filename,
      content: Buffer.isBuffer(att.content)
        ? att.content.toString("base64")
        : Buffer.from(att.content).toString("base64"),
    }));
  }

  let response;
  try {
    response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(10000), // 10s timeout
    });
  } catch (netErr) {
    throw new Error(`Resend network/timeout error: ${netErr.message}`);
  }

  const responseText = await response.text();
  let responseData = {};
  try {
    responseData = responseText ? JSON.parse(responseText) : {};
  } catch {
    responseData = { raw: responseText };
  }

  if (!response.ok) {
    const errorMsg =
      responseData.message ||
      responseData.error ||
      responseData.name ||
      `HTTP status ${response.status}`;
    throw new Error(`Resend API Error (${response.status}): ${errorMsg}`);
  }

  return {
    success: true,
    provider: "resend",
    id: responseData.id,
  };
}

/**
 * Send email using Brevo HTTP API (Port 443 HTTPS)
 */
async function sendViaBrevo({ to, subject, text, html, attachments }) {
  const apiKey = process.env.BREVO_API_KEY?.trim();
  if (!apiKey) return null;

  const senderEmail =
    process.env.BREVO_SENDER_EMAIL?.trim() ||
    process.env.EMAIL_USER?.trim() ||
    "thewinnerramanujanclasses@gmail.com";

  const senderName =
    process.env.BREVO_SENDER_NAME?.trim() || "The Winner Ramanujan Classes";

  const payload = {
    sender: {
      name: senderName,
      email: senderEmail,
    },
    to: (Array.isArray(to) ? to : [to]).map((e) => ({ email: e })),
    subject,
    htmlContent: html,
    textContent: text,
  };

  if (attachments && Array.isArray(attachments) && attachments.length > 0) {
    payload.attachment = attachments.map((att) => ({
      name: att.filename,
      content: Buffer.isBuffer(att.content)
        ? att.content.toString("base64")
        : Buffer.from(att.content).toString("base64"),
    }));
  }

  let response;
  try {
    response = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        accept: "application/json",
        "api-key": apiKey,
        "content-type": "application/json",
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(10000),
    });
  } catch (netErr) {
    throw new Error(`Brevo network/timeout error: ${netErr.message}`);
  }

  const responseText = await response.text();
  let responseData = {};
  try {
    responseData = responseText ? JSON.parse(responseText) : {};
  } catch {
    responseData = { raw: responseText };
  }

  if (!response.ok) {
    throw new Error(
      `Brevo API Error (${response.status}): ${
        responseData.message || JSON.stringify(responseData)
      }`
    );
  }

  return { success: true, provider: "brevo", messageId: responseData.messageId };
}

// Cached SMTP transporters for offline / local testing
let smtpTransporter465 = null;
let smtpTransporter587 = null;

function getSmtpTransporter(port = 465) {
  const user = process.env.EMAIL_USER;
  const pass = process.env.EMAIL_PASS;
  if (!user || !pass) return null;

  if (port === 465) {
    if (!smtpTransporter465) {
      smtpTransporter465 = nodemailer.createTransport({
        host: "smtp.gmail.com",
        port: 465,
        secure: true,
        family: 4,
        auth: { user, pass },
        connectionTimeout: 8000,
        greetingTimeout: 8000,
        socketTimeout: 10000,
      });
    }
    return smtpTransporter465;
  }

  if (!smtpTransporter587) {
    smtpTransporter587 = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 587,
      secure: false,
      family: 4,
      auth: { user, pass },
      connectionTimeout: 8000,
      greetingTimeout: 8000,
      socketTimeout: 10000,
    });
  }
  return smtpTransporter587;
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

  try {
    const transporter465 = getSmtpTransporter(465);
    if (!transporter465) {
      throw new Error("SMTP credentials (EMAIL_USER / EMAIL_PASS) not configured.");
    }
    const info = await transporter465.sendMail(mailOptions);
    return { success: true, provider: "smtp (port 465, IPv4)", messageId: info.messageId };
  } catch (err465) {
    const transporter587 = getSmtpTransporter(587);
    if (!transporter587) {
      throw err465;
    }
    const info = await transporter587.sendMail(mailOptions);
    return { success: true, provider: "smtp (port 587, IPv4)", messageId: info.messageId };
  }
}

/**
 * Main email sender function with automatic priority & fallback
 *
 * 1. Resend HTTPS API (Recommended for Render)
 * 2. Brevo HTTPS API (Alternative HTTPS provider)
 * 3. Nodemailer SMTP (Local development fallback)
 */
async function sendEmail({ to, subject, text, html, attachments }) {
  const recipient = Array.isArray(to) ? to.join(", ") : to;
  const errors = [];

  // 1. Primary: Resend HTTPS API
  if (process.env.RESEND_API_KEY) {
    try {
      console.log(`[EmailService] Sending via Resend HTTPS API to ${recipient}...`);
      const result = await sendViaResend({ to, subject, text, html, attachments });
      if (result) {
        console.log(`[EmailService] Delivered via Resend (id: ${result.id})`);
        return result;
      }
    } catch (err) {
      console.error(`[EmailService] Resend delivery failed: ${err.message}`);
      errors.push(`Resend: ${err.message}`);
    }
  }

  // 2. Secondary: Brevo HTTPS API
  if (process.env.BREVO_API_KEY) {
    try {
      console.log(`[EmailService] Sending via Brevo HTTPS API to ${recipient}...`);
      const result = await sendViaBrevo({ to, subject, text, html, attachments });
      if (result) {
        console.log(`[EmailService] Delivered via Brevo (messageId: ${result.messageId})`);
        return result;
      }
    } catch (err) {
      console.error(`[EmailService] Brevo delivery failed: ${err.message}`);
      errors.push(`Brevo: ${err.message}`);
    }
  }

  // 3. Fallback: Nodemailer SMTP (for localhost or environments where SMTP is allowed)
  if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
    try {
      console.log(`[EmailService] Sending via SMTP (IPv4) to ${recipient}...`);
      const result = await sendViaSmtp({ to, subject, text, html, attachments });
      console.log(`[EmailService] Delivered via ${result.provider} (messageId: ${result.messageId})`);
      return result;
    } catch (err) {
      console.error(`[EmailService] SMTP delivery failed: ${err.message}`);
      errors.push(`SMTP: ${err.message}`);
    }
  }

  if (errors.length === 0) {
    errors.push(
      "No email provider configured. Please set RESEND_API_KEY and EMAIL_FROM in your environment variables."
    );
  }

  const finalError = new Error(`Email delivery failed: ${errors.join("; ")}`);
  finalError.details = errors;
  throw finalError;
}

module.exports = {
  sendEmail,
};
