import { useState, useEffect } from "react";
import { getAllRegistrations, getAllEvents, createRegistration, updateRegistration, deleteRegistration } from "../services/api";
import PageHeader from "../components/PageHeader";
import Loader from "../components/Loader";
import EmptyState from "../components/EmptyState";
import { HiPlus, HiSearch, HiCheck, HiX, HiTrash, HiOutlineCheckCircle } from "react-icons/hi";

const Registrations = () => {
  const [registrations, setRegistrations] = useState([]);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedEvent, setSelectedEvent] = useState("All");
  const [selectedDept, setSelectedDept] = useState("All");
  const [checkInFilter, setCheckInFilter] = useState("All");
  const [showModal, setShowModal] = useState(false);

  const [formData, setFormData] = useState({
    ticketId: "",
    eventId: "EVT101",
    studentId: "",
    studentName: "",
    department: "Computer Science",
    year: 1,
    paymentMethod: "UPI",
    paymentStatus: "Completed"
  });

  const fetchData = async () => {
    try {
      const [regsRes, eventsRes] = await Promise.all([getAllRegistrations(), getAllEvents()]);
      setRegistrations(regsRes.data.data);
      setEvents(eventsRes.data.data);
    } catch (err) {
      console.error("Failed to fetch data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleToggleCheckIn = async (reg) => {
    try {
      const newStatus = !reg.checkInStatus;
      await updateRegistration(reg.ticketId, { checkInStatus: newStatus });
      setRegistrations(registrations.map(r => r.ticketId === reg.ticketId ? { ...r, checkInStatus: newStatus } : r));
    } catch (err) {
      alert("Failed to update check-in status: " + (err.response?.data?.message || err.message));
    }
  };

  const handleDelete = async (ticketId, name) => {
    if (window.confirm(`Are you sure you want to delete registration for ${name} (${ticketId})?`)) {
      try {
        await deleteRegistration(ticketId);
        setRegistrations(registrations.filter(r => r.ticketId !== ticketId));
      } catch (err) {
        alert("Failed to delete registration: " + (err.response?.data?.message || err.message));
      }
    }
  };

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    const eventObj = events.find(ev => ev._id === formData.eventId);
    const amount = eventObj ? eventObj.entryFee : 0;

    const ticketId = formData.ticketId || `TICK-2026-${Math.floor(100 + Math.random() * 900)}`;

    const payload = {
      ticketId,
      eventId: formData.eventId,
      studentId: formData.studentId.toUpperCase() || `STU${Math.floor(1000 + Math.random() * 9000)}`,
      studentName: formData.studentName,
      department: formData.department,
      year: Number(formData.year),
      registrationDate: new Date(),
      checkInStatus: false,
      paymentDetails: {
        method: amount === 0 ? "Free" : formData.paymentMethod,
        amountPaid: amount,
        status: amount === 0 ? "Completed" : formData.paymentStatus
      }
    };

    try {
      await createRegistration(payload);
      setShowModal(false);
      setFormData({
        ticketId: "",
        eventId: "EVT101",
        studentId: "",
        studentName: "",
        department: "Computer Science",
        year: 1,
        paymentMethod: "UPI",
        paymentStatus: "Completed"
      });
      fetchData();
    } catch (err) {
      alert("Failed to register student: " + (err.response?.data?.message || err.message));
    }
  };

  const departments = ["All", ...new Set(registrations.map(r => r.department))];

  const filteredRegistrations = registrations.filter(reg => {
    const term = searchTerm.toLowerCase();
    const matchesSearch = reg.studentName.toLowerCase().includes(term) ||
      reg.studentId.toLowerCase().includes(term) ||
      reg.ticketId.toLowerCase().includes(term) ||
      reg.eventId.toLowerCase().includes(term);

    const matchesEvent = selectedEvent === "All" || reg.eventId === selectedEvent;
    const matchesDept = selectedDept === "All" || reg.department === selectedDept;
    const matchesCheckIn = checkInFilter === "All" ||
      (checkInFilter === "CheckedIn" && reg.checkInStatus) ||
      (checkInFilter === "Pending" && !reg.checkInStatus);

    return matchesSearch && matchesEvent && matchesDept && matchesCheckIn;
  });

  if (loading) return <Loader />;

  return (
    <div className="page-container">
      <PageHeader
        title="Student Registrations"
        subtitle={`Managing total ${registrations.length} student registrations across all events`}
        action={
          <button className="btn btn-primary" onClick={() => setShowModal(true)}>
            <HiPlus /> New Registration
          </button>
        }
      />

      {/* Toolbar Filters */}
      <div className="toolbar-complex">
        <div className="search-box">
          <HiSearch className="search-icon" />
          <input
            type="text"
            placeholder="Search by student name, ID, or ticket..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="filters-group">
          <select value={selectedEvent} onChange={(e) => setSelectedEvent(e.target.value)}>
            <option value="All">All Events</option>
            {events.map(ev => (
              <option key={ev._id} value={ev._id}>{ev._id}: {ev.title}</option>
            ))}
          </select>

          <select value={selectedDept} onChange={(e) => setSelectedDept(e.target.value)}>
            {departments.map(dept => (
              <option key={dept} value={dept}>{dept === "All" ? "All Departments" : dept}</option>
            ))}
          </select>

          <select value={checkInFilter} onChange={(e) => setCheckInFilter(e.target.value)}>
            <option value="All">All Check-In Status</option>
            <option value="CheckedIn">Checked In</option>
            <option value="Pending">Pending Check-In</option>
          </select>
        </div>
      </div>

      <div className="results-summary">
        Showing <strong>{filteredRegistrations.length}</strong> of <strong>{registrations.length}</strong> registrations
      </div>

      {/* Table of Registrations */}
      {filteredRegistrations.length === 0 ? (
        <EmptyState title="No Registrations Found" message="No registration records match your filter criteria." />
      ) : (
        <div className="table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>Ticket ID</th>
                <th>Student ID</th>
                <th>Student Name</th>
                <th>Event</th>
                <th>Department</th>
                <th>Year</th>
                <th>Check-In</th>
                <th>Payment</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredRegistrations.map((reg) => (
                <tr key={reg.ticketId}>
                  <td><span className="badge badge--id">{reg.ticketId}</span></td>
                  <td><code>{reg.studentId}</code></td>
                  <td className="cell-bold">{reg.studentName}</td>
                  <td><span className="badge badge--event">{reg.eventId}</span></td>
                  <td>{reg.department}</td>
                  <td>Year {reg.year}</td>
                  <td>
                    <button
                      className={`badge badge-clickable ${reg.checkInStatus ? "badge--success" : "badge--warning"}`}
                      onClick={() => handleToggleCheckIn(reg)}
                      title="Click to toggle check-in status"
                    >
                      {reg.checkInStatus ? <HiCheck /> : <HiX />} {reg.checkInStatus ? "Checked In" : "Pending"}
                    </button>
                  </td>
                  <td>
                    <span className={`badge badge--${reg.paymentDetails?.status?.toLowerCase()}`}>
                      {reg.paymentDetails?.method}: {reg.paymentDetails?.status} (₹{reg.paymentDetails?.amountPaid || 0})
                    </span>
                  </td>
                  <td>
                    <button className="btn-icon btn-icon-danger" onClick={() => handleDelete(reg.ticketId, reg.studentName)} title="Delete Registration">
                      <HiTrash />
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
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>New Student Registration</h3>
              <button className="close-btn" onClick={() => setShowModal(false)}>×</button>
            </div>
            <form onSubmit={handleCreateSubmit} className="modal-form">
              <div className="form-grid">
                <div className="form-group">
                  <label>Select Event</label>
                  <select
                    value={formData.eventId}
                    onChange={(e) => setFormData({ ...formData, eventId: e.target.value })}
                  >
                    {events.map(ev => (
                      <option key={ev._id} value={ev._id}>
                        {ev._id} - {ev.title} (Fee: ₹{ev.entryFee})
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>Student ID (e.g. STU1099)</label>
                  <input
                    type="text"
                    required
                    placeholder="STU1099"
                    value={formData.studentId}
                    onChange={(e) => setFormData({ ...formData, studentId: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label>Student Full Name</label>
                  <input
                    type="text"
                    required
                    placeholder="Ananya Roy"
                    value={formData.studentName}
                    onChange={(e) => setFormData({ ...formData, studentName: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label>Department</label>
                  <select
                    value={formData.department}
                    onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                  >
                    <option value="Computer Science">Computer Science</option>
                    <option value="Information Technology">Information Technology</option>
                    <option value="Electrical Engineering">Electrical Engineering</option>
                    <option value="Electronics">Electronics</option>
                    <option value="Mechanical Engineering">Mechanical Engineering</option>
                    <option value="Civil Engineering">Civil Engineering</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Year of Study</label>
                  <select
                    value={formData.year}
                    onChange={(e) => setFormData({ ...formData, year: e.target.value })}
                  >
                    <option value={1}>Year 1</option>
                    <option value={2}>Year 2</option>
                    <option value={3}>Year 3</option>
                    <option value={4}>Year 4</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Payment Method</label>
                  <select
                    value={formData.paymentMethod}
                    onChange={(e) => setFormData({ ...formData, paymentMethod: e.target.value })}
                  >
                    <option value="UPI">UPI</option>
                    <option value="Card">Card</option>
                    <option value="Cash">Cash</option>
                  </select>
                </div>
              </div>

              <div className="modal-actions">
                <button type="button" className="btn btn-ghost" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Complete Registration</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Registrations;
