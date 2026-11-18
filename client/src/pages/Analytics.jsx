import { useState, useEffect } from "react";
import { getAllEvents, getAllRegistrations, errorMessage } from "../services/api";
import PageHeader from "../components/PageHeader";
import Loader from "../components/Loader";
import StatCard from "../components/StatCard";
import EmptyState from "../components/EmptyState";

const pct = (part, whole) => (whole ? Math.round((part / whole) * 100) : 0);
import { HiOutlineChartBar, HiOutlineBadgeCheck, HiOutlineUserGroup, HiOutlineCurrencyRupee } from "react-icons/hi";

const Analytics = () => {
  const [events, setEvents] = useState([]);
  const [registrations, setRegistrations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  const fetchData = async () => {
    try {
      setLoadError("");
      const [eventsRes, regsRes] = await Promise.all([getAllEvents(), getAllRegistrations()]);
      setEvents(eventsRes.data.data);
      setRegistrations(regsRes.data.data);
    } catch (err) {
      setLoadError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  if (loading) return <Loader />;
  if (loadError) {
    return (
      <div className="page-container">
        <EmptyState error title="Couldn't load analytics" message={loadError} onRetry={() => { setLoading(true); fetchData(); }} />
      </div>
    );
  }

  const totalRegs = registrations.length;
  const totalCheckedIn = registrations.filter(r => r.checkInStatus).length;
  // Only verified (Completed) payments count as revenue.
  const totalRevenue = registrations
    .filter(r => r.paymentDetails?.status === "Completed")
    .reduce((sum, r) => sum + (r.paymentDetails?.amountPaid || 0), 0);

  // Department distribution
  const deptMap = registrations.reduce((acc, r) => {
    acc[r.department] = (acc[r.department] || 0) + 1;
    return acc;
  }, {});

  // Event distribution
  const eventMap = registrations.reduce((acc, r) => {
    acc[r.eventId] = (acc[r.eventId] || 0) + 1;
    return acc;
  }, {});

  // Payment status distribution
  const paymentStatusMap = registrations.reduce((acc, r) => {
    const status = r.paymentDetails?.status || "Unknown";
    acc[status] = (acc[status] || 0) + 1;
    return acc;
  }, {});

  return (
    <div className="page-container">
      <PageHeader title="Analytics & Reports" subtitle="Comprehensive performance metrics and student engagement statistics" />

      <div className="stats-grid">
        <StatCard icon={<HiOutlineUserGroup />} label="Total Registrations" value={totalRegs} color="blue" />
        <StatCard icon={<HiOutlineBadgeCheck />} label="Check-In Rate" value={`${pct(totalCheckedIn, totalRegs)}%`} color="green" />
        <StatCard icon={<HiOutlineChartBar />} label="Active Events" value={events.length} color="purple" />
        <StatCard icon={<HiOutlineCurrencyRupee />} label="Verified Revenue" value={`₹${totalRevenue.toLocaleString()}`} color="orange" />
      </div>

      <div className="analytics-grid">
        {/* Registrations per Event */}
        <div className="analytics-card">
          <h3>Registrations by Event</h3>
          <div className="bar-chart-list">
            {events.map(ev => {
              const count = eventMap[ev._id] || 0;
              const pct = totalRegs ? Math.round((count / totalRegs) * 100) : 0;
              return (
                <div key={ev._id} className="bar-chart-item">
                  <div className="bar-label">
                    <span><strong>{ev._id}</strong> - {ev.title}</span>
                    <span>{count} ({pct}%)</span>
                  </div>
                  <div className="bar-track">
                    <div className="bar-fill bar-fill-primary" style={{ width: `${pct}%` }}></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Department Breakdown */}
        <div className="analytics-card">
          <h3>Department Participation</h3>
          <div className="bar-chart-list">
            {Object.entries(deptMap)
              .sort((a, b) => b[1] - a[1])
              .map(([dept, count]) => {
                const pct = totalRegs ? Math.round((count / totalRegs) * 100) : 0;
                return (
                  <div key={dept} className="bar-chart-item">
                    <div className="bar-label">
                      <span>{dept}</span>
                      <span>{count} students ({pct}%)</span>
                    </div>
                    <div className="bar-track">
                      <div className="bar-fill bar-fill-accent" style={{ width: `${pct}%` }}></div>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>

        {/* Payment Breakdown */}
        <div className="analytics-card">
          <h3>Payment Status Summary</h3>
          <div className="status-grid">
            {Object.entries(paymentStatusMap).map(([status, count]) => (
              <div key={status} className={`status-summary-card status-${status.toLowerCase()}`}>
                <span className="status-title">{status}</span>
                <span className="status-value">{count}</span>
                <span className="status-subtitle">{pct(count, totalRegs)}% of total</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Analytics;
