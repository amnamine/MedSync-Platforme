const nodemailer = require("nodemailer");

let transporter = null;

async function getTransporter() {
  if (transporter) return transporter;
  if (process.env.SMTP_HOST) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 587),
      secure: false,
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    });
  } else {
    const test = await nodemailer.createTestAccount();
    transporter = nodemailer.createTransport({
      host: "smtp.ethereal.email",
      port: 587,
      secure: false,
      auth: { user: test.user, pass: test.pass },
    });
  }
  return transporter;
}

async function sendMail({ to, subject, text }) {
  if (!to) return { ok: false, reason: "no-email" };
  try {
    const transport = await getTransporter();
    const info = await transport.sendMail({
      from: '"MedSync Platforme" <noreply@medsync.dz>',
      to,
      subject,
      text,
    });
    const preview = nodemailer.getTestMessageUrl(info);
    console.log(`[EMAIL] ${to} | ${subject}${preview ? ` | Preview: ${preview}` : ""}`);
    return { ok: true, preview };
  } catch (err) {
    console.log(`[EMAIL-FALLBACK] ${to} | ${subject} | ${text}`);
    return { ok: true, fallback: true, error: err.message };
  }
}

async function sendUrgenceAlert({ email, patient, niveau, symptome }) {
  return sendMail({
    to: email,
    subject: `[MedSync] Urgence ${niveau.toUpperCase()} – ${patient}`,
    text: `Alerte urgence ${niveau} pour le patient ${patient}.\nSymptôme: ${symptome}\nConnectez-vous à MedSync pour intervenir.`,
  });
}

module.exports = { sendMail, sendUrgenceAlert };
