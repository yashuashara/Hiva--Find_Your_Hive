import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";
import { getApprovals, reviewClub, transitionEvent, approveClubMember, removeClubMember, errorMessage } from "../services/api";
import PageHeader from "../components/PageHeader";
import Loader from "../components/Loader";
import EmptyState from "../components/EmptyState";
import ReasonDialog from "../components/ReasonDialog";
import { formatDateRange, formatDate } from "../utils/format";

// Everything waiting for a university admin's decision.
const Approvals = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [dialog, setDialog] = useState(null); // { kind: "club"|"event", id, name }

  const load = useCallback(async () => {
    setLoadError("");
    try {
      const res = await getApprovals();
      setData(res.data.data);
    } catch (err) {
      setLoadError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const act = async (fn, msg) => {
    try {
      await fn();
      toast.success(msg);
      setDialog(null);
      await load();
    } catch (err) {
      toast.error(errorMessage(err));
    }
  };

  if (loading) return <Loader />;
  if (loadError) return <div className="page-container"><EmptyState error title="Couldn't load approvals" message={loadError} onRetry={load} /></div>;

  const { clubs, events, memberships } = data;
  const total = clubs.length + events.length + memberships.length;

  return (
    <div className="page-container">
      <PageHeader title="Approvals" subtitle={total ? `${total} item${total === 1 ? "" : "s"} waiting for review` : "You're all caught up"} />

      <section className="dashboard-section">
        <h2>Club requests ({clubs.length})</h2>
        {clubs.length === 0 ? (
          <EmptyState title="No club requests" />
        ) : (
          <ul className="review-list">
            {clubs.map((c) => (
              <li key={c._id} className="review-item">
                <div>
                  <Link className="text-link cell-bold" to={`/clubs/${c.slug}`}>{c.name}</Link>
                  <p className="muted">
                    {c.category} · requested by {c.requestedBy?.name || "unknown"} ({c.requestedBy?.email}) on {formatDate(c.createdAt)}
                  </p>
                  {c.description && <p className="review-desc">{c.description}</p>}
                </div>
                <div className="member-actions">
                  <button type="button" className="btn btn-primary btn-sm" onClick={() => act(() => reviewClub(c._id, "approve"), `${c.name} approved`)}>Approve</button>
                  <button type="button" className="btn btn-danger-outline btn-sm" onClick={() => setDialog({ kind: "club", id: c._id, name: c.name })}>Reject</button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="dashboard-section">
        <h2>Events awaiting approval ({events.length})</h2>
        {events.length === 0 ? (
          <EmptyState title="No events to review" />
        ) : (
          <ul className="review-list">
            {events.map((e) => (
              <li key={e._id} className="review-item">
                <div>
                  <Link className="text-link cell-bold" to={`/events/${encodeURIComponent(e._id)}`}>{e.title}</Link>
                  <p className="muted">{e.organizerClub} · {formatDateRange(e.startsAt, e.endsAt)} · {e.venue} · {e.capacity} seats</p>
                </div>
                <div className="member-actions">
                  <button type="button" className="btn btn-primary btn-sm" onClick={() => act(() => transitionEvent(e._id, "approve"), `${e.title} approved`)}>Approve</button>
                  <button type="button" className="btn btn-danger-outline btn-sm" onClick={() => setDialog({ kind: "event", id: e._id, name: e.title })}>Reject</button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="dashboard-section">
        <h2>Club team requests ({memberships.length})</h2>
        {memberships.length === 0 ? (
          <EmptyState title="No team requests" />
        ) : (
          <ul className="review-list">
            {memberships.map((m) => (
              <li key={m._id} className="review-item">
                <div>
                  <span className="cell-bold">{m.user.name}</span> <span className="muted">({m.user.email})</span>
                  <p className="muted">
                    wants to be <strong>{m.role}</strong> of <Link className="text-link" to={`/clubs/${m.club.slug}`}>{m.club.name}</Link>
                  </p>
                </div>
                <div className="member-actions">
                  <button type="button" className="btn btn-primary btn-sm" onClick={() => act(() => approveClubMember(m.club._id, m._id), "Approved")}>Approve</button>
                  <button
                    type="button"
                    className="btn btn-danger-outline btn-sm"
                    onClick={() => window.confirm("Decline this request?") && act(() => removeClubMember(m.club._id, m._id), "Declined")}
                  >
                    Decline
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {dialog && (
        <ReasonDialog
          title={`Reject ${dialog.name}`}
          confirmLabel="Reject"
          onClose={() => setDialog(null)}
          onConfirm={(reason) =>
            act(
              () => (dialog.kind === "club" ? reviewClub(dialog.id, "reject", reason) : transitionEvent(dialog.id, "reject", reason)),
              "Rejected"
            )
          }
        />
      )}
    </div>
  );
};

export default Approvals;
