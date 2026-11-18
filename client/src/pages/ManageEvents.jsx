import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { listManageableEvents, errorMessage } from "../services/api";
import useDebounce from "../hooks/useDebounce";
import PageHeader from "../components/PageHeader";
import Loader from "../components/Loader";
import EmptyState from "../components/EmptyState";
import Pagination from "../components/Pagination";
import StatusBadge from "../components/StatusBadge";
import { formatDateRange, STATUS_LABELS } from "../utils/format";
import { HiPlus, HiSearch } from "react-icons/hi";

const STATUSES = ["draft", "pending_approval", "approved", "published", "completed", "rejected", "cancelled"];

// Every event the user can manage (their clubs' events; all events for admins).
const ManageEvents = () => {
  const [events, setEvents] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [status, setStatus] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const q = useDebounce(search.trim());

  useEffect(() => setPage(1), [status, q]);

  const fetchEvents = useCallback(async () => {
    setLoading(true);
    setLoadError("");
    try {
      const params = { page };
      if (status) params.status = status;
      if (q) params.q = q;
      const res = await listManageableEvents(params);
      setEvents(res.data.data);
      setPagination(res.data.pagination);
    } catch (err) {
      setLoadError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [status, q, page]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  return (
    <div className="page-container">
      <PageHeader
        title="Manage events"
        subtitle="Drafts, approvals and published events for your clubs"
        action={
          <Link to="/manage/events/new" className="btn btn-primary">
            <HiPlus aria-hidden="true" /> Create event
          </Link>
        }
      />

      <div className="toolbar">
        <div className="search-box">
          <HiSearch className="search-icon" aria-hidden="true" />
          <input type="search" aria-label="Search by title" placeholder="Search by title..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <div className="filters-group">
          <select aria-label="Status" value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">All statuses</option>
            {STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
          </select>
        </div>
      </div>

      {loading ? (
        <Loader />
      ) : loadError ? (
        <EmptyState error title="Couldn't load your events" message={loadError} onRetry={fetchEvents} />
      ) : events.length === 0 ? (
        <EmptyState
          title="No events here"
          message={status || q ? "No events match these filters." : "Create your club's first event to get started."}
        />
      ) : (
        <>
          <div className="table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th scope="col">Event</th>
                  <th scope="col">Club</th>
                  <th scope="col">When</th>
                  <th scope="col">Status</th>
                  <th scope="col">Seats left</th>
                </tr>
              </thead>
              <tbody>
                {events.map((ev) => (
                  <tr key={ev._id}>
                    <td className="cell-bold">
                      <Link className="text-link" to={`/events/${encodeURIComponent(ev._id)}`}>{ev.title}</Link>
                    </td>
                    <td>{ev.organizerClub}</td>
                    <td>{formatDateRange(ev.startsAt, ev.endsAt)}</td>
                    <td><StatusBadge status={ev.status} /></td>
                    <td>{ev.seatsAvailable} / {ev.capacity}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination pagination={pagination} onPage={setPage} />
        </>
      )}
    </div>
  );
};

export default ManageEvents;
