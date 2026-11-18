import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getAdminAnalytics, errorMessage } from "../services/api";
import PageHeader from "../components/PageHeader";
import StatCard from "../components/StatCard";
import EmptyState from "../components/EmptyState";
import { SkeletonStats } from "../components/Skeleton";
import { TimeBarChart, HBarList } from "../components/charts";
import EventPerformanceTable from "../components/EventPerformanceTable";
import { HiOutlineCalendar, HiOutlineTicket, HiOutlineCheckCircle, HiOutlineUsers } from "react-icons/hi";

// University admin dashboard. All numbers are computed on the server.
const Dashboard = () => {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setError("");
    try {
      const res = await getAdminAnalytics();
      setData(res.data.data);
    } catch (err) {
      setError(errorMessage(err));
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (error) {
    return <div className="page-container"><EmptyState error title="Couldn't load the dashboard" message={error} onRetry={load} /></div>;
  }

  const t = data?.totals;
  const pendingTotal = data ? data.pending.clubs + data.pending.events + data.pending.memberships : 0;

  return (
    <div className="page-container">
      <PageHeader
        title="Dashboard"
        subtitle="Platform overview for your university"
        action={<Link to="/analytics" className="btn btn-secondary">Full reports</Link>}
      />

      {!data ? (
        <SkeletonStats />
      ) : (
        <>
          <div className="stats-grid">
            <StatCard icon={<HiOutlineCalendar />} label={`Events · ${t.upcoming} upcoming`} value={t.events} color="blue" />
            <StatCard icon={<HiOutlineTicket />} label="Active registrations" value={t.registrations} color="purple" />
            <StatCard icon={<HiOutlineCheckCircle />} label={`Attendance at past events · ${t.checkedIn} checked in`} value={t.attendanceRate === null ? "n/a" : `${t.attendanceRate}%`} color="green" />
            <StatCard icon={<HiOutlineUsers />} label={`Accounts · ${data.clubs.approved || 0} clubs`} value={data.users} color="orange" />
          </div>

          <section className="dashboard-section">
            <h2>Needs your attention</h2>
            {pendingTotal === 0 ? (
              <p className="muted">Nothing waiting for review. 🎉</p>
            ) : (
              <div className="pending-list">
                <Link to="/admin/approvals" className="pending-item"><strong>{data.pending.clubs}</strong> club requests</Link>
                <Link to="/admin/approvals" className="pending-item"><strong>{data.pending.events}</strong> events to approve</Link>
                <Link to="/admin/approvals" className="pending-item"><strong>{data.pending.memberships}</strong> team requests</Link>
              </div>
            )}
          </section>

          <div className="charts-grid">
            <section className="chart-card">
              <h3>Registrations per day</h3>
              <TimeBarChart data={data.trend} title="Registrations per day" />
            </section>
            <section className="chart-card">
              <h3>Most registered events</h3>
              <HBarList items={data.topEvents.map((e) => ({ label: e.title, value: e.registered }))} emptyText="No registrations yet." />
            </section>
          </div>

          <section className="dashboard-section">
            <div className="section-header">
              <h2>Recent events</h2>
              <Link to="/manage/events" className="text-link">Manage events →</Link>
            </div>
            <EventPerformanceTable events={data.events.slice(0, 8)} showClub />
          </section>
        </>
      )}
    </div>
  );
};

export default Dashboard;
