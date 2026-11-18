import { useState, useEffect, useCallback } from "react";
import { useParams, Link, useNavigate, useLocation } from "react-router-dom";
import toast from "react-hot-toast";
import {
  getEventById,
  getRegistrationsByEvent,
  setCheckIn,
  cancelRegistration,
  transitionEvent,
  deleteEvent,
  registerForEvent,
  cancelMyRegistration,
  exportAttendeesUrl,
  errorMessage,
  errorCode,
} from "../services/api";
import { useAuth } from "../context/AuthContext";
import Loader from "../components/Loader";
import StatCard from "../components/StatCard";
import EmptyState from "../components/EmptyState";
import StatusBadge from "../components/StatusBadge";
import ReasonDialog from "../components/ReasonDialog";
import { formatDateRange, formatDate, formatTime, pct } from "../utils/format";
import {
  HiArrowLeft, HiOutlineUsers, HiOutlineCheckCircle, HiOutlineTicket, HiCheck, HiX,
  HiOutlineCalendar, HiOutlineLocationMarker, HiOutlineDownload, HiOutlinePencil,
} from "react-icons/hi";

// Which lifecycle buttons to show for each status.
const MANAGER_ACTIONS = {
  draft: [["submit", "Submit for approval", "btn-primary"]],
  rejected: [["submit", "Resubmit for approval", "btn-primary"]],
  pending_approval: [["withdraw", "Withdraw", "btn-ghost"]],
  approved: [["publish", "Publish", "btn-primary"]],
  published: [["complete", "Mark completed", "btn-secondary"]],
};
const CANCELLABLE = ["draft", "pending_approval", "approved", "published"];

const EventDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { user, loading: authLoading, profileComplete } = useAuth();
  const [event, setEvent] = useState(null);
  const [viewer, setViewer] = useState(null);
  const [registrations, setRegistrations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [notFound, setNotFound] = useState(false);
  const [busy, setBusy] = useState(false);
  const [dialog, setDialog] = useState(null); // "reject" | "cancel"

  const fetchEventData = useCallback(async () => {
    try {
      setLoadError("");
      setNotFound(false);
      const res = await getEventById(id);
      setEvent(res.data.data);
      setViewer(res.data.viewer);
      // Attendee lists are only loaded for people allowed to see them.
      if (res.data.viewer.canViewAttendees) {
        const regsRes = await getRegistrationsByEvent(id);
        setRegistrations(regsRes.data.data);
      }
    } catch (err) {
      if (err.response?.status === 404) setNotFound(true);
      else setLoadError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (!authLoading) fetchEventData();
  }, [authLoading, fetchEventData, user]);

  const run = async (fn, successMsg) => {
    setBusy(true);
    try {
      await fn();
      if (successMsg) toast.success(successMsg);
      await fetchEventData();
      return true;
    } catch (err) {
      toast.error(errorMessage(err));
      return false;
    } finally {
      setBusy(false);
    }
  };

  const handleRegister = async () => {
    if (!user) return navigate("/login", { state: { from: location.pathname } });
    setBusy(true);
    try {
      await registerForEvent(id);
      toast.success("You're registered! Your ticket is in My Tickets.");
      await fetchEventData();
    } catch (err) {
      if (errorCode(err) === "PROFILE_INCOMPLETE") {
        toast.error("Add your PRN, department and year to your profile first.");
        navigate("/profile", { state: { from: location.pathname } });
      } else {
        toast.error(errorMessage(err));
      }
    } finally {
      setBusy(false);
    }
  };

  const handleCancelMine = () => {
    if (!window.confirm("Cancel your registration? Your seat will be released.")) return;
    run(() => cancelMyRegistration(viewer.registration.ticketId), "Registration cancelled");
  };

  const handleTransition = (action, reason) => run(() => transitionEvent(id, action, reason), "Event updated");

  const handleDelete = async () => {
    if (!window.confirm("Delete this event permanently?")) return;
    try {
      await deleteEvent(id);
      toast.success("Event deleted");
      navigate("/manage/events");
    } catch (err) {
      toast.error(errorMessage(err));
    }
  };

  const handleToggleCheckIn = async (reg) => {
    try {
      const res = await setCheckIn(reg.ticketId, !reg.checkInStatus);
      setRegistrations((prev) => prev.map((r) => (r.ticketId === reg.ticketId ? res.data.data : r)));
      toast.success(res.data.data.checkInStatus ? `${reg.studentName} checked in` : "Check-in undone");
    } catch (err) {
      toast.error(errorMessage(err));
    }
  };

  const handleCancelReg = async (reg) => {
    if (!window.confirm(`Cancel the registration for ${reg.studentName}? Their ticket will stop working.`)) return;
    try {
      await cancelRegistration(reg.ticketId);
      setRegistrations((prev) => prev.filter((r) => r.ticketId !== reg.ticketId));
      setEvent((prev) => ({ ...prev, seatsAvailable: Math.min(prev.capacity, prev.seatsAvailable + 1) }));
      toast.success("Registration cancelled");
    } catch (err) {
      toast.error(errorMessage(err));
    }
  };

  if (loading || authLoading) return <Loader />;

  const backLink = (
    <Link to="/events" className="back-link">
      <HiArrowLeft aria-hidden="true" /> All events
    </Link>
  );

  if (notFound || loadError || !event) {
    return (
      <div className="page-container">
        {backLink}
        {notFound ? (
          <EmptyState title="Event not found" message="It may have been removed, or the link is incorrect." />
        ) : (
          <EmptyState error title="Couldn't load this event" message={loadError} onRetry={() => { setLoading(true); fetchEventData(); }} />
        )}
      </div>
    );
  }

  const now = new Date();
  const closesAt = event.registrationClosesAt || event.startsAt;
  const registrationState = (() => {
    if (event.status !== "published") return { open: false, label: "Registration is not open" };
    if (event.registrationOpensAt && now < new Date(event.registrationOpensAt)) {
      return { open: false, label: `Registration opens ${formatDate(event.registrationOpensAt)}, ${formatTime(event.registrationOpensAt)}` };
    }
    if (closesAt && now >= new Date(closesAt)) return { open: false, label: "Registration has closed" };
    if (event.seatsAvailable <= 0) return { open: false, label: "Fully booked" };
    if (event.entryFee > 0) return { open: false, label: "Contact the organizers to register for this paid event" };
    return { open: true };
  })();

  const checkedInCount = registrations.filter((r) => r.checkInStatus).length;
  const myReg = viewer?.registration;

  return (
    <div className="page-container">
      {backLink}

      <header className="event-hero">
        <div className="event-hero-badges">
          <span className={`badge badge--${event.category.toLowerCase()}`}>{event.category}</span>
          {(viewer?.canManage || viewer?.canReview) && <StatusBadge status={event.status} />}
          {event.status === "cancelled" && !viewer?.canManage && <StatusBadge status="cancelled" />}
        </div>
        <h1>{event.title}</h1>
        <p className="header-subtitle">
          Organized by{" "}
          {event.club?.slug ? <Link className="text-link" to={`/clubs/${event.club.slug}`}>{event.organizerClub}</Link> : event.organizerClub}
        </p>
        <div className="event-hero-meta">
          <span><HiOutlineCalendar aria-hidden="true" /> {formatDateRange(event.startsAt, event.endsAt)}</span>
          <span><HiOutlineLocationMarker aria-hidden="true" /> {event.venue}</span>
        </div>
      </header>

      {event.statusReason && (viewer?.canManage || viewer?.canReview) && ["rejected", "cancelled"].includes(event.status) && (
        <div className="notice notice--danger" role="status">
          <strong>{event.status === "rejected" ? "Rejected" : "Cancelled"}:</strong> {event.statusReason}
        </div>
      )}

      {/* Manager / reviewer toolbar */}
      {(viewer?.canManage || viewer?.canReview) && (
        <div className="action-bar" aria-label="Event actions">
          {viewer.canManage && ["draft", "rejected", "approved", "published"].includes(event.status) && (
            <Link to={`/manage/events/${encodeURIComponent(event._id)}/edit`} className="btn btn-ghost btn-sm">
              <HiOutlinePencil aria-hidden="true" /> Edit
            </Link>
          )}
          {viewer.canManage && (MANAGER_ACTIONS[event.status] || []).map(([action, label, cls]) => (
            <button key={action} type="button" className={`btn ${cls} btn-sm`} disabled={busy} onClick={() => handleTransition(action)}>
              {label}
            </button>
          ))}
          {viewer.canReview && event.status === "pending_approval" && (
            <>
              <button type="button" className="btn btn-primary btn-sm" disabled={busy} onClick={() => handleTransition("approve")}>Approve</button>
              <button type="button" className="btn btn-danger-outline btn-sm" disabled={busy} onClick={() => setDialog("reject")}>Reject</button>
            </>
          )}
          {viewer.canManage && CANCELLABLE.includes(event.status) && (
            <button type="button" className="btn btn-danger-outline btn-sm" disabled={busy} onClick={() => setDialog("cancel")}>Cancel event</button>
          )}
          {viewer.canManage && ["draft", "rejected"].includes(event.status) && (
            <button type="button" className="btn btn-danger-outline btn-sm" disabled={busy} onClick={handleDelete}>Delete</button>
          )}
        </div>
      )}

      {viewer?.canViewAttendees && (
        <div className="stats-grid">
          <StatCard icon={<HiOutlineUsers />} label="Registered" value={registrations.length} color="blue" />
          <StatCard icon={<HiOutlineCheckCircle />} label="Checked in" value={`${checkedInCount} (${pct(checkedInCount, registrations.length)}%)`} color="green" />
          <StatCard icon={<HiOutlineTicket />} label="Seats left" value={`${event.seatsAvailable} / ${event.capacity}`} color="purple" />
        </div>
      )}

      <div className="event-detail-grid">
        <div className="detail-card">
          <h3>About this event</h3>
          {event.description ? <p className="event-description">{event.description}</p> : <p className="muted">No description yet.</p>}
          <div className="info-row">
            <span className="info-label">Entry:</span>
            <span>{event.entryFee === 0 ? "Free" : `₹${event.entryFee}`}</span>
          </div>
          {event.status !== "completed" && (
            <div className="info-row">
              <span className="info-label">Seats:</span>
              <span>{event.seatsAvailable > 0 ? `${event.seatsAvailable} of ${event.capacity} available` : "Fully booked"}</span>
            </div>
          )}
          {closesAt && event.status === "published" && (
            <div className="info-row">
              <span className="info-label">Registration closes:</span>
              <span>{formatDate(closesAt)}, {formatTime(closesAt)}</span>
            </div>
          )}
          {event.coordinators?.length > 0 && (
            <div className="info-row">
              <span className="info-label">Contact:</span>
              <span>{event.coordinators.map((c) => `${c.name} (${c.contact})`).join(", ")}</span>
            </div>
          )}
          {event.tags?.length > 0 && (
            <div className="tags-container">
              {event.tags.map((t) => <span key={t} className="tag-chip">#{t}</span>)}
            </div>
          )}
        </div>

        {/* Registration panel */}
        <aside className="detail-card register-card" aria-label="Registration">
          <h3>Your ticket</h3>
          {myReg ? (
            <>
              <p className="register-ok"><HiCheck aria-hidden="true" /> You're registered.</p>
              <p className="muted">Ticket <code>{myReg.ticketId}</code></p>
              {myReg.checkInStatus ? (
                <p className="muted">Checked in. Enjoy the event!</p>
              ) : (
                <div className="register-actions">
                  <Link to="/tickets" className="btn btn-secondary btn-sm">View in My Tickets</Link>
                  {(!event.startsAt || now < new Date(event.startsAt)) && (
                    <button type="button" className="btn btn-ghost btn-sm" disabled={busy} onClick={handleCancelMine}>Cancel registration</button>
                  )}
                </div>
              )}
            </>
          ) : registrationState.open ? (
            <>
              {user && !profileComplete && (
                <p className="muted">You'll need your PRN, department and year on your <Link className="text-link" to="/profile">profile</Link>.</p>
              )}
              <button type="button" className="btn btn-primary btn-block" disabled={busy} onClick={handleRegister}>
                {user ? (busy ? "Registering..." : "Register for free") : "Sign in to register"}
              </button>
            </>
          ) : (
            <p className="muted">{registrationState.label}</p>
          )}
        </aside>
      </div>

      {viewer?.canViewAttendees && (
        <section className="detail-card attendees-card">
          <div className="section-header">
            <h3>Attendees ({registrations.length})</h3>
            {registrations.length > 0 && (
              <a className="btn btn-ghost btn-sm" href={exportAttendeesUrl(event._id)}>
                <HiOutlineDownload aria-hidden="true" /> Export CSV
              </a>
            )}
          </div>
          {registrations.length === 0 ? (
            <EmptyState title="No registrations yet" message="Attendees will appear here as students register." />
          ) : (
            <div className="table-wrapper scrollable-table">
              <table className="data-table">
                <thead>
                  <tr>
                    <th scope="col">Name</th>
                    <th scope="col">PRN / ID</th>
                    <th scope="col">Dept / Year</th>
                    <th scope="col">Ticket</th>
                    <th scope="col">Check-in</th>
                    {viewer.canManage && <th scope="col"><span className="sr-only">Actions</span></th>}
                  </tr>
                </thead>
                <tbody>
                  {registrations.map((reg) => (
                    <tr key={reg.ticketId}>
                      <td className="cell-bold">{reg.studentName}</td>
                      <td><code>{reg.studentId}</code></td>
                      <td>{reg.department} (Y{reg.year})</td>
                      <td><span className="badge badge--id ticket-id" title={reg.ticketId}>{reg.ticketId.slice(0, 12)}…</span></td>
                      <td>
                        <button
                          type="button"
                          className={`badge badge-clickable ${reg.checkInStatus ? "badge--success" : "badge--warning"}`}
                          onClick={() => handleToggleCheckIn(reg)}
                          disabled={event.status !== "published" || (reg.checkInStatus && !viewer.canManage)}
                          aria-label={reg.checkInStatus ? `Undo check-in for ${reg.studentName}` : `Check in ${reg.studentName}`}
                        >
                          {reg.checkInStatus ? <HiCheck aria-hidden="true" /> : <HiX aria-hidden="true" />} {reg.checkInStatus ? "Checked in" : "Not yet"}
                        </button>
                      </td>
                      {viewer.canManage && (
                        <td>
                          {!reg.checkInStatus && (
                            <button type="button" className="btn btn-ghost btn-sm" onClick={() => handleCancelReg(reg)}>Cancel</button>
                          )}
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      {dialog && (
        <ReasonDialog
          title={dialog === "reject" ? "Reject this event" : "Cancel this event"}
          description={dialog === "cancel" ? "All tickets for this event will be cancelled. This cannot be undone." : "The organizers can fix the event and resubmit it."}
          confirmLabel={dialog === "reject" ? "Reject event" : "Cancel event"}
          onClose={() => setDialog(null)}
          onConfirm={async (reason) => {
            const ok = await handleTransition(dialog, reason);
            if (ok) setDialog(null);
          }}
        />
      )}
    </div>
  );
};

export default EventDetail;
