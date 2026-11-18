import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { listEvents } from "../services/api";
import { useAuth } from "../context/AuthContext";
import useDebounce from "../hooks/useDebounce";
import useAsyncData from "../hooks/useAsyncData";
import useUrlFilters from "../hooks/useUrlFilters";
import PageHeader from "../components/PageHeader";
import EventCard from "../components/EventCard";
import Tabs from "../components/Tabs";
import { SkeletonCards } from "../components/Skeleton";
import EmptyState from "../components/EmptyState";
import Pagination from "../components/Pagination";
import { AnimatedList } from "../lib/motion";
import { HiPlus, HiSearch } from "react-icons/hi";

const CATEGORIES = ["Technical", "Cultural", "Sports", "Workshop", "Seminar"];
const WHEN_TABS = [["upcoming", "Upcoming"], ["past", "Past"], ["all", "All"]];
const DEFAULTS = { q: "", category: "", when: "upcoming", price: "", page: "1" };

const Events = () => {
  const { canManageEvents } = useAuth();
  const [filters, setFilters] = useUrlFilters(DEFAULTS);
  const { category, when, price } = filters;
  const page = Number(filters.page) || 1;

  // The search box updates instantly; the URL (and the request) follow once
  // typing pauses.
  const [search, setSearch] = useState(filters.q);
  const q = useDebounce(search.trim());
  useEffect(() => {
    if (q !== filters.q) setFilters({ q });
  }, [q, filters.q, setFilters]);

  const params = { when, page, limit: 12 };
  if (filters.q) params.q = filters.q;
  if (category) params.category = category;
  if (price) params.price = price;

  const { data, error, initialLoading, refreshing, reload } = useAsyncData(
    () => listEvents(params).then((res) => res.data),
    JSON.stringify(params)
  );
  const events = data?.data || [];
  const filtersActive = filters.q || category || price;

  return (
    <div className="page-container">
      <PageHeader
        title="Discover events"
        subtitle="Workshops, fests, talks and more from clubs across campus"
        action={canManageEvents && (
          <Link to="/manage/events/new" className="btn btn-primary">
            <HiPlus aria-hidden="true" /> Create event
          </Link>
        )}
      />

      <Tabs id="events-when" label="Event timeframe" value={when} options={WHEN_TABS} onChange={(v) => setFilters({ when: v })} />

      <div className="toolbar">
        <div className="search-box">
          <HiSearch className="search-icon" aria-hidden="true" />
          <input
            type="search"
            aria-label="Search events"
            placeholder="Search by event, club, venue or tag..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="filters-group">
          <select aria-label="Category" value={category} onChange={(e) => setFilters({ category: e.target.value })}>
            <option value="">All categories</option>
            {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <select aria-label="Price" value={price} onChange={(e) => setFilters({ price: e.target.value })}>
            <option value="">Free &amp; paid</option>
            <option value="free">Free only</option>
            <option value="paid">Paid only</option>
          </select>
        </div>
      </div>

      <div className={`results-region ${refreshing ? "is-refreshing" : ""}`} aria-busy={refreshing || initialLoading}>
        {initialLoading ? (
          <SkeletonCards />
        ) : error && !data ? (
          <EmptyState error title="Couldn't load events" message={error} onRetry={reload} />
        ) : (
          <>
            {error && <div className="notice notice--danger inline-error" role="alert">{error}</div>}
            {events.length === 0 ? (
              <EmptyState
                title="No events found"
                message={filtersActive ? "Try a different search or filter." : when === "upcoming" ? "No upcoming events right now. Check back soon!" : "Nothing here yet."}
              />
            ) : (
              <AnimatedList className="cards-grid" items={events} getKey={(e) => e._id} render={(e) => <EventCard event={e} />} />
            )}
            <Pagination pagination={data?.pagination} onPage={(p) => setFilters({ page: p })} />
          </>
        )}
      </div>
    </div>
  );
};

export default Events;
