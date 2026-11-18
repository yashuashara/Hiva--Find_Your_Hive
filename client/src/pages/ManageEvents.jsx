import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { listManageableEvents } from "../services/api";
import useDebounce from "../hooks/useDebounce";
import useAsyncData from "../hooks/useAsyncData";
import useUrlFilters from "../hooks/useUrlFilters";
import PageHeader from "../components/PageHeader";
import EmptyState from "../components/EmptyState";
import Pagination from "../components/Pagination";
import StatusBadge from "../components/StatusBadge";
import { SkeletonTable } from "../components/Skeleton";
import { AnimatePresence, m, rowMotion } from "../lib/motion";
import { formatDateRange, STATUS_LABELS } from "../utils/format";
import { HiPlus, HiSearch } from "react-icons/hi";

const STATUSES = ["draft", "pending_approval", "approved", "published", "completed", "rejected", "cancelled"];
const DEFAULTS = { q: "", status: "", page: "1" };

// Every event the user can manage (their clubs' events; all events for admins).
const ManageEvents = () => {
  const [filters, setFilters] = useUrlFilters(DEFAULTS);
  const { status } = filters;
  const page = Number(filters.page) || 1;

  const [search, setSearch] = useState(filters.q);
  const q = useDebounce(search.trim());
  useEffect(() => {
    if (q !== filters.q) setFilters({ q });
  }, [q, filters.q, setFilters]);

  const params = { page };
  if (status) params.status = status;
  if (filters.q) params.q = filters.q;

  const { data, error, initialLoading, refreshing, reload } = useAsyncData(
    () => listManageableEvents(params).then((res) => res.data),
    JSON.stringify(params)
  );
  const events = data?.data || [];

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
          <select aria-label="Status" value={status} onChange={(e) => setFilters({ status: e.target.value })}>
            <option value="">All statuses</option>
            {STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
          </select>
        </div>
      </div>

      <div className={`results-region ${refreshing ? "is-refreshing" : ""}`} aria-busy={refreshing || initialLoading}>
        {initialLoading ? (
          <SkeletonTable />
        ) : error && !data ? (
          <EmptyState error title="Couldn't load your events" message={error} onRetry={reload} />
        ) : (
          <>
            {error && <div className="notice notice--danger inline-error" role="alert">{error}</div>}
            {events.length === 0 ? (
              <EmptyState
                title="No events here"
                message={status || filters.q ? "No events match these filters." : "Create your club's first event to get started."}
              />
            ) : (
              <div className="table-wrapper">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th scope="col">Event</th>
                      <th scope="col">Club</th>
                      <th scope="col">When</th>
                      <th scope="col">Status</th>
                      <th scope="col">Seats left</th>
                      <th scope="col"><span className="sr-only">Check-in</span></th>
                    </tr>
                  </thead>
                  <tbody>
                    <AnimatePresence initial={false}>
                      {events.map((ev) => (
                        <m.tr key={ev._id} {...rowMotion}>
                          <td className="cell-bold">
                            <Link className="text-link" to={`/events/${encodeURIComponent(ev._id)}`}>{ev.title}</Link>
                          </td>
                          <td>{ev.organizerClub}</td>
                          <td>{formatDateRange(ev.startsAt, ev.endsAt)}</td>
                          <td><StatusBadge status={ev.status} /></td>
                          <td>{ev.seatsAvailable} / {ev.capacity}</td>
                          <td>
                            {ev.status === "published" && (
                              <Link className="btn btn-ghost btn-sm" to={`/manage/events/${encodeURIComponent(ev._id)}/scan`}>Scan</Link>
                            )}
                          </td>
                        </m.tr>
                      ))}
                    </AnimatePresence>
                  </tbody>
                </table>
              </div>
            )}
            <Pagination pagination={data?.pagination} onPage={(p) => setFilters({ page: p })} />
          </>
        )}
      </div>
    </div>
  );
};

export default ManageEvents;
