import { useState, useEffect } from "react";
import toast from "react-hot-toast";
import { getAllRegistrations, getAllEvents, createRegistration, setCheckIn, deleteRegistration, errorMessage } from "../services/api";
import PageHeader from "../components/PageHeader";
import Loader from "../components/Loader";
import EmptyState from "../components/EmptyState";
import { HiPlus, HiSearch, HiCheck, HiX, HiTrash } from "react-icons/hi";

const DEPARTMENTS = [
  "Computer Science",
  "Information Technology",
  "Electrical Engineering",
  "Electronics",
  "Mechanical Engineering",
  "Civil Engineering"
];

const emptyForm = (eventId = "") => ({
  eventId,
  studentId: "",
  studentName: "",
  department: DEPARTMENTS[0],
  year: 1,
  paymentMethod: "UPI"
});

const Registrations = () => {
  const [registrations, setRegistrations] = useState([]);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedEvent, setSelectedEvent] = useState("All");
  const [selectedDept, setSelectedDept] = useState("All");
  const [checkInFilter, setCheckInFilter] = useState("All");
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState(emptyForm());

  const fetchData = async () => {
    try {
      setLoadError("");
      const [regsRes, eventsRes] = await Promise.all([getAllRegistrations(), getAllEvents()]);
      setRegistrations(regsRes.data.data);
      setEvents(eventsRes.data.data);
    } catch (err) {
      setLoadError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const openModal = () => {
    setFormData(emptyForm(events[0]?._id || ""));
    setShowModal(true);
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

  const handleDelete = async (reg) => {
    if (!window.confirm(`Delete the registration for ${reg.studentName}? This frees up their seat.`)) return;
    try {
      await deleteRegistration(reg.ticketId);
      setRegistrations((prev) => prev.filter((r) => r.ticketId !== reg.ticketId));
      toast.success("Registration deleted");
    } catch (err) {
      toast.error(errorMessage(err));
    }
  };

  const selectedEventObj = events.find((ev) => ev._id === formData.eventId);
  const isPaidEvent = selectedEventObj && selectedEventObj.entryFee > 0;

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      // The ticket ID and payment status are decided by the server.
      const payload = {
        eventId: formData.eventId,
        studentId: formData.studentId.trim().toUpperCase(),
        studentName: formData.studentName,
        department: formData.department,
        year: Number(formData.year)
      };
      if (isPaidEvent) payload.paymentMethod = formData.paymentMethod;

      const res = await createRegistration(payload);
      toast.success(
        isPaidEvent
          ? `Registered. Payment is marked Pending until verified.`
          : `Registered. Ticket ${res.data.data.ticketId}`
      );
      setShowModal(false);
      fetchData();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  const eventTitle = (id) => events.find((ev) => ev._id === id)?.title || id;
  const departments = ["All", ...new Set(registrations.map((r) => r.department))];

  const term = searchTerm.toLowerCase();
  const filteredRegistrations = registrations.filter((reg) => {
    const matchesSearch =
      reg.studentName.toLowerCase().includes(term) ||
      reg.studentId.toLowerCase().includes(term) ||
      reg.ticketId.toLowerCase().includes(term) ||
      reg.eventId.toLowerCase().includes(term);
    const matchesEvent = selectedEvent === "All" || reg.eventId === selectedEvent;
    const matchesDept = selectedDept === "All" || reg.department === selectedDept;
    const matchesCheckIn =
      checkInFilter === "All" ||
      (checkInFilter === "CheckedIn" && reg.checkInStatus) ||
      (checkInFilter === "Pending" && !reg.checkInStatus);
    return matchesSearch && matchesEvent && matchesDept && matchesCheckIn;
  });

  const set = (name) => (e) => setFormData({ ...formData, [name]: e.target.value });

  if (loading) return <Loader />;
  if (loadError) {
    return (
      <div className="page-container">
        <EmptyState error title="Couldn't load registrations" message={loadError} onRetry={() => { setLoading(true); fetchData(); }} />
      </div>
    );
  }

  return (
    <div className="page-container">
      <PageHeader
        title="Student Registrations"
        subtitle={`Managing ${registrations.length} registrations across all events`}
        action={
          <button type="button" className="btn btn-primary" onClick={openModal} disabled={events.length === 0}>
            <HiPlus aria-hidden="true" /> New Registration
          </button>
        }
      />

      {/* Toolbar Filters */}
      <div className="toolbar-complex">
        <div className="search-box">
          <HiSearch className="search-icon" aria-hidden="true" />
          <input
            type="search"
            aria-label="Search registrations"
            placeholder="Search by student name, ID, or ticket..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="filters-group">
          <select aria-label="Filter by event" value={selectedEvent} onChange={(e) => setSelectedEvent(e.target.value)}>
            <option value="All">All Events</option>
            {events.map((ev) => (
              <option key={ev._id} value={ev._id}>{ev.title}</option>
            ))}
          </select>

          <select aria-label="Filter by department" value={selectedDept} onChange={(e) => setSelectedDept(e.target.value)}>
            {departments.map((dept) => (
              <option key={dept} value={dept}>{dept === "All" ? "All Departments" : dept}</option>
            ))}
          </select>

          <select aria-label="Filter by check-in status" value={checkInFilter} onChange={(e) => setCheckInFilter(e.target.value)}>
            <option value="All">All Check-In Status</option>
            <option value="CheckedIn">Checked In</option>
            <option value="Pending">Pending Check-In</option>
          </select>
        </div>
      </div>

      <div className="results-summary" aria-live="polite">
        Showing <strong>{filteredRegistrations.length}</strong> of <strong>{registrations.length}</strong> registrations
      </div>

      {filteredRegistrations.length === 0 ? (
        <EmptyState
          title="No registrations found"
          message={registrations.length ? "No registrations match your filters." : "Registrations will appear here once students sign up."}
        />
      ) : (
        <div className="table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th scope="col">Ticket ID</th>
                <th scope="col">Student ID</th>
                <th scope="col">Student Name</th>
                <th scope="col">Event</th>
                <th scope="col">Department</th>
                <th scope="col">Year</th>
                <th scope="col">Check-In</th>
                <th scope="col">Payment</th>
                <th scope="col"><span className="sr-only">Actions</span></th>
              </tr>
            </thead>
            <tbody>
              {filteredRegistrations.map((reg) => (
                <tr key={reg.ticketId}>
                  <td><span className="badge badge--id">{reg.ticketId}</span></td>
                  <td><code>{reg.studentId}</code></td>
                  <td className="cell-bold">{reg.studentName}</td>
                  <td><span className="badge badge--event" title={reg.eventId}>{eventTitle(reg.eventId)}</span></td>
                  <td>{reg.department}</td>
                  <td>Year {reg.year}</td>
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
                    <span className={`badge badge--${reg.paymentDetails?.status?.toLowerCase()}`}>
                      {reg.paymentDetails?.method}: {reg.paymentDetails?.status}
                      {reg.paymentDetails?.status === "Completed" && reg.paymentDetails?.amountPaid > 0 && ` (₹${reg.paymentDetails.amountPaid})`}
                    </span>
                  </td>
                  <td>
                    <button
                      type="button"
                      className="btn-icon btn-icon-danger"
                      onClick={() => handleDelete(reg)}
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

      {/* New Registration Modal */}
      {showModal && (
        <div className="modal-backdrop" onClick={() => setShowModal(false)}>
          <div
            className="modal-content"
            role="dialog"
            aria-modal="true"
            aria-labelledby="new-reg-title"
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => e.key === "Escape" && setShowModal(false)}
          >
            <div className="modal-header">
              <h3 id="new-reg-title">New Student Registration</h3>
              <button type="button" className="close-btn" aria-label="Close" onClick={() => setShowModal(false)}>×</button>
            </div>
            <form onSubmit={handleCreateSubmit} className="modal-form">
              <div className="form-grid">
                <div className="form-group">
                  <label htmlFor="reg-event">Event</label>
                  <select id="reg-event" value={formData.eventId} onChange={set("eventId")}>
                    {events.map((ev) => (
                      <option key={ev._id} value={ev._id} disabled={ev.seatsAvailable <= 0}>
                        {ev.title} ({ev.entryFee ? `₹${ev.entryFee}` : "Free"}{ev.seatsAvailable <= 0 ? ", full" : ""})
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label htmlFor="reg-student-id">Student ID</label>
                  <input id="reg-student-id" type="text" required autoFocus maxLength={30} placeholder="STU1099" value={formData.studentId} onChange={set("studentId")} />
                </div>
                <div className="form-group">
                  <label htmlFor="reg-name">Student Full Name</label>
                  <input id="reg-name" type="text" required maxLength={100} value={formData.studentName} onChange={set("studentName")} />
                </div>
                <div className="form-group">
                  <label htmlFor="reg-dept">Department</label>
                  <select id="reg-dept" value={formData.department} onChange={set("department")}>
                    {DEPARTMENTS.map((d) => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label htmlFor="reg-year">Year of Study</label>
                  <select id="reg-year" value={formData.year} onChange={set("year")}>
                    {[1, 2, 3, 4].map((y) => <option key={y} value={y}>Year {y}</option>)}
                  </select>
                </div>
                {isPaidEvent && (
                  <div className="form-group">
                    <label htmlFor="reg-pay">Payment Method</label>
                    <select id="reg-pay" value={formData.paymentMethod} onChange={set("paymentMethod")} aria-describedby="reg-pay-hint">
                      <option value="UPI">UPI</option>
                      <option value="Card">Card</option>
                      <option value="Cash">Cash</option>
                    </select>
                    <small id="reg-pay-hint" className="form-hint">Recorded as Pending until the payment is verified.</small>
                  </div>
                )}
              </div>

              <div className="modal-actions">
                <button type="button" className="btn btn-ghost" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={submitting || !formData.eventId}>
                  {submitting ? "Registering..." : "Complete Registration"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Registrations;
