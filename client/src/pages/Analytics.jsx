import { useCallback, useEffect, useState } from "react";
import { getAdminAnalytics, errorMessage } from "../services/api";
import PageHeader from "../components/PageHeader";
import StatCard from "../components/StatCard";
import EmptyState from "../components/EmptyState";
import { SkeletonStats } from "../components/Skeleton";
import { TimeBarChart, HBarList } from "../components/charts";
import EventPerformanceTable from "../components/EventPerformanceTable";
import { STATUS_LABELS } from "../utils/format";
import { HiOutlineTicket, HiOutlineCheckCircle, HiOutlineChartBar, HiOutlineXCircle } from "react-icons/hi";

// University-wide reports for admins (all numbers computed on the server).
const Analytics = () => {
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

  if (error) return <div className="page-container"><EmptyState error title="Couldn't load reports" message={error} onRetry={load} /></div>;

  const t = data?.totals;
  return (
    <div className="page-container">
      <PageHeader title="Reports" subtitle="Registrations, attendance and event performance" />
      {!data ? (
        <SkeletonStats />
      ) : (
        <>
          <div className="stats-grid">
            <StatCard icon={<HiOutlineTicket />} label="Active registrations" value={t.registrations} color="blue" />
            <StatCard icon={<HiOutlineCheckCircle />} label="Attendance at past events" value={t.attendanceRate === null ? "n/a" : `${t.attendanceRate}%`} color="green" />
            <StatCard icon={<HiOutlineChartBar />} label="Seats filled (published events)" value={`${t.capacityUtilization}%`} color="purple" />
            <StatCard icon={<HiOutlineXCircle />} label="Cancelled registrations" value={t.cancelledRegistrations} color="orange" />
          </div>

          <div className="charts-grid">
            <section className="chart-card">
              <h3>Registrations per day</h3>
              <TimeBarChart data={data.trend} title="Registrations per day" />
            </section>
            <section className="chart-card">
              <h3>Published events by category</h3>
              <HBarList items={Object.entries(data.byCategory).sort((a, b) => b[1] - a[1]).map(([label, value]) => ({ label, value }))} />
            </section>
            <section className="chart-card">
              <h3>Events by status</h3>
              <HBarList
                items={Object.entries(data.statusCounts)
                  .sort((a, b) => b[1] - a[1])
                  .map(([status, value]) => ({ label: STATUS_LABELS[status] || status, value }))}
              />
            </section>
          </div>

          <section className="dashboard-section">
            <h2>All published events</h2>
            <EventPerformanceTable events={data.events} showClub />
          </section>
        </>
      )}
    </div>
  );
};

export default Analytics;
