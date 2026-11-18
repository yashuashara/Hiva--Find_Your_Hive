import { useCallback, useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { getClubAnalytics, listClubs, errorMessage } from "../services/api";
import { useAuth } from "../context/AuthContext";
import PageHeader from "../components/PageHeader";
import StatCard from "../components/StatCard";
import EmptyState from "../components/EmptyState";
import { SkeletonStats } from "../components/Skeleton";
import { TimeBarChart } from "../components/charts";
import EventPerformanceTable from "../components/EventPerformanceTable";
import { formatDate, formatTime } from "../utils/format";
import { HiOutlineCalendar, HiOutlineTicket, HiOutlineCheckCircle, HiOutlineChartBar, HiPlus } from "react-icons/hi";

// Analytics for one club, for its owners/organizers (and admins).
const ClubDashboard = () => {
  const { isAdmin, activeClubs } = useAuth();
  const [params, setParams] = useSearchParams();
  const [clubs, setClubs] = useState(null);
  const [data, setData] = useState(null);
  const [error, setError] = useState("");

  // Which clubs can this person see dashboards for?
  useEffect(() => {
    if (isAdmin) {
      listClubs({ limit: 50 })
        .then((res) => setClubs(res.data.data.map((c) => ({ id: c._id, name: c.name }))))
        .catch((err) => setError(errorMessage(err)));
    } else {
      setClubs(
        activeClubs
          .filter((m) => ["owner", "organizer"].includes(m.role))
          .map((m) => ({ id: m.club._id, name: m.club.name }))
      );
    }
  }, [isAdmin, activeClubs]);

  const clubId = params.get("club") || clubs?.[0]?.id;

  const load = useCallback(async () => {
    if (!clubId) return;
    setData(null);
    setError("");
    try {
      const res = await getClubAnalytics(clubId);
      setData(res.data.data);
    } catch (err) {
      setError(errorMessage(err));
    }
  }, [clubId]);

  useEffect(() => {
    load();
  }, [load]);

  if (clubs && clubs.length === 0) {
    return (
      <div className="page-container">
        <EmptyState title="No club dashboards yet" message="Club owners and organizers see their club's numbers here." />
      </div>
    );
  }

  const t = data?.totals;
  return (
    <div className="page-container">
      <PageHeader
        title={data ? data.club.name : "Club dashboard"}
        subtitle="Registrations, attendance and event performance"
        action={
          <div className="club-picker">
            {clubs && clubs.length > 1 && (
              <div className="filters-group">
                <label htmlFor="club-pick" className="sr-only">Club</label>
                <select id="club-pick" value={clubId || ""} onChange={(e) => setParams({ club: e.target.value })}>
                  {clubs.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
            )}
            <Link to="/manage/events/new" className="btn btn-primary"><HiPlus aria-hidden="true" /> New event</Link>
          </div>
        }
      />

      {error ? (
        <EmptyState error title="Couldn't load this dashboard" message={error} onRetry={load} />
      ) : !data ? (
        <SkeletonStats />
      ) : (
        <>
          <div className="stats-grid">
            <StatCard icon={<HiOutlineCalendar />} label={`Events · ${t.upcoming} upcoming`} value={t.events} color="blue" />
            <StatCard icon={<HiOutlineTicket />} label={`Registrations · ${data.followers} followers`} value={t.registrations} color="purple" />
            <StatCard icon={<HiOutlineCheckCircle />} label={`Attendance at past events · ${t.checkedIn} checked in`} value={t.attendanceRate === null ? "n/a" : `${t.attendanceRate}%`} color="green" />
            <StatCard icon={<HiOutlineChartBar />} label="Seats filled" value={`${t.capacityUtilization}%`} color="orange" />
          </div>

          <div className="charts-grid">
            <section className="chart-card">
              <h3>Registrations per day</h3>
              <TimeBarChart data={data.trend} title="Registrations per day" />
            </section>
            <section className="chart-card">
              <h3>Recent registrations</h3>
              {data.recentRegistrations.length ? (
                <ul className="member-list">
                  {data.recentRegistrations.map((r, i) => (
                    <li key={i} className="member-row">
                      <div>
                        <span className="cell-bold">{r.name}</span>
                        <div className="muted">{r.event}</div>
                      </div>
                      <span className="muted">{formatDate(r.at)}, {formatTime(r.at)}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="muted">No registrations yet.</p>
              )}
            </section>
          </div>

          <section className="dashboard-section">
            <div className="section-header">
              <h2>Event performance</h2>
              <Link to="/manage/events" className="text-link">All events →</Link>
            </div>
            <EventPerformanceTable events={data.events} />
          </section>
        </>
      )}
    </div>
  );
};

export default ClubDashboard;
