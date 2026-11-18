import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { listClubs } from "../services/api";
import { useAuth } from "../context/AuthContext";
import useDebounce from "../hooks/useDebounce";
import useAsyncData from "../hooks/useAsyncData";
import useUrlFilters from "../hooks/useUrlFilters";
import PageHeader from "../components/PageHeader";
import EmptyState from "../components/EmptyState";
import Pagination from "../components/Pagination";
import { SkeletonCards } from "../components/Skeleton";
import { AnimatedList } from "../lib/motion";
import { HiSearch, HiPlus, HiOutlineUserGroup } from "react-icons/hi";

const CATEGORIES = ["Technical", "Cultural", "Sports", "Entrepreneurship", "Arts", "Social", "Academic", "Other"];
const DEFAULTS = { q: "", category: "", page: "1" };

const ClubCard = ({ club }) => (
  <article className="event-card club-card">
    <div className="club-card-head">
      {club.logoUrl ? (
        <img src={club.logoUrl} alt="" className="club-logo" loading="lazy" referrerPolicy="no-referrer" />
      ) : (
        <div className="club-logo club-logo--placeholder" aria-hidden="true"><HiOutlineUserGroup /></div>
      )}
      <div>
        <h3 className="event-title">
          <Link to={`/clubs/${club.slug}`} className="card-link">{club.name}</Link>
        </h3>
        <span className="badge badge--event">{club.category}</span>
      </div>
    </div>
    {club.description && <p className="club-description">{club.description}</p>}
  </article>
);

const Clubs = () => {
  const { user } = useAuth();
  const [filters, setFilters] = useUrlFilters(DEFAULTS);
  const { category } = filters;
  const page = Number(filters.page) || 1;

  const [search, setSearch] = useState(filters.q);
  const q = useDebounce(search.trim());
  useEffect(() => {
    if (q !== filters.q) setFilters({ q });
  }, [q, filters.q, setFilters]);

  const params = { page };
  if (filters.q) params.q = filters.q;
  if (category) params.category = category;

  const { data, error, initialLoading, refreshing, reload } = useAsyncData(
    () => listClubs(params).then((res) => res.data),
    JSON.stringify(params)
  );
  const clubs = data?.data || [];

  return (
    <div className="page-container">
      <PageHeader
        title="Clubs"
        subtitle="Find the communities behind campus events"
        action={user && (
          <Link to="/clubs/new" className="btn btn-secondary">
            <HiPlus aria-hidden="true" /> Request a club
          </Link>
        )}
      />

      <div className="toolbar">
        <div className="search-box">
          <HiSearch className="search-icon" aria-hidden="true" />
          <input type="search" aria-label="Search clubs" placeholder="Search clubs..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <div className="filters-group">
          <select aria-label="Category" value={category} onChange={(e) => setFilters({ category: e.target.value })}>
            <option value="">All categories</option>
            {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
      </div>

      <div className={`results-region ${refreshing ? "is-refreshing" : ""}`} aria-busy={refreshing || initialLoading}>
        {initialLoading ? (
          <SkeletonCards count={3} />
        ) : error && !data ? (
          <EmptyState error title="Couldn't load clubs" message={error} onRetry={reload} />
        ) : (
          <>
            {error && <div className="notice notice--danger inline-error" role="alert">{error}</div>}
            {clubs.length === 0 ? (
              <EmptyState title="No clubs found" message={filters.q || category ? "Try a different search." : "No clubs have been approved yet."} />
            ) : (
              <AnimatedList className="cards-grid" items={clubs} getKey={(c) => c._id} render={(c) => <ClubCard club={c} />} />
            )}
            <Pagination pagination={data?.pagination} onPage={(p) => setFilters({ page: p })} />
          </>
        )}
      </div>
    </div>
  );
};

export default Clubs;
