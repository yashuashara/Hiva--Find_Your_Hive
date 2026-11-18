import { useState } from "react";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";
import { myRegistrations, cancelMyRegistration, errorMessage } from "../services/api";
import PageHeader from "../components/PageHeader";
import EmptyState from "../components/EmptyState";
import StatusBadge from "../components/StatusBadge";
import Tabs from "../components/Tabs";
import { SkeletonTable } from "../components/Skeleton";
import useAsyncData from "../hooks/useAsyncData";
import useUrlFilters from "../hooks/useUrlFilters";
import { AnimatedList } from "../lib/motion";
import { formatDateRange } from "../utils/format";
import TicketQR from "../components/TicketQR";
import { downloadTicketPdf } from "../utils/ticket";
import { HiOutlineCalendar, HiOutlineLocationMarker, HiOutlineQrcode, HiOutlineDownload } from "react-icons/hi";

const CANCEL_REASON = {
  student: "You cancelled this registration",
  organizer: "Cancelled by the organizers",
  event_cancelled: "The event was cancelled",
};

const TABS = [["upcoming", "Upcoming"], ["past", "Past & cancelled"]];
const DEFAULTS = { tab: "upcoming" };

// Same rule the server uses for ?when=upcoming: a confirmed ticket for a
// published event that hasn't ended. Everything else is "past & cancelled".
const isUpcoming = (t, now) =>
  t.status === "confirmed" && t.event?.status === "published" && (!t.event.endsAt || new Date(t.event.endsAt) >= now);

const MyTickets = () => {
  const [filters, setFilters] = useUrlFilters(DEFAULTS);
  const when = filters.tab;
  const [openTicket, setOpenTicket] = useState(null);

  // All tickets are loaded once; switching tabs filters them here instead of
  // asking the server again, so tabs switch instantly.
  const { data, error, initialLoading, refreshing, reload: load } = useAsyncData(
    () => myRegistrations("all").then((res) => res.data.data),
    "all"
  );
  const now = new Date();
  const tickets = (data || []).filter((t) => (when === "upcoming" ? isUpcoming(t, now) : !isUpcoming(t, now)));

  const cancel = async (t) => {
    if (!window.confirm(`Cancel your registration for ${t.event?.title}?`)) return;
    try {
      await cancelMyRegistration(t.ticketId);
      toast.success("Registration cancelled");
      load();
    } catch (err) {
      toast.error(errorMessage(err));
    }
  };

  const downloadPdf = async (t) => {
    try {
      await downloadTicketPdf(t);
    } catch {
      toast.error("Couldn't create the PDF. Please try again.");
    }
  };

  const renderTicket = (t) => {
    const ev = t.event;
    const canCancel = t.status === "confirmed" && !t.checkInStatus && ev && (!ev.startsAt || now < new Date(ev.startsAt)) && ev.status === "published";
    return (
      <article className={`ticket ${t.status === "cancelled" ? "ticket--void" : ""}`}>
        <div className="ticket-main">
          <h3>
            {ev ? <Link className="card-link" to={`/events/${encodeURIComponent(ev._id)}`}>{ev.title}</Link> : "Event removed"}
          </h3>
          {ev && (
            <div className="event-meta">
              <div className="meta-item"><HiOutlineCalendar aria-hidden="true" /> {formatDateRange(ev.startsAt, ev.endsAt)}</div>
              <div className="meta-item"><HiOutlineLocationMarker aria-hidden="true" /> {ev.venue}</div>
            </div>
          )}
          <p className="muted">{t.studentName} · {t.studentId}</p>
        </div>
        <div className="ticket-stub">
          {t.status === "cancelled" ? (
            <>
              <StatusBadge status="cancelled" />
              <span className="muted ticket-note">{CANCEL_REASON[t.cancelReason] || ""}</span>
            </>
          ) : t.checkInStatus ? (
            <span className="badge badge--success">Checked in</span>
          ) : (
            <StatusBadge status="confirmed" />
          )}
          <span className="ticket-code-label">Ticket ID</span>
          <code className="ticket-code">{t.ticketId}</code>
          {t.status === "confirmed" && (
            <div className="register-actions">
              <button type="button" className="btn btn-primary btn-sm" onClick={() => setOpenTicket(t)}>
                <HiOutlineQrcode aria-hidden="true" /> Show QR
              </button>
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => downloadPdf(t)}>
                <HiOutlineDownload aria-hidden="true" /> PDF
              </button>
            </div>
          )}
          {canCancel && <button type="button" className="btn btn-ghost btn-sm" onClick={() => cancel(t)}>Cancel registration</button>}
        </div>
      </article>
    );
  };

  return (
    <div className="page-container">
      <PageHeader title="My tickets" subtitle="Show the QR code at the entrance. Each ticket can be used once." />

      <Tabs id="tickets-when" label="Ticket timeframe" value={when} options={TABS} onChange={(v) => setFilters({ tab: v })} />

      <div className={`results-region ${refreshing ? "is-refreshing" : ""}`} aria-busy={refreshing || initialLoading}>
        {initialLoading ? (
          <SkeletonTable rows={3} />
        ) : error && !data ? (
          <EmptyState error title="Couldn't load your tickets" message={error} onRetry={load} />
        ) : tickets.length === 0 ? (
          <EmptyState
            title={when === "upcoming" ? "No upcoming tickets" : "Nothing here yet"}
            message={when === "upcoming" ? "Find something to attend on the events page." : "Your past and cancelled registrations will show up here."}
          />
        ) : (
          <AnimatedList className="ticket-list" items={tickets} getKey={(t) => t.ticketId} render={renderTicket} />
        )}
      </div>

      {openTicket && (
        <div className="modal-backdrop" onClick={() => setOpenTicket(null)}>
          <div
            className="modal-content modal-content--narrow ticket-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="qr-title"
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => e.key === "Escape" && setOpenTicket(null)}
          >
            <div className="modal-header">
              <h3 id="qr-title">{openTicket.event?.title}</h3>
              <button type="button" className="close-btn" aria-label="Close" autoFocus onClick={() => setOpenTicket(null)}>×</button>
            </div>
            <div className="ticket-modal-body">
              <div className="qr-frame">
                <TicketQR ticketId={openTicket.ticketId} size={260} />
              </div>
              <p className="cell-bold">{openTicket.studentName}</p>
              <p className="muted">{formatDateRange(openTicket.event?.startsAt, openTicket.event?.endsAt)} · {openTicket.event?.venue}</p>
              <code className="ticket-code">{openTicket.ticketId}</code>
              <p className="form-hint">Turn your screen brightness up at the entrance. Each ticket works once, so don't share it.</p>
              <button type="button" className="btn btn-secondary btn-sm" onClick={() => downloadPdf(openTicket)}>
                <HiOutlineDownload aria-hidden="true" /> Download PDF
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MyTickets;
