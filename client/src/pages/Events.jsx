import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { listEvents, errorMessage } from "../services/api";
import { useAuth } from "../context/AuthContext";
import useDebounce from "../hooks/useDebounce";
import PageHeader from "../components/PageHeader";
import Loader from "../components/Loader";
import EmptyState from "../components/EmptyState";
import Pagination from "../components/Pagination";
import { formatDateRange } from "../utils/format";
import { HiPlus, HiSearch, HiOutlineTicket, HiOutlineUserGroup, HiOutlineLocationMarker, HiOutlineCalendar } from "react-icons/hi";

const CATEGORIES = ["Technical", "Cultural", "Sports", "Workshop", "Seminar"];

export const EventCard = ({ event }) => (
  <article className="event-card">
    <div className="card-top">
      <span className={`badge badge--${event.category.toLowerCase()}`}>{event.category}</span>
      {event.entryFee === 0 ? <span className="badge badge--success">Free</span> : <span className="badge badge--event">₹{event.entryFee}</span>}
    </div>

    <h3 className="event-title">
      <Link to={`/events/${encodeURIComponent(event._id)}`} className="card-link">{event.title}</Link>
    </h3>
    <p className="event-club">
      by{" "}
      {event.club?.slug ? <Link to={`/clubs/${event.club.slug}`} className="text-link">{event.organizerClub}</Link> : event.organizerClub}
    </p>

    <div className="event-meta">
      <div className="meta-item">
        <HiOutlineCalendar aria-hidden="true" /> <span>{formatDateRange(event.startsAt, event.endsAt)}</span>
      </div>
      <div className="meta-item">
        <HiOutlineLocationMarker aria-hidden="true" /> <span>{event.venue}</span>
      </div>
      <div className="meta-item">
        <HiOutlineUserGroup aria-hidden="true" />
        <span>{event.status === "completed" ? "Event completed" : event.seatsAvailable > 0 ? `${event.seatsAvailable} of ${event.capacity} seats left` : "Fully booked"}</span>
      </div>
    </div>

    {event.tags?.length > 0 && (
      <div className="tags-container">
        {event.tags.slice(0, 4).map((tag) => (
          <span key={tag} className="tag-chip">#{tag}</span>
        ))}
      </div>
    )}

    <div className="card-actions">
      <Link to={`/events/${encodeURIComponent(event._id)}`} className="btn btn-secondary btn-sm">
        <HiOutlineTicket aria-hidden="true" /> View details
      </Link>
    </div>
  </article>
);

const Events = () => {
  const { canManageEvents } = useAuth();
  const [events, setEvents] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [when, setWhen] = useState("upcoming");
  const [price, setPrice] = useState("");
  const [page, setPage] = useState(1);
  const q = useDebounce(search.trim());

  // Any filter change goes back to page 1.
  useEffect(() => setPage(1), [q, category, when, price]);

  const fetchEvents = useCallback(async () => {
    setLoading(true);
    setLoadError("");
    try {
      const params = { when, page, limit: 12 };
      if (q) params.q = q;
      if (category) params.category = category;
      if (price) params.price = price;
      const res = await listEvents(params);
      setEvents(res.data.data);
      setPagination(res.data.pagination);
    } catch (err) {
      setLoadError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [q, category, when, price, page]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  const filtersActive = q || category || price;

  return (
    <div className="page-container">
      <PageHeader
        title="Discover events"
        subtitle="Workshops, fests, talks and more from clubs across campus"
        action={canManageEvents && (
          <Link to="/manage/events/new" className="btn btn-primary">
            <HiPlus aria-hidden="true" /> Create event
          </Link>
        )}
      />

      <div className="tabs" role="tablist" aria-label="Event timeframe">
        {[["upcoming", "Upcoming"], ["past", "Past"], ["all", "All"]].map(([value, label]) => (
          <button
            key={value}
            type="button"
            role="tab"
            aria-selected={when === value}
            className={`tab ${when === value ? "active" : ""}`}
            onClick={() => setWhen(value)}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="toolbar">
        <div className="search-box">
          <HiSearch className="search-icon" aria-hidden="true" />
          <input
            type="search"
            aria-label="Search events"
            placeholder="Search by event, club, venue or tag..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="filters-group">
          <select aria-label="Category" value={category} onChange={(e) => setCategory(e.target.value)}>
            <option value="">All categories</option>
            {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <select aria-label="Price" value={price} onChange={(e) => setPrice(e.target.value)}>
            <option value="">Free &amp; paid</option>
            <option value="free">Free only</option>
            <option value="paid">Paid only</option>
          </select>
        </div>
      </div>

      {loading ? (
        <Loader />
      ) : loadError ? (
        <EmptyState error title="Couldn't load events" message={loadError} onRetry={fetchEvents} />
      ) : events.length === 0 ? (
        <EmptyState
          title="No events found"
          message={filtersActive ? "Try a different search or filter." : when === "upcoming" ? "No upcoming events right now. Check back soon!" : "Nothing here yet."}
        />
      ) : (
        <>
          <div className="cards-grid">
            {events.map((event) => <EventCard key={event._id} event={event} />)}
          </div>
          <Pagination pagination={pagination} onPage={setPage} />
        </>
      )}
    </div>
  );
};

export default Events;
