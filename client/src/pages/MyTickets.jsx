import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";
import { myRegistrations, cancelMyRegistration, errorMessage } from "../services/api";
import PageHeader from "../components/PageHeader";
import Loader from "../components/Loader";
import EmptyState from "../components/EmptyState";
import StatusBadge from "../components/StatusBadge";
import { formatDateRange } from "../utils/format";
import { HiOutlineCalendar, HiOutlineLocationMarker } from "react-icons/hi";

const CANCEL_REASON = {
  student: "You cancelled this registration",
  organizer: "Cancelled by the organizers",
  event_cancelled: "The event was cancelled",
};

const MyTickets = () => {
  const [when, setWhen] = useState("upcoming");
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError("");
    try {
      const res = await myRegistrations(when);
      setTickets(res.data.data);
    } catch (err) {
      setLoadError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [when]);

  useEffect(() => {
    load();
  }, [load]);

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

  const now = new Date();

  return (
    <div className="page-container">
      <PageHeader title="My tickets" subtitle="Show your ticket at the entrance. QR codes are coming soon." />

      <div className="tabs" role="tablist" aria-label="Ticket timeframe">
        {[["upcoming", "Upcoming"], ["past", "Past & cancelled"]].map(([v, label]) => (
          <button key={v} type="button" role="tab" aria-selected={when === v} className={`tab ${when === v ? "active" : ""}`} onClick={() => setWhen(v)}>
            {label}
          </button>
        ))}
      </div>

      {loading ? (
        <Loader />
      ) : loadError ? (
        <EmptyState error title="Couldn't load your tickets" message={loadError} onRetry={load} />
      ) : tickets.length === 0 ? (
        <EmptyState
          title={when === "upcoming" ? "No upcoming tickets" : "Nothing here yet"}
          message={when === "upcoming" ? "Find something to attend on the events page." : "Your past and cancelled registrations will show up here."}
        />
      ) : (
        <div className="ticket-list">
          {tickets.map((t) => {
            const ev = t.event;
            const canCancel = t.status === "confirmed" && !t.checkInStatus && ev && (!ev.startsAt || now < new Date(ev.startsAt)) && ev.status === "published";
            return (
              <article key={t.ticketId} className={`ticket ${t.status === "cancelled" ? "ticket--void" : ""}`}>
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
                  {canCancel && <button type="button" className="btn btn-ghost btn-sm" onClick={() => cancel(t)}>Cancel</button>}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default MyTickets;
