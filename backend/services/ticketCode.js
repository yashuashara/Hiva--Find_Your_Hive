// What goes inside a ticket's QR code.
//
// The QR holds only "HIVA:<ticketId>". No names, PRNs or emails, so a
// photographed ticket reveals nothing personal. The ticket ID is 128 bits of
// randomness, so it cannot be guessed; every scan is still verified by the
// server (exists, right event, not cancelled, not already used).
const PREFIX = "HIVA:";
// Tickets issued before the rename carry this prefix and must keep scanning.
const LEGACY_PREFIXES = ["EETKT:"];
const TICKET_ID = /^[A-Za-z0-9_-]{3,60}$/;

const encodeTicket = (ticketId) => `${PREFIX}${ticketId}`;

// Accepts the raw QR text, or a ticket ID typed in by hand.
// Returns the ticket ID, or null if the input is not a ticket at all.
function parseTicketCode(raw) {
  if (typeof raw !== "string") return null;
  let value = raw.trim();
  const prefix = [PREFIX, ...LEGACY_PREFIXES].find((p) => value.toUpperCase().startsWith(p));
  if (prefix) value = value.slice(prefix.length).trim();
  return TICKET_ID.test(value) ? value : null;
}

module.exports = { PREFIX, LEGACY_PREFIXES, encodeTicket, parseTicketCode };
