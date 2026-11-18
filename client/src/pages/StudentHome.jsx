import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getMyDashboard, myRegistrations, errorMessage } from "../services/api";
import { useAuth } from "../context/AuthContext";
import PageHeader from "../components/PageHeader";
import StatCard from "../components/StatCard";
import EventCard from "../components/EventCard";
import EmptyState from "../components/EmptyState";
import { SkeletonCards, SkeletonStats } from "../components/Skeleton";
import { formatDateRange } from "../utils/format";
import { HiOutlineTicket, HiOutlineCheckCircle, HiOutlineCalendar, HiOutlineUserGroup, HiOutlineChartBar } from "react-icons/hi";

// Personal home for signed-in students (and organizers, who are students too).
const StudentHome = () => {
  const { user, profileComplete, activeClubs } = useAuth();
  const [data, setData] = useState(null);
  const [next, setNext] = useState([]);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setError("");
    try {
      const [dash, upcoming] = await Promise.all([getMyDashboard(), myRegistrations("upcoming")]);
      setData(dash.data.data);
      setNext(
        upcoming.data.data
          .filter((t) => t.event)
          .sort((a, b) => new Date(a.event.startsAt || 0) - new Date(b.event.startsAt || 0))
          .slice(0, 3)
      );
    } catch (err) {
      setError(errorMessage(err));
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const firstName = user.name.split(" ")[0];
  const organizerClubs = activeClubs.filter((m) => ["owner", "organizer"].includes(m.role));

  return (
    <div className="page-container">
      <PageHeader title={`Hi, ${firstName}`} subtitle="Your events, tickets and picks for you" />

      {!profileComplete && (
        <div className="notice notice--info">
          Add your PRN, department and year on your <Link className="text-link" to="/profile">profile</Link> so you can register for events in one tap.
        </div>
      )}

      {organizerClubs.length > 0 && (
        <div className="action-bar">
          <span className="muted">You organize for {organizerClubs.map((m) => m.club.name).join(", ")}.</span>
          <Link to="/manage/dashboard" className="btn btn-secondary btn-sm"><HiOutlineChartBar aria-hidden="true" /> Club dashboard</Link>
          <Link to="/manage/events" className="btn btn-ghost btn-sm">Manage events</Link>
        </div>
      )}

      {error ? (
        <EmptyState error title="Couldn't load your dashboard" message={error} onRetry={load} />
      ) : !data ? (
        <>
          <SkeletonStats />
          <SkeletonCards count={3} />
        </>
      ) : (
        <>
          <div className="stats-grid">
            <StatCard icon={<HiOutlineTicket />} label="Upcoming tickets" value={data.counts.upcoming} color="blue" />
            <StatCard icon={<HiOutlineCheckCircle />} label="Events attended" value={data.counts.attended} color="green" />
            <StatCard icon={<HiOutlineCalendar />} label="Total registrations" value={data.counts.total} color="purple" />
            <StatCard icon={<HiOutlineUserGroup />} label="Clubs followed" value={data.following.length} color="orange" />
          </div>

          <section className="dashboard-section">
            <div className="section-header">
              <h2>Your next events</h2>
              <Link to="/tickets" className="text-link">All tickets →</Link>
            </div>
            {next.length ? (
              <ul className="review-list">
                {next.map((t) => (
                  <li key={t.ticketId} className="review-item">
                    <div>
                      <Link className="text-link cell-bold" to={`/events/${encodeURIComponent(t.event._id)}`}>{t.event.title}</Link>
                      <p className="muted">{formatDateRange(t.event.startsAt, t.event.endsAt)} · {t.event.venue}</p>
                    </div>
                    <Link to="/tickets" className="btn btn-secondary btn-sm"><HiOutlineTicket aria-hidden="true" /> Show ticket</Link>
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState title="No upcoming tickets" message="Register for an event and your ticket will appear here." />
            )}
          </section>

          <section className="dashboard-section">
            <div className="section-header">
              <h2>Recommended for you</h2>
              <Link to="/events" className="text-link">Browse all →</Link>
            </div>
            {data.recommended.length ? (
              <div className="cards-grid">{data.recommended.map((e) => <EventCard key={e._id} event={e} />)}</div>
            ) : (
              <EmptyState title="No recommendations right now" message="Follow some clubs and we'll suggest events you'll like." />
            )}
          </section>

          {data.following.length > 0 && (
            <section className="dashboard-section">
              <h2>Clubs you follow</h2>
              <div className="club-strip">
                {data.following.map((c) => (
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
        </>
      )}
    </div>
  );
};

export default StudentHome;
