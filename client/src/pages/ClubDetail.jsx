import { useState, useEffect, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
import toast from "react-hot-toast";
import {
  getClub, listEvents, updateClub, reviewClub, listClubMembers, addClubMember,
  approveClubMember, removeClubMember, errorMessage,
} from "../services/api";
import { useAuth } from "../context/AuthContext";
import Loader from "../components/Loader";
import EmptyState from "../components/EmptyState";
import StatusBadge from "../components/StatusBadge";
import ReasonDialog from "../components/ReasonDialog";
import { EventCard } from "./Events";
import { HiArrowLeft, HiOutlineUserGroup, HiPlus } from "react-icons/hi";

const ROLE_LABEL = { owner: "Owner", organizer: "Organizer", volunteer: "Volunteer" };

// --- Team management (owners and admins) ---
const TeamPanel = ({ club, canManageClub, isAdmin, onChange }) => {
  const { user, refreshMemberships } = useAuth();
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ email: "", role: "organizer" });
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await listClubMembers(club._id);
      setMembers(res.data.data);
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [club._id]);

  useEffect(() => {
    load();
  }, [load]);

  const add = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      const res = await addClubMember(club._id, form);
      toast.success(res.data.message);
      setForm({ email: "", role: "organizer" });
      load();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const remove = async (m) => {
    const self = m.user.id === user?.id;
    if (!window.confirm(self ? "Leave this club?" : `Remove ${m.user.name} from the team?`)) return;
    try {
      await removeClubMember(club._id, m.id);
      toast.success(self ? "You left the club" : "Member removed");
      if (self) await refreshMemberships();
      load();
      onChange();
    } catch (err) {
      toast.error(errorMessage(err));
    }
  };

  const approve = async (m) => {
    try {
      await approveClubMember(club._id, m.id);
      toast.success(`${m.user.name} approved`);
      load();
      onChange();
    } catch (err) {
      toast.error(errorMessage(err));
    }
  };

  return (
    <section className="detail-card">
      <h3>Team</h3>
      {loading ? (
        <Loader />
      ) : (
        <ul className="member-list">
          {members.map((m) => (
            <li key={m.id} className="member-row">
              <div>
                <span className="cell-bold">{m.user.name}</span> <span className="muted">{m.user.email}</span>
                <div className="member-tags">
                  <span className="badge badge--event">{ROLE_LABEL[m.role]}</span>
                  {m.status === "pending" && <StatusBadge status="pending" />}
                </div>
              </div>
              <div className="member-actions">
                {isAdmin && m.status === "pending" && club.status === "approved" && (
                  <button type="button" className="btn btn-primary btn-sm" onClick={() => approve(m)}>Approve</button>
                )}
                {(canManageClub || m.user.id === user?.id) && (
                  <button type="button" className="btn btn-ghost btn-sm" onClick={() => remove(m)}>
                    {m.user.id === user?.id ? "Leave" : "Remove"}
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      {canManageClub && (
        <form className="add-member-form" onSubmit={add}>
          <div className="form-group">
            <label htmlFor="am-email">Add by email</label>
            <input id="am-email" type="email" required placeholder="They need an account first" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </div>
          <div className="form-group">
            <label htmlFor="am-role">Role</label>
            <select id="am-role" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
              <option value="organizer">Organizer: runs events</option>
              <option value="volunteer">Volunteer: checks people in</option>
              {isAdmin && <option value="owner">Owner: manages the club</option>}
            </select>
          </div>
          <button type="submit" className="btn btn-secondary" disabled={busy}><HiPlus aria-hidden="true" /> Add</button>
          {!isAdmin && <p className="form-hint">New team members need a university admin's approval before they get access.</p>}
        </form>
      )}
    </section>
  );
};

// --- Profile editor (owners and admins) ---
const ProfileEditor = ({ club, isAdmin, onSaved, onClose }) => {
  const [form, setForm] = useState({
    name: club.name,
    description: club.description || "",
    contactEmail: club.contactEmail || "",
    logoUrl: club.logoUrl || "",
    instagram: club.socials?.instagram || "",
    linkedin: club.socials?.linkedin || "",
    website: club.socials?.website || "",
  });
  const [saving, setSaving] = useState(false);
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const body = {
        description: form.description,
        contactEmail: form.contactEmail,
        logoUrl: form.logoUrl,
        socials: { instagram: form.instagram, linkedin: form.linkedin, website: form.website },
      };
      if (isAdmin && form.name !== club.name) body.name = form.name;
      await updateClub(club._id, body);
      toast.success("Club profile saved");
      onSaved();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <form className="detail-card form-card" onSubmit={save}>
      <h3>Edit club profile</h3>
      {isAdmin && (
        <div className="form-group">
          <label htmlFor="pe-name">Name</label>
          <input id="pe-name" required minLength={3} maxLength={100} value={form.name} onChange={set("name")} />
        </div>
      )}
      <div className="form-group">
        <label htmlFor="pe-desc">Description</label>
        <textarea id="pe-desc" rows={4} maxLength={2000} value={form.description} onChange={set("description")} />
      </div>
      <div className="form-grid">
        <div className="form-group"><label htmlFor="pe-email">Contact email</label><input id="pe-email" type="email" value={form.contactEmail} onChange={set("contactEmail")} /></div>
        <div className="form-group"><label htmlFor="pe-logo">Logo link</label><input id="pe-logo" type="url" value={form.logoUrl} onChange={set("logoUrl")} /></div>
        <div className="form-group"><label htmlFor="pe-ig">Instagram</label><input id="pe-ig" type="url" value={form.instagram} onChange={set("instagram")} /></div>
        <div className="form-group"><label htmlFor="pe-li">LinkedIn</label><input id="pe-li" type="url" value={form.linkedin} onChange={set("linkedin")} /></div>
        <div className="form-group"><label htmlFor="pe-web">Website</label><input id="pe-web" type="url" value={form.website} onChange={set("website")} /></div>
      </div>
      <div className="modal-actions">
        <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
        <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? "Saving..." : "Save"}</button>
      </div>
    </form>
  );
};

const SOCIAL_LABELS = { website: "Website", instagram: "Instagram", linkedin: "LinkedIn", x: "X" };

const ClubDetail = () => {
  const { slug } = useParams();
  const { user, loading: authLoading } = useAuth();
  const [club, setClub] = useState(null);
  const [viewer, setViewer] = useState(null);
  const [upcoming, setUpcoming] = useState([]);
  const [past, setPast] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [notFound, setNotFound] = useState(false);
  const [editing, setEditing] = useState(false);
  const [dialog, setDialog] = useState(null); // reject | suspend
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      setLoadError("");
      const res = await getClub(slug);
      setClub(res.data.data);
      setViewer(res.data.viewer);
      if (res.data.data.status === "approved") {
        const [up, pastRes] = await Promise.all([
          listEvents({ club: slug, when: "upcoming", limit: 12 }),
          listEvents({ club: slug, when: "past", limit: 6 }),
        ]);
        setUpcoming(up.data.data);
        setPast(pastRes.data.data);
      }
    } catch (err) {
      if (err.response?.status === 404) setNotFound(true);
      else setLoadError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [slug]);

  useEffect(() => {
    if (!authLoading) load();
  }, [authLoading, load, user]);

  const review = async (action, reason) => {
    setBusy(true);
    try {
      await reviewClub(club._id, action, reason);
      toast.success(`Club ${action === "approve" ? "approved" : action === "reinstate" ? "reinstated" : action + "ed"}`);
      setDialog(null);
      await load();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  if (loading || authLoading) return <Loader />;
  const back = <Link to="/clubs" className="back-link"><HiArrowLeft aria-hidden="true" /> Clubs</Link>;
  if (notFound) return <div className="page-container">{back}<EmptyState title="Club not found" /></div>;
  if (loadError) return <div className="page-container">{back}<EmptyState error title="Couldn't load this club" message={loadError} onRetry={load} /></div>;

  const isAdmin = viewer.role === "admin";
  const socials = Object.entries(club.socials || {}).filter(([, url]) => url);

  return (
    <div className="page-container">
      {back}

      <header className="club-hero">
        {club.logoUrl ? (
          <img src={club.logoUrl} alt="" className="club-logo club-logo--lg" referrerPolicy="no-referrer" />
        ) : (
          <div className="club-logo club-logo--lg club-logo--placeholder" aria-hidden="true"><HiOutlineUserGroup /></div>
        )}
        <div>
          <div className="event-hero-badges">
            <span className="badge badge--event">{club.category}</span>
            {club.status !== "approved" && <StatusBadge status={club.status} />}
          </div>
          <h1>{club.name}</h1>
          {club.description && <p className="header-subtitle club-hero-desc">{club.description}</p>}
          {(socials.length > 0 || club.contactEmail) && (
            <div className="social-links">
              {socials.map(([k, url]) => (
                <a key={k} href={url} target="_blank" rel="noopener noreferrer nofollow" className="text-link">{SOCIAL_LABELS[k]}</a>
              ))}
              {club.contactEmail && <span className="muted">{club.contactEmail}</span>}
            </div>
          )}
        </div>
      </header>

      {club.status === "pending" && (
        <div className="notice" role="status">
          {isAdmin ? "This club is waiting for your review." : "This club is waiting for a university admin to approve it. Only you and admins can see this page."}
        </div>
      )}
      {club.statusReason && ["rejected", "suspended"].includes(club.status) && (
        <div className="notice notice--danger" role="status"><strong>{club.status === "rejected" ? "Rejected" : "Suspended"}:</strong> {club.statusReason}</div>
      )}

      {(viewer.canManageClub || viewer.canManageEvents || isAdmin) && (
        <div className="action-bar">
          {viewer.canManageEvents && club.status === "approved" && <Link to="/manage/events/new" className="btn btn-primary btn-sm">Create event</Link>}
          {viewer.canManageClub && !editing && <button type="button" className="btn btn-ghost btn-sm" onClick={() => setEditing(true)}>Edit profile</button>}
          {isAdmin && ["pending", "rejected"].includes(club.status) && <button type="button" className="btn btn-primary btn-sm" disabled={busy} onClick={() => review("approve")}>Approve club</button>}
          {isAdmin && club.status === "pending" && <button type="button" className="btn btn-danger-outline btn-sm" disabled={busy} onClick={() => setDialog("reject")}>Reject</button>}
          {isAdmin && club.status === "approved" && <button type="button" className="btn btn-danger-outline btn-sm" disabled={busy} onClick={() => setDialog("suspend")}>Suspend</button>}
          {isAdmin && club.status === "suspended" && <button type="button" className="btn btn-primary btn-sm" disabled={busy} onClick={() => review("reinstate")}>Reinstate</button>}
        </div>
      )}

      {editing && <ProfileEditor club={club} isAdmin={isAdmin} onClose={() => setEditing(false)} onSaved={() => { setEditing(false); load(); }} />}

      {club.status === "approved" && (
        <>
          <section className="dashboard-section">
            <h2>Upcoming events</h2>
            {upcoming.length ? (
              <div className="cards-grid">{upcoming.map((e) => <EventCard key={e._id} event={e} />)}</div>
            ) : (
              <EmptyState title="No upcoming events" message="Check back soon." />
            )}
          </section>
          {past.length > 0 && (
            <section className="dashboard-section">
              <h2>Past events</h2>
              <div className="cards-grid">{past.map((e) => <EventCard key={e._id} event={e} />)}</div>
            </section>
          )}
        </>
      )}

      {viewer.canManageEvents || viewer.canManageClub ? (
        <TeamPanel club={club} canManageClub={viewer.canManageClub} isAdmin={isAdmin} onChange={load} />
      ) : (
        club.team?.length > 0 && (
          <section className="detail-card">
            <h3>Team</h3>
            <ul className="member-list">
              {club.team.map((m, i) => (
                <li key={i} className="member-row"><span className="cell-bold">{m.name}</span> <span className="badge badge--event">{ROLE_LABEL[m.role]}</span></li>
              ))}
            </ul>
          </section>
        )
      )}

      {dialog && (
        <ReasonDialog
          title={dialog === "reject" ? "Reject club request" : "Suspend club"}
          description={dialog === "suspend" ? "Organizers lose access to club tools until the club is reinstated." : undefined}
          confirmLabel={dialog === "reject" ? "Reject" : "Suspend"}
          onClose={() => setDialog(null)}
          onConfirm={(reason) => review(dialog, reason)}
        />
      )}
    </div>
  );
};

export default ClubDetail;
