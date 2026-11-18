import { useState, useEffect, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
import toast from "react-hot-toast";
import { getEventById, getRegistrationsByEvent, setCheckIn, deleteRegistration, errorMessage } from "../services/api";
import { useAuth } from "../context/AuthContext";
import PageHeader from "../components/PageHeader";
import Loader from "../components/Loader";
import StatCard from "../components/StatCard";
import EmptyState from "../components/EmptyState";
import { HiArrowLeft, HiOutlineUsers, HiOutlineCheckCircle, HiOutlineCurrencyRupee, HiOutlineTicket, HiCheck, HiX, HiTrash } from "react-icons/hi";

const pct = (part, whole) => (whole ? Math.round((part / whole) * 100) : 0);

const EventDetail = () => {
  const { id } = useParams();
  const { isAdmin, loading: authLoading } = useAuth();
  const [event, setEvent] = useState(null);
  const [registrations, setRegistrations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [notFound, setNotFound] = useState(false);

  const fetchEventData = useCallback(async () => {
    try {
      setLoadError("");
      setNotFound(false);
      const evtRes = await getEventById(id);
      setEvent(evtRes.data.data);
      // Attendee lists contain student data and are only loaded for admins.
      if (isAdmin) {
        const regsRes = await getRegistrationsByEvent(id);
        setRegistrations(regsRes.data.data);
      }
    } catch (err) {
      if (err.response?.status === 404) setNotFound(true);
      else setLoadError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [id, isAdmin]);

  useEffect(() => {
    if (!authLoading) fetchEventData();
  }, [authLoading, fetchEventData]);

  const handleToggleCheckIn = async (reg) => {
    try {
      const res = await setCheckIn(reg.ticketId, !reg.checkInStatus);
      setRegistrations((prev) => prev.map((r) => (r.ticketId === reg.ticketId ? res.data.data : r)));
      toast.success(res.data.data.checkInStatus ? `${reg.studentName} checked in` : "Check-in undone");
    } catch (err) {
      toast.error(errorMessage(err));
    }
  };

  const handleDeleteReg = async (reg) => {
    if (!window.confirm(`Delete the registration for ${reg.studentName}? This frees up their seat.`)) return;
    try {
      await deleteRegistration(reg.ticketId);
      setRegistrations((prev) => prev.filter((r) => r.ticketId !== reg.ticketId));
      setEvent((prev) => ({ ...prev, seatsAvailable: Math.min(prev.capacity, prev.seatsAvailable + 1) }));
      toast.success("Registration deleted");
    } catch (err) {
      toast.error(errorMessage(err));
    }
  };

  if (loading || authLoading) return <Loader />;

  const backLink = (
    <Link to="/events" className="back-link">
      <HiArrowLeft aria-hidden="true" /> Back to Events
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

  const checkedInCount = registrations.filter((r) => r.checkInStatus).length;
  // Only verified (Completed) payments count as revenue.
  const collected = registrations
    .filter((r) => r.paymentDetails?.status === "Completed")
    .reduce((sum, r) => sum + (r.paymentDetails?.amountPaid || 0), 0);

  return (
    <div className="page-container">
      {backLink}

      <PageHeader title={event.title} subtitle={`Organized by ${event.organizerClub} • Venue: ${event.venue}`} />

      {isAdmin && (
        <div className="stats-grid">
          <StatCard icon={<HiOutlineUsers />} label="Total Registered" value={registrations.length} color="blue" />
          <StatCard
            icon={<HiOutlineCheckCircle />}
            label="Checked In"
            value={`${checkedInCount} (${pct(checkedInCount, registrations.length)}%)`}
            color="green"
          />
          <StatCard icon={<HiOutlineTicket />} label="Available Seats" value={event.seatsAvailable} color="purple" />
          <StatCard icon={<HiOutlineCurrencyRupee />} label="Verified Revenue" value={`₹${collected.toLocaleString()}`} color="orange" />
        </div>
      )}

      <div className="event-detail-grid">
        <div className="detail-card">
          <h3>Event Overview</h3>
          <div className="info-row">
            <span className="info-label">Event ID:</span>
            <span className="badge badge--id">{event._id}</span>
          </div>
          <div className="info-row">
            <span className="info-label">Category:</span>
            <span className={`badge badge--${event.category.toLowerCase()}`}>{event.category}</span>
          </div>
          <div className="info-row">
            <span className="info-label">Entry Fee:</span>
            <span>{event.entryFee === 0 ? "Free" : `₹${event.entryFee}`}</span>
          </div>
          <div className="info-row">
            <span className="info-label">Seats:</span>
            <span>{event.seatsAvailable > 0 ? `${event.seatsAvailable} of ${event.capacity} available` : "Fully booked"}</span>
          </div>
          {event.coordinators?.length > 0 && (
            <div className="info-row">
              <span className="info-label">Coordinators:</span>
              <span>{event.coordinators.map((c) => `${c.name} (${c.contact})`).join(", ")}</span>
            </div>
          )}
          {event.sponsors?.length > 0 && (
            <div className="info-row">
              <span className="info-label">Sponsors:</span>
              <div className="chip-group">
                {event.sponsors.map((s) => <span key={s} className="chip">{s}</span>)}
              </div>
            </div>
          )}
        </div>

        {isAdmin && (
          <div className="detail-card">
            <h3>Registrations ({registrations.length})</h3>
            {registrations.length === 0 ? (
              <EmptyState title="No registrations yet" message="Registrations for this event will appear here." />
            ) : (
              <div className="table-wrapper scrollable-table">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th scope="col">Ticket ID</th>
                      <th scope="col">Student Name</th>
                      <th scope="col">Dept / Year</th>
                      <th scope="col">Check-In</th>
                      <th scope="col"><span className="sr-only">Actions</span></th>
                    </tr>
                  </thead>
                  <tbody>
                    {registrations.map((reg) => (
                      <tr key={reg.ticketId}>
                        <td><span className="badge badge--id">{reg.ticketId}</span></td>
                        <td className="cell-bold">{reg.studentName}</td>
                        <td>{reg.department} (Y{reg.year})</td>
                        <td>
                          <button
                            type="button"
                            className={`badge badge-clickable ${reg.checkInStatus ? "badge--success" : "badge--warning"}`}
                            onClick={() => handleToggleCheckIn(reg)}
                            aria-label={reg.checkInStatus ? `Undo check-in for ${reg.studentName}` : `Check in ${reg.studentName}`}
                          >
                            {reg.checkInStatus ? <HiCheck aria-hidden="true" /> : <HiX aria-hidden="true" />} {reg.checkInStatus ? "Checked In" : "Pending"}
                          </button>
                        </td>
                        <td>
                          <button
                            type="button"
                            className="btn-icon btn-icon-danger"
                            onClick={() => handleDeleteReg(reg)}
                            aria-label={`Delete registration for ${reg.studentName}`}
                          >
                            <HiTrash aria-hidden="true" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default EventDetail;
