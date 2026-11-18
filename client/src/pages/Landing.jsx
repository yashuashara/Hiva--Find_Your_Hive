import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { listEvents, listClubs } from "../services/api";
import EventCard from "../components/EventCard";
import EmptyState from "../components/EmptyState";
import { SkeletonCards } from "../components/Skeleton";
import { HiOutlineUserGroup, HiSearch } from "react-icons/hi";

// Public home page for visitors who are not signed in.
const Landing = () => {
  const navigate = useNavigate();
  const [events, setEvents] = useState(null);
  const [clubs, setClubs] = useState([]);
  const [query, setQuery] = useState("");

  useEffect(() => {
    listEvents({ when: "upcoming", limit: 6 })
      .then((res) => setEvents(res.data.data))
      .catch(() => setEvents([]));
    listClubs({ limit: 12 })
      .then((res) => setClubs(res.data.data))
      .catch(() => setClubs([]));
  }, []);

  const search = (e) => {
    e.preventDefault();
    navigate(query.trim() ? `/events?q=${encodeURIComponent(query.trim())}` : "/events");
  };

  return (
    <div className="page-container">
      <section className="landing-hero">
        <h1>Every campus event, one place.</h1>
        <p>Discover workshops, fests and talks from student clubs, register in seconds, and walk in with a QR ticket on your phone.</p>
        <form className="hero-search" role="search" onSubmit={search}>
          <label htmlFor="hero-q" className="sr-only">Search events</label>
          <input id="hero-q" type="search" placeholder="Search hackathons, music, workshops..." value={query} onChange={(e) => setQuery(e.target.value)} />
          <button type="submit" className="btn btn-primary"><HiSearch aria-hidden="true" /> Search</button>
        </form>
        <div className="hero-actions">
          <Link to="/signup" className="btn btn-primary btn-lg">Create free account</Link>
          <Link to="/events" className="btn btn-secondary btn-lg">Browse events</Link>
        </div>
      </section>

      <section className="dashboard-section">
        <div className="section-header">
          <h2>Coming up</h2>
          <Link to="/events" className="text-link">See all events →</Link>
        </div>
        {events === null ? (
          <SkeletonCards count={3} />
        ) : events.length ? (
          <div className="cards-grid">{events.map((e) => <EventCard key={e._id} event={e} />)}</div>
        ) : (
          <EmptyState title="No upcoming events yet" message="Clubs are getting ready. Check back soon." />
        )}
      </section>

      {clubs.length > 0 && (
        <section className="dashboard-section">
          <div className="section-header">
            <h2>Clubs on campus</h2>
            <Link to="/clubs" className="text-link">All clubs →</Link>
          </div>
          <div className="club-strip">
            {clubs.map((c) => (
              <Link key={c._id} to={`/clubs/${c.slug}`} className="club-pill">
                {c.logoUrl ? (
                  <img src={c.logoUrl} alt="" className="club-logo" referrerPolicy="no-referrer" />
                ) : (
                  <span className="club-logo club-logo--placeholder" aria-hidden="true"><HiOutlineUserGroup /></span>
                )}
                {c.name}
              </Link>
            ))}
          </div>
        </section>
      )}

      <section className="dashboard-section">
        <h2>How it works</h2>
        <div className="steps-grid">
          <div className="step-card">
            <div className="step-num">1</div>
            <h3>Find something you love</h3>
            <p>Search by name, club, category or date. Follow clubs to get better recommendations.</p>
          </div>
          <div className="step-card">
            <div className="step-num">2</div>
            <h3>Register in one tap</h3>
            <p>Add your PRN once. Seats are reserved instantly and never oversold.</p>
          </div>
          <div className="step-card">
            <div className="step-num">3</div>
            <h3>Show your QR at the door</h3>
            <p>Your ticket lives in My Tickets, or download it as a PDF. Organizers scan it in a second.</p>
          </div>
          <div className="step-card">
            <div className="step-num">4</div>
            <h3>Run your club's events</h3>
            <p>Request a club, create events, track registrations and check people in, all in one place.</p>
          </div>
        </div>
      </section>

      <p className="disclaimer">
        Event Engine &amp; Ticket Club is an independent student project and is not an official service of any university.
      </p>
    </div>
  );
};

export default Landing;
