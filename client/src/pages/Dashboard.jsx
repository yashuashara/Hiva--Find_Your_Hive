import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { getAllEvents, getAllRegistrations } from "../services/api";
import PageHeader from "../components/PageHeader";
import StatCard from "../components/StatCard";
import Loader from "../components/Loader";
import { HiOutlineCalendar, HiOutlineTicket, HiOutlineUsers, HiOutlineCurrencyRupee } from "react-icons/hi";

const Dashboard = () => {
  const [events, setEvents] = useState([]);
  const [registrations, setRegistrations] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [eventsRes, regsRes] = await Promise.all([getAllEvents(), getAllRegistrations()]);
        setEvents(eventsRes.data.data);
        setRegistrations(regsRes.data.data);
      } catch (error) {
        console.error("Error fetching dashboard data:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) return <Loader />;

  const totalRevenue = registrations.reduce((sum, r) => sum + (r.paymentDetails?.amountPaid || 0), 0);
  const checkedIn = registrations.filter((r) => r.checkInStatus).length;

  // Department distribution
  const deptCounts = registrations.reduce((acc, r) => {
    acc[r.department] = (acc[r.department] || 0) + 1;
    return acc;
  }, {});

  // Recent registrations
  const recentRegs = [...registrations]
    .sort((a, b) => new Date(b.registrationDate) - new Date(a.registrationDate))
    .slice(0, 8);

  return (
    <div className="page-container">
      <PageHeader title="Dashboard" subtitle="Campus Events Management Overview" />

      <div className="stats-grid">
        <StatCard
          icon={<HiOutlineCalendar />}
          label="Total Events"
          value={events.length}
          color="blue"
        />
        <StatCard
          icon={<HiOutlineTicket />}
          label="Total Registrations"
          value={registrations.length}
          color="green"
        />
        <StatCard
          icon={<HiOutlineUsers />}
          label="Checked In"
          value={checkedIn}
          color="purple"
        />
        <StatCard
          icon={<HiOutlineCurrencyRupee />}
          label="Total Revenue"
          value={`₹${totalRevenue.toLocaleString()}`}
          color="orange"
        />
      </div>

      {/* Events Overview */}
      <section className="dashboard-section">
        <div className="section-header">
          <h2>Events Overview</h2>
          <Link to="/events" className="btn btn-ghost">View All →</Link>
        </div>
        <div className="table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>Event ID</th>
                <th>Title</th>
                <th>Category</th>
                <th>Venue</th>
                <th>Capacity</th>
                <th>Seats Left</th>
                <th>Fee</th>
              </tr>
            </thead>
            <tbody>
              {events.map((event) => (
                <tr key={event._id}>
                  <td><span className="badge badge--id">{event._id}</span></td>
                  <td className="cell-bold">{event.title}</td>
                  <td>
                    <span className={`badge badge--${event.category.toLowerCase()}`}>
                      {event.category}
                    </span>
                  </td>
                  <td>{event.venue}</td>
                  <td>{event.capacity}</td>
                  <td>
                    <span className={`badge ${event.seatsAvailable < 20 ? "badge--danger" : "badge--success"}`}>
                      {event.seatsAvailable}
                    </span>
                  </td>
                  <td>{event.entryFee === 0 ? "Free" : `₹${event.entryFee}`}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Department Distribution */}
      <section className="dashboard-section">
        <h2>Department Distribution</h2>
        <div className="dept-grid">
          {Object.entries(deptCounts)
            .sort((a, b) => b[1] - a[1])
            .map(([dept, count]) => (
              <div key={dept} className="dept-card">
                <span className="dept-name">{dept}</span>
                <span className="dept-count">{count}</span>
                <div className="dept-bar">
                  <div
                    className="dept-bar-fill"
                    style={{ width: `${(count / registrations.length) * 100}%` }}
                  ></div>
                </div>
              </div>
            ))}
        </div>
      </section>

      {/* Recent Registrations */}
      <section className="dashboard-section">
        <div className="section-header">
          <h2>Recent Registrations</h2>
          <Link to="/registrations" className="btn btn-ghost">View All →</Link>
        </div>
        <div className="table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>Ticket ID</th>
                <th>Student</th>
                <th>Event</th>
                <th>Department</th>
                <th>Year</th>
                <th>Check-In</th>
                <th>Payment</th>
              </tr>
            </thead>
            <tbody>
              {recentRegs.map((reg) => (
                <tr key={reg.ticketId}>
                  <td><span className="badge badge--id">{reg.ticketId}</span></td>
                  <td className="cell-bold">{reg.studentName}</td>
                  <td>{reg.eventId}</td>
                  <td>{reg.department}</td>
                  <td>Year {reg.year}</td>
                  <td>
                    <span className={`badge ${reg.checkInStatus ? "badge--success" : "badge--warning"}`}>
                      {reg.checkInStatus ? "✓ Checked In" : "✗ Pending"}
                    </span>
                  </td>
                  <td>
                    <span className={`badge badge--${reg.paymentDetails?.status?.toLowerCase()}`}>
                      {reg.paymentDetails?.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};

export default Dashboard;
