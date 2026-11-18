import { Link } from "react-router-dom";
import EmptyState from "./EmptyState";
import StatusBadge from "./StatusBadge";
import { Meter } from "./charts";
import { formatDate } from "../utils/format";

// Per-event numbers: registrations vs capacity, and attendance.
const EventPerformanceTable = ({ events, showClub = false }) => {
  if (!events.length) return <EmptyState title="No published events yet" />;
  return (
    <div className="table-wrapper">
      <table className="data-table">
        <thead>
          <tr>
            <th scope="col">Event</th>
            {showClub && <th scope="col">Club</th>}
            <th scope="col">Date</th>
            <th scope="col">Status</th>
            <th scope="col" className="num">Registered</th>
            <th scope="col">Seats filled</th>
            <th scope="col" className="num">Checked in</th>
            <th scope="col">Attendance</th>
          </tr>
        </thead>
        <tbody>
          {events.map((e) => (
            <tr key={e.id}>
              <td className="cell-bold"><Link className="text-link" to={`/events/${encodeURIComponent(e.id)}`}>{e.title}</Link></td>
              {showClub && <td>{e.club}</td>}
              <td>{e.startsAt ? formatDate(e.startsAt) : "TBA"}</td>
              <td><StatusBadge status={e.status} /></td>
              <td className="num">{e.registered} / {e.capacity}</td>
              <td><Meter value={e.utilization} label="Seats filled" /></td>
              <td className="num">{e.checkedIn}</td>
              <td><Meter value={e.attendanceRate} label="Attendance" /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default EventPerformanceTable;
