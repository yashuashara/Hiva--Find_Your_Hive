// Transactional email (registration confirmations, cancellations).
//
// Email is optional: if SMTP is not configured, messages are skipped and the
// app works normally. Sending never blocks or fails the request that
// triggered it; failures are logged without the recipient's address.
const nodemailer = require("nodemailer");
const config = require("../config/env");

// In tests, messages are collected here instead of being sent.
const outbox = [];

let transporter = null;
function getTransporter() {
  if (transporter) return transporter;
  if (config.isTest) {
    transporter = nodemailer.createTransport({ jsonTransport: true });
  } else if (config.email.enabled) {
    transporter = nodemailer.createTransport({
      host: config.email.host,
      port: config.email.port,
      secure: config.email.secure,
      auth: config.email.user ? { user: config.email.user, pass: config.email.pass } : undefined,
    });
  }
  return transporter;
}

const escapeHtml = (s) =>
  String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

const fmtDate = (d) =>
  d
    ? new Intl.DateTimeFormat("en-IN", { dateStyle: "full", timeStyle: "short", timeZone: config.email.timeZone }).format(new Date(d))
    : "Date to be announced";

function layout(title, bodyHtml) {
  return `<!doctype html><html><body style="font-family:Arial,sans-serif;background:#f4f5f7;padding:24px;color:#111">
<div style="max-width:560px;margin:auto;background:#fff;border-radius:12px;padding:28px">
<h1 style="font-size:20px;margin:0 0 16px">${escapeHtml(title)}</h1>
${bodyHtml}
<p style="color:#666;font-size:12px;margin-top:28px">Event Engine &amp; Ticket Club · You received this because of activity on your account.</p>
</div></body></html>`;
}

// Fire-and-forget: returns immediately; the email goes out in the background.
function send({ to, subject, text, html }) {
  const t = getTransporter();
  if (!t || !to) return;
  const message = { from: config.email.from, to, subject, text, html };
  setImmediate(async () => {
    try {
      await t.sendMail(message);
      if (config.isTest) outbox.push(message);
    } catch (err) {
      console.error(`[email] failed to send "${subject}":`, err.message);
    }
  });
}

function sendRegistrationConfirmation(user, event, registration) {
  const ticketsUrl = `${config.appUrl}/tickets`;
  const when = fmtDate(event.startsAt);
  send({
    to: user.email,
    subject: `You're registered: ${event.title}`,
    text: [
      `Hi ${user.name},`,
      ``,
      `You're registered for ${event.title}.`,
      `When: ${when}`,
      `Where: ${event.venue}`,
      `Ticket ID: ${registration.ticketId}`,
      ``,
      `Show the QR code from My Tickets at the entrance: ${ticketsUrl}`,
    ].join("\n"),
    html: layout(
      `You're registered for ${event.title}`,
      `<p>Hi ${escapeHtml(user.name)},</p>
<p><strong>When:</strong> ${escapeHtml(when)}<br><strong>Where:</strong> ${escapeHtml(event.venue)}<br>
<strong>Ticket ID:</strong> <code>${escapeHtml(registration.ticketId)}</code></p>
<p>Show the QR code from <a href="${escapeHtml(ticketsUrl)}">My Tickets</a> at the entrance.</p>`
    ),
  });
}

function sendEventCancelled(user, event, reason) {
  send({
    to: user.email,
    subject: `Cancelled: ${event.title}`,
    text: `Hi ${user.name},\n\n${event.title} (${fmtDate(event.startsAt)}) has been cancelled by the organizers.${reason ? `\nReason: ${reason}` : ""}\n\nYour registration has been cancelled automatically.`,
    html: layout(
      `${event.title} has been cancelled`,
      `<p>Hi ${escapeHtml(user.name)},</p>
<p>${escapeHtml(event.title)} (${escapeHtml(fmtDate(event.startsAt))}) has been cancelled by the organizers.</p>
${reason ? `<p><strong>Reason:</strong> ${escapeHtml(reason)}</p>` : ""}
<p>Your registration has been cancelled automatically.</p>`
    ),
  });
}

module.exports = { sendRegistrationConfirmation, sendEventCancelled, escapeHtml, outbox };
