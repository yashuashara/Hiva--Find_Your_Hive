import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";
import { getAllEvents, createEvent, deleteEvent, errorMessage } from "../services/api";
import { useAuth } from "../context/AuthContext";
import PageHeader from "../components/PageHeader";
import Loader from "../components/Loader";
import EmptyState from "../components/EmptyState";
import { HiPlus, HiSearch, HiTrash, HiEye, HiOutlineTicket, HiOutlineUserGroup, HiOutlineLocationMarker, HiOutlineTag } from "react-icons/hi";

const CATEGORIES = ["Technical", "Cultural", "Sports", "Workshop", "Seminar"];

const EMPTY_FORM = {
  _id: "",
  title: "",
  category: "Technical",
  organizerClub: "",
  venue: "",
  capacity: 100,
  entryFee: 0,
  tags: "",
  coordinatorName: "",
  coordinatorContact: "",
  sponsors: ""
};

const splitList = (value) => (value ? value.split(",").map((v) => v.trim()).filter(Boolean) : []);

const Events = () => {
  const { isAdmin } = useAuth();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState(EMPTY_FORM);

  const fetchEvents = async () => {
    try {
      setLoadError("");
      const res = await getAllEvents();
      setEvents(res.data.data);
    } catch (err) {
      setLoadError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, []);

  const handleDelete = async (id, title) => {
    if (!window.confirm(`Are you sure you want to delete event "${title}" (${id})?`)) return;
    try {
      await deleteEvent(id);
      setEvents((prev) => prev.filter((e) => e._id !== id));
      toast.success("Event deleted");
    } catch (err) {
      toast.error(errorMessage(err));
    }
  };

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      // Seats available (and the event ID, if left blank) are set by the server.
      await createEvent({
        _id: formData._id.trim().toUpperCase(),
        title: formData.title,
        category: formData.category,
        organizerClub: formData.organizerClub,
        venue: formData.venue,
        capacity: Number(formData.capacity),
        entryFee: Number(formData.entryFee),
        tags: splitList(formData.tags),
        coordinators: formData.coordinatorName
          ? [{ name: formData.coordinatorName, contact: formData.coordinatorContact }]
          : [],
        sponsors: splitList(formData.sponsors)
      });
      toast.success("Event created");
      setShowModal(false);
      setFormData(EMPTY_FORM);
      fetchEvents();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  const term = searchTerm.toLowerCase();
  const filteredEvents = events.filter((event) => {
    const matchesSearch =
      event.title.toLowerCase().includes(term) ||
      event.organizerClub.toLowerCase().includes(term) ||
      event._id.toLowerCase().includes(term) ||
      (event.tags && event.tags.some((t) => t.toLowerCase().includes(term)));
    const matchesCategory = selectedCategory === "All" || event.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const field = (name) => ({
    id: `ev-${name}`,
    value: formData[name],
    onChange: (e) => setFormData({ ...formData, [name]: e.target.value })
  });

  if (loading) return <Loader />;
  if (loadError) {
    return (
      <div className="page-container">
        <EmptyState error title="Couldn't load events" message={loadError} onRetry={() => { setLoading(true); fetchEvents(); }} />
      </div>
    );
  }

  return (
    <div className="page-container">
      <PageHeader
        title="Campus Events"
        subtitle={isAdmin ? "Manage and organize all active campus events" : "Discover what's happening on campus"}
        action={isAdmin && (
          <button type="button" className="btn btn-primary" onClick={() => setShowModal(true)}>
            <HiPlus aria-hidden="true" /> Add New Event
          </button>
        )}
      />

      {/* Filter and Search Toolbar */}
      <div className="toolbar">
        <div className="search-box">
          <HiSearch className="search-icon" aria-hidden="true" />
          <input
            type="search"
            aria-label="Search events"
            placeholder="Search by title, club, tag, or ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="category-pills" role="group" aria-label="Filter by category">
          {["All", ...CATEGORIES].map((cat) => (
            <button
              key={cat}
              type="button"
              aria-pressed={selectedCategory === cat}
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
        <EmptyState
          title="No events found"
          message={events.length ? "Try a different search or category." : "There are no events yet. Check back soon!"}
        />
      ) : (
        <div className="cards-grid">
          {filteredEvents.map((event) => (
            <article key={event._id} className="event-card">
              <div className="card-top">
                <span className="badge badge--id">{event._id}</span>
                <span className={`badge badge--${event.category.toLowerCase()}`}>{event.category}</span>
              </div>

              <h3 className="event-title">{event.title}</h3>
              <p className="event-club">Organized by {event.organizerClub}</p>

              <div className="event-meta">
                <div className="meta-item">
                  <HiOutlineLocationMarker aria-hidden="true" /> <span>{event.venue}</span>
                </div>
                <div className="meta-item">
                  <HiOutlineUserGroup aria-hidden="true" />
                  <span>{event.seatsAvailable > 0 ? `${event.seatsAvailable} / ${event.capacity} seats available` : "Fully booked"}</span>
                </div>
                <div className="meta-item">
                  <HiOutlineTicket aria-hidden="true" /> <span>{event.entryFee === 0 ? "Free entry" : `₹${event.entryFee} entry fee`}</span>
                </div>
              </div>

              {event.tags && event.tags.length > 0 && (
                <div className="tags-container">
                  <HiOutlineTag className="tag-icon" aria-hidden="true" />
                  {event.tags.map((tag) => (
                    <span key={tag} className="tag-chip">#{tag}</span>
                  ))}
                </div>
              )}

              <div className="card-actions">
                <Link to={`/events/${encodeURIComponent(event._id)}`} className="btn btn-secondary btn-sm">
                  <HiEye aria-hidden="true" /> View Details
                </Link>
                {isAdmin && (
                  <button type="button" className="btn btn-danger-outline btn-sm" onClick={() => handleDelete(event._id, event.title)}>
                    <HiTrash aria-hidden="true" /> Delete
                  </button>
                )}
              </div>
            </article>
          ))}
        </div>
      )}

      {/* Create Event Modal (admins only) */}
      {isAdmin && showModal && (
        <div className="modal-backdrop" onClick={() => setShowModal(false)}>
          <div
            className="modal-content"
            role="dialog"
            aria-modal="true"
            aria-labelledby="create-event-title"
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => e.key === "Escape" && setShowModal(false)}
          >
            <div className="modal-header">
              <h3 id="create-event-title">Create New Event</h3>
              <button type="button" className="close-btn" aria-label="Close" onClick={() => setShowModal(false)}>×</button>
            </div>
            <form onSubmit={handleCreateSubmit} className="modal-form">
              <div className="form-grid">
                <div className="form-group">
                  <label htmlFor="ev-title">Title</label>
                  <input type="text" required autoFocus maxLength={150} placeholder="Web Dev Sprint" {...field("title")} />
                </div>
                <div className="form-group">
                  <label htmlFor="ev-_id">Event ID (optional)</label>
                  <input type="text" maxLength={20} placeholder="Auto-generated if blank" {...field("_id")} />
                </div>
                <div className="form-group">
                  <label htmlFor="ev-category">Category</label>
                  <select {...field("category")}>
                    {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label htmlFor="ev-organizerClub">Organizer Club</label>
                  <input type="text" required maxLength={100} placeholder="Coding Club" {...field("organizerClub")} />
                </div>
                <div className="form-group">
                  <label htmlFor="ev-venue">Venue</label>
                  <input type="text" required maxLength={150} placeholder="Auditorium B" {...field("venue")} />
                </div>
                <div className="form-group">
                  <label htmlFor="ev-capacity">Total Capacity</label>
                  <input type="number" required min={1} {...field("capacity")} />
                </div>
                <div className="form-group">
                  <label htmlFor="ev-entryFee">Entry Fee (₹)</label>
                  <input type="number" required min={0} {...field("entryFee")} />
                </div>
                <div className="form-group">
                  <label htmlFor="ev-tags">Tags (comma separated)</label>
                  <input type="text" placeholder="coding, web, frontend" {...field("tags")} />
                </div>
                <div className="form-group">
                  <label htmlFor="ev-sponsors">Sponsors (comma separated)</label>
                  <input type="text" placeholder="TechCorp, DevStudio" {...field("sponsors")} />
                </div>
                <div className="form-group">
                  <label htmlFor="ev-coordinatorName">Coordinator Name</label>
                  <input type="text" placeholder="Aarav Sharma" {...field("coordinatorName")} />
                </div>
                <div className="form-group">
                  <label htmlFor="ev-coordinatorContact">Coordinator Contact</label>
                  <input type="email" placeholder="coordinator@example.com" required={!!formData.coordinatorName} {...field("coordinatorContact")} />
                </div>
              </div>

              <div className="modal-actions">
                <button type="button" className="btn btn-ghost" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting ? "Creating..." : "Create Event"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Events;
