import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { listClubs, errorMessage } from "../services/api";
import { useAuth } from "../context/AuthContext";
import useDebounce from "../hooks/useDebounce";
import PageHeader from "../components/PageHeader";
import Loader from "../components/Loader";
import EmptyState from "../components/EmptyState";
import Pagination from "../components/Pagination";
import { HiSearch, HiPlus, HiOutlineUserGroup } from "react-icons/hi";

const CATEGORIES = ["Technical", "Cultural", "Sports", "Entrepreneurship", "Arts", "Social", "Academic", "Other"];

const Clubs = () => {
  const { user } = useAuth();
  const [clubs, setClubs] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [page, setPage] = useState(1);
  const q = useDebounce(search.trim());

  useEffect(() => setPage(1), [q, category]);

  const fetchClubs = useCallback(async () => {
    setLoading(true);
    setLoadError("");
    try {
      const params = { page };
      if (q) params.q = q;
      if (category) params.category = category;
      const res = await listClubs(params);
      setClubs(res.data.data);
      setPagination(res.data.pagination);
    } catch (err) {
      setLoadError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [q, category, page]);

  useEffect(() => {
    fetchClubs();
  }, [fetchClubs]);

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
          <select aria-label="Category" value={category} onChange={(e) => setCategory(e.target.value)}>
            <option value="">All categories</option>
            {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
      </div>

      {loading ? (
        <Loader />
      ) : loadError ? (
        <EmptyState error title="Couldn't load clubs" message={loadError} onRetry={fetchClubs} />
      ) : clubs.length === 0 ? (
        <EmptyState title="No clubs found" message={q || category ? "Try a different search." : "No clubs have been approved yet."} />
      ) : (
        <>
          <div className="cards-grid">
            {clubs.map((club) => (
              <article key={club._id} className="event-card club-card">
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
            ))}
          </div>
          <Pagination pagination={pagination} onPage={setPage} />
        </>
      )}
    </div>
  );
};

export default Clubs;
