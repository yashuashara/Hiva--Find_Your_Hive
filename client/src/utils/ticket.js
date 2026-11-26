// Ticket QR codes and PDF tickets, generated in the browser.
//
// The QR holds only "HIVA:<ticketId>": no name, PRN or email. The ticket ID
// is random and unguessable, and the server verifies every scan.
import QRCode from "qrcode";
import { formatDateRange } from "./format";

export const encodeTicket = (ticketId) => `HIVA:${ticketId}`;

// High error correction so a scratched phone screen or printout still scans.
export const ticketQrDataUrl = (ticketId, size = 320) =>
  QRCode.toDataURL(encodeTicket(ticketId), { errorCorrectionLevel: "H", margin: 2, width: size });

// Builds and downloads an A6 PDF ticket. jsPDF is loaded only when needed so
// it does not slow down the rest of the app.
export async function downloadTicketPdf(ticket) {
  const [{ jsPDF }, qr] = await Promise.all([import("jspdf"), ticketQrDataUrl(ticket.ticketId, 600)]);
  const ev = ticket.event || {};
  const doc = new jsPDF({ unit: "mm", format: "a6", compress: true }); // 105 x 148 mm
  const W = 105;
  const margin = 8;
  // The built-in PDF fonts only cover basic Latin, so replace the special
  // spaces/dashes that Intl date formatting produces.
  const clean = (text) =>
    String(text || "")
      .replace(/[   ]/g, " ")
      .replace(/[–—]/g, "-")
      .replace(/[^\x20-\x7E]/g, "");
  const wrap = (text, width) => doc.splitTextToSize(clean(text), width);

  doc.setFillColor(79, 70, 229);
  doc.rect(0, 0, W, 16, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("HIVA - TICKET", margin, 10);

  doc.setTextColor(17, 24, 39);
  doc.setFontSize(14);
  const titleLines = wrap(ev.title || "Event", W - margin * 2).slice(0, 2);
  doc.text(titleLines, margin, 25);

  let y = 25 + titleLines.length * 6 + 2;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  const rows = [
    ["Attendee", `${ticket.studentName} (${ticket.studentId})`],
    ["When", formatDateRange(ev.startsAt, ev.endsAt)],
    ["Where", ev.venue],
    ["Organizer", ev.organizerClub],
  ];
  for (const [label, value] of rows) {
    doc.setTextColor(107, 114, 128);
    doc.text(label.toUpperCase(), margin, y);
    doc.setTextColor(17, 24, 39);
    const lines = wrap(value, W - margin * 2 - 22).slice(0, 2);
    doc.text(lines, margin + 22, y);
    y += lines.length * 4.5 + 1.5;
  }

  const qrSize = 58;
  doc.addImage(qr, "PNG", (W - qrSize) / 2, y + 2, qrSize, qrSize, undefined, "FAST");
  y += qrSize + 7;
  doc.setFont("courier", "normal");
  doc.setFontSize(7.5);
  doc.text(ticket.ticketId, W / 2, y, { align: "center" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(107, 114, 128);
  doc.text(wrap("Show this QR code at the entrance. Each ticket works only once.", W - margin * 2), W / 2, 140, {
    align: "center",
  });

  const safeTitle = String(ev.title || "event").replace(/[^A-Za-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40);
  doc.save(`ticket-${safeTitle || "event"}.pdf`);
}
