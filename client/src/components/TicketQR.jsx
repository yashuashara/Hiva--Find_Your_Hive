import { useEffect, useState } from "react";
import { ticketQrDataUrl } from "../utils/ticket";

// Renders a ticket's QR code as an image.
const TicketQR = ({ ticketId, size = 260 }) => {
  const [src, setSrc] = useState("");
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let alive = true;
    ticketQrDataUrl(ticketId, size * 2)
      .then((url) => alive && setSrc(url))
      .catch(() => alive && setFailed(true));
    return () => {
      alive = false;
    };
  }, [ticketId, size]);

  if (failed) return <p className="muted">Couldn't draw the QR code. Show your ticket ID instead.</p>;
  if (!src) return <div className="qr-placeholder" style={{ width: size, height: size }} aria-hidden="true" />;
  return <img src={src} width={size} height={size} className="ticket-qr" alt={`QR code for ticket ${ticketId}`} />;
};

export default TicketQR;
