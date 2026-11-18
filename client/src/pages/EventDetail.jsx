import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { getEventById, getRegistrationsByEvent, updateRegistration, deleteRegistration } from "../services/api";
import PageHeader from "../components/PageHeader";
import Loader from "../components/Loader";
import StatCard from "../components/StatCard";
import { HiArrowLeft, HiOutlineUsers, HiOutlineCheckCircle, HiOutlineCurrencyRupee, HiOutlineTicket, HiCheck, HiX, HiTrash } from "react-icons/hi";

const EventDetail = () => {
  const { id } = useParams();
  const [event, setEvent] = useState(null);
  const [registrations, setRegistrations] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchEventData = async () => {
    try {
      const [evtRes, regsRes] = await Promise.all([
        getEventById(id),
        getRegistrationsByEvent(id)
      ]);
      setEvent(evtRes.data.data);
      setRegistrations(regsRes.data.data);
    } catch (err) {
      console.error("Error fetching event details:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEventData();
  }, [id]);

  const handleToggleCheckIn = async (reg) => {
    try {
      const newStatus = !reg.checkInStatus;
      await updateRegistration(reg.ticketId, { checkInStatus: newStatus });
      setRegistrations(registrations.map(r => r.ticketId === reg.ticketId ? { ...r, checkInStatus: newStatus } : r));
    } catch (err) {
      alert("Failed to update check-in status: " + (err.response?.data?.message || err.message));
    }
  };

  const handleDeleteReg = async (ticketId) => {
    if (window.confirm("Delete this registration?")) {
      try {
        await deleteRegistration(ticketId);
        setRegistrations(registrations.filter(r => r.ticketId !== ticketId));
      } catch (err) {
        alert("Delete failed: " + err.message);
      }
    }
  };

  if (loading) return <Loader />;
  if (!event) return <div className="page-container">Event not found</div>;

  const checkedInCount = registrations.filter(r => r.checkInStatus).length;
  const totalRev = registrations.reduce((sum, r) => sum + (r.paymentDetails?.amountPaid || 0), 0);

  return (
    <div className="page-container">
      <Link to="/events" className="back-link">
        <HiArrowLeft /> Back to Events
      </Link>

      <PageHeader
        title={`${event._id}: ${event.title}`}
        subtitle={`Organized by ${event.organizerClub} • Venue: ${event.venue}`}
      />

      <div className="stats-grid">
        <StatCard
          icon={<HiOutlineUsers />}
          label="Total Registered"
          value={registrations.length}
          color="blue"
        />
        <StatCard
          icon={<HiOutlineCheckCircle />}
          label="Checked In"
          value={`${checkedInCount} (${registrations.length ? Math.round((checkedInCount / registrations.length) * 100) : 0}%)`}
          color="green"
        />
        <StatCard
          icon={<HiOutlineTicket />}
          label="Available Seats"
          value={event.seatsAvailable}
          color="purple"
        />
        <StatCard
          icon={<HiOutlineCurrencyRupee />}
          label="Collected Revenue"
          value={`₹${totalRev.toLocaleString()}`}
          color="orange"
        />
      </div>

      <div className="event-detail-grid">
        <div className="detail-card">
          <h3>Event Overview</h3>
          <div className="info-row">
            <span className="info-label">Category:</span>
            <span className={`badge badge--${event.category.toLowerCase()}`}>{event.category}</span>
          </div>
          <div className="info-row">
            <span className="info-label">Entry Fee:</span>
            <span>{event.entryFee === 0 ? "Free" : `₹${event.entryFee}`}</span>
          </div>
          <div className="info-row">
            <span className="info-label">Capacity:</span>
            <span>{event.capacity} Attendees</span>
          </div>
          <div className="info-row">
            <span className="info-label">Coordinators:</span>
            <span>
              {event.coordinators && event.coordinators.map(c => `${c.name} (${c.contact})`).join(", ")}
            </span>
          </div>
          {event.sponsors && event.sponsors.length > 0 && (
            <div className="info-row">
              <span className="info-label">Sponsors:</span>
              <div className="chip-group">
                {event.sponsors.map((s, i) => <span key={i} className="chip">{s}</span>)}
              </div>
            </div>
          )}
        </div>

        <div className="detail-card">
          <h3>Registrations List ({registrations.length})</h3>
          <div className="table-wrapper scrollable-table">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Ticket ID</th>
                  <th>Student Name</th>
                  <th>Dept / Year</th>
                  <th>Check-In</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {registrations.map(reg => (
                  <tr key={reg.ticketId}>
                    <td><span className="badge badge--id">{reg.ticketId}</span></td>
                    <td className="cell-bold">{reg.studentName}</td>
                    <td>{reg.department} (Y{reg.year})</td>
                    <td>
                      <button
                        className={`badge badge-clickable ${reg.checkInStatus ? "badge--success" : "badge--warning"}`}
                        onClick={() => handleToggleCheckIn(reg)}
                      >
                        {reg.checkInStatus ? <HiCheck /> : <HiX />} {reg.checkInStatus ? "Checked In" : "Pending"}
                      </button>
                    </td>
                    <td>
                      <button className="btn-icon btn-icon-danger" onClick={() => handleDeleteReg(reg.ticketId)}>
                        <HiTrash />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EventDetail;
