import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { getAllEvents, createEvent, deleteEvent } from "../services/api";
import PageHeader from "../components/PageHeader";
import Loader from "../components/Loader";
import EmptyState from "../components/EmptyState";
import { HiPlus, HiSearch, HiTrash, HiEye, HiOutlineTicket, HiOutlineUserGroup, HiOutlineLocationMarker, HiOutlineTag } from "react-icons/hi";

const Events = () => {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    _id: "",
    title: "",
    category: "Technical",
    organizerClub: "",
    venue: "",
    capacity: 100,
    seatsAvailable: 100,
    entryFee: 0,
    tags: "",
    coordinatorName: "",
    coordinatorContact: "",
    sponsors: ""
  });

  const fetchEvents = async () => {
    try {
      const res = await getAllEvents();
      setEvents(res.data.data);
    } catch (err) {
      console.error("Failed to fetch events:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, []);

  const handleDelete = async (id, title) => {
    if (window.confirm(`Are you sure you want to delete event "${title}" (${id})?`)) {
      try {
        await deleteEvent(id);
        setEvents(events.filter(e => e._id !== id));
      } catch (err) {
        alert("Failed to delete event: " + (err.response?.data?.message || err.message));
      }
    }
  };

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        _id: formData._id.toUpperCase() || `EVT${Date.now().toString().slice(-4)}`,
        title: formData.title,
        category: formData.category,
        organizerClub: formData.organizerClub,
        venue: formData.venue,
        capacity: Number(formData.capacity),
        seatsAvailable: Number(formData.seatsAvailable),
        entryFee: Number(formData.entryFee),
        tags: formData.tags ? formData.tags.split(",").map(t => t.trim()) : [],
        coordinators: formData.coordinatorName ? [{ name: formData.coordinatorName, contact: formData.coordinatorContact }] : [],
        sponsors: formData.sponsors ? formData.sponsors.split(",").map(s => s.trim()) : []
      };

      await createEvent(payload);
      setShowModal(false);
      setFormData({
        _id: "",
        title: "",
        category: "Technical",
        organizerClub: "",
        venue: "",
        capacity: 100,
        seatsAvailable: 100,
        entryFee: 0,
        tags: "",
        coordinatorName: "",
        coordinatorContact: "",
        sponsors: ""
      });
      fetchEvents();
    } catch (err) {
      alert("Error creating event: " + (err.response?.data?.message || err.message));
    }
  };

  const filteredEvents = events.filter(event => {
    const matchesSearch = event.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      event.organizerClub.toLowerCase().includes(searchTerm.toLowerCase()) ||
      event._id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (event.tags && event.tags.some(t => t.toLowerCase().includes(searchTerm.toLowerCase())));

    const matchesCategory = selectedCategory === "All" || event.category === selectedCategory;

    return matchesSearch && matchesCategory;
  });

  const categories = ["All", "Technical", "Cultural", "Sports", "Workshop", "Seminar"];

  if (loading) return <Loader />;

  return (
    <div className="page-container">
      <PageHeader 
        title="Campus Events" 
        subtitle="Manage and organize all active campus events"
        action={
          <button className="btn btn-primary" onClick={() => setShowModal(true)}>
            <HiPlus /> Add New Event
          </button>
        }
      />

      {/* Filter and Search Toolbar */}
      <div className="toolbar">
        <div className="search-box">
          <HiSearch className="search-icon" />
          <input
            type="text"
            placeholder="Search by title, club, tag, or ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="category-pills">
          {categories.map(cat => (
            <button
              key={cat}
              className={`pill ${selectedCategory === cat ? "active" : ""}`}
              onClick={() => setSelectedCategory(cat)}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Events Grid */}
      {filteredEvents.length === 0 ? (
        <EmptyState title="No Events Found" message="Try adjusting your search criteria or create a new event." />
      ) : (
        <div className="cards-grid">
          {filteredEvents.map(event => (
            <div key={event._id} className="event-card">
              <div className="card-top">
                <span className="badge badge--id">{event._id}</span>
                <span className={`badge badge--${event.category.toLowerCase()}`}>{event.category}</span>
              </div>

              <h3 className="event-title">{event.title}</h3>
              <p className="event-club">Organized by {event.organizerClub}</p>

              <div className="event-meta">
                <div className="meta-item">
                  <HiOutlineLocationMarker /> <span>{event.venue}</span>
                </div>
                <div className="meta-item">
                  <HiOutlineUserGroup /> <span>{event.seatsAvailable} / {event.capacity} Seats Available</span>
                </div>
                <div className="meta-item">
                  <HiOutlineTicket /> <span>{event.entryFee === 0 ? "Free Entry" : `₹${event.entryFee} Entry Fee`}</span>
                </div>
              </div>

              {event.tags && event.tags.length > 0 && (
                <div className="tags-container">
                  <HiOutlineTag className="tag-icon" />
                  {event.tags.map((tag, i) => (
                    <span key={i} className="tag-chip">#{tag}</span>
                  ))}
                </div>
              )}

              <div className="card-actions">
                <Link to={`/events/${event._id}`} className="btn btn-secondary btn-sm">
                  <HiEye /> View Details
                </Link>
                <button className="btn btn-danger-outline btn-sm" onClick={() => handleDelete(event._id, event.title)}>
                  <HiTrash /> Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Event Modal */}
      {showModal && (
        <div className="modal-backdrop" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Create New Event</h3>
              <button className="close-btn" onClick={() => setShowModal(false)}>×</button>
            </div>
            <form onSubmit={handleCreateSubmit} className="modal-form">
              <div className="form-grid">
                <div className="form-group">
                  <label>Event ID (e.g. EVT104)</label>
                  <input
                    type="text"
                    required
                    placeholder="EVT104"
                    value={formData._id}
                    onChange={(e) => setFormData({ ...formData, _id: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label>Title</label>
                  <input
                    type="text"
                    required
                    placeholder="Web Dev Sprint"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label>Category</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  >
                    <option value="Technical">Technical</option>
                    <option value="Cultural">Cultural</option>
                    <option value="Sports">Sports</option>
                    <option value="Workshop">Workshop</option>
                    <option value="Seminar">Seminar</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Organizer Club</label>
                  <input
                    type="text"
                    required
                    placeholder="Coding Club"
                    value={formData.organizerClub}
                    onChange={(e) => setFormData({ ...formData, organizerClub: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label>Venue</label>
                  <input
                    type="text"
                    required
                    placeholder="Auditorium B"
                    value={formData.venue}
                    onChange={(e) => setFormData({ ...formData, venue: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label>Total Capacity</label>
                  <input
                    type="number"
                    required
                    value={formData.capacity}
                    onChange={(e) => setFormData({ ...formData, capacity: e.target.value, seatsAvailable: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label>Entry Fee (₹)</label>
                  <input
                    type="number"
                    required
                    value={formData.entryFee}
                    onChange={(e) => setFormData({ ...formData, entryFee: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label>Tags (comma separated)</label>
                  <input
                    type="text"
                    placeholder="coding, web, frontend"
                    value={formData.tags}
                    onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label>Coordinator Name</label>
                  <input
                    type="text"
                    placeholder="Aarav Sharma"
                    value={formData.coordinatorName}
                    onChange={(e) => setFormData({ ...formData, coordinatorName: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label>Coordinator Contact</label>
                  <input
                    type="email"
                    placeholder="aarav@college.edu"
                    value={formData.coordinatorContact}
                    onChange={(e) => setFormData({ ...formData, coordinatorContact: e.target.value })}
                  />
                </div>
              </div>

              <div className="modal-actions">
                <button type="button" className="btn btn-ghost" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Create Event</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Events;
