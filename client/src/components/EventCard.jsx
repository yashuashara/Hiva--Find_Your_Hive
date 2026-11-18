import { Link } from "react-router-dom";
import { formatDateRange } from "../utils/format";
import { HiOutlineUserGroup, HiOutlineLocationMarker, HiOutlineCalendar } from "react-icons/hi";

const month = new Intl.DateTimeFormat("en-IN", { month: "short" });

const REASONS = { followed_club: "From a club you follow", category: "Similar to events you joined" };

// Event card used across discovery, clubs, landing and dashboards.
const EventCard = ({ event }) => {
  const href = `/events/${encodeURIComponent(event._id)}`;
  const start = event.startsAt ? new Date(event.startsAt) : null;
  const reason = event.recommendation?.reasons?.[0];

  return (
    <article className="event-card">
      <Link to={href} className="event-card-banner" data-category={event.category} tabIndex={-1} aria-hidden="true">
        {event.bannerUrl && <img src={event.bannerUrl} alt="" loading="lazy" referrerPolicy="no-referrer" />}
        {start && (
          <span className="date-chip">
            <span className="date-chip-month">{month.format(start)}</span>
            <span className="date-chip-day">{start.getDate()}</span>
          </span>
        )}
      </Link>
      <div className="event-card-body">
        <div className="card-top">
          <span className={`badge badge--${event.category.toLowerCase()}`}>{event.category}</span>
          {event.entryFee === 0 ? <span className="badge badge--success">Free</span> : <span className="badge">₹{event.entryFee}</span>}
        </div>
        <h3 className="event-title">
          <Link to={href} className="card-link">{event.title}</Link>
        </h3>
        <p className="event-club">
          by{" "}
          {event.club?.slug ? <Link to={`/clubs/${event.club.slug}`} className="text-link">{event.organizerClub}</Link> : event.organizerClub}
        </p>
        <div className="event-meta">
          <div className="meta-item"><HiOutlineCalendar aria-hidden="true" /> <span>{formatDateRange(event.startsAt, event.endsAt)}</span></div>
          <div className="meta-item"><HiOutlineLocationMarker aria-hidden="true" /> <span>{event.venue}</span></div>
          <div className="meta-item">
            <HiOutlineUserGroup aria-hidden="true" />
            <span>
              {event.status === "completed" ? "Event completed" : event.seatsAvailable > 0 ? `${event.seatsAvailable} of ${event.capacity} seats left` : "Fully booked"}
            </span>
          </div>
        </div>
        {reason && <span className="why-chip">{REASONS[reason]}</span>}
      </div>
    </article>
  );
};

export default EventCard;
