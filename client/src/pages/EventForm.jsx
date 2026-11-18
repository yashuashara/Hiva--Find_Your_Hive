import { useState, useEffect } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import toast from "react-hot-toast";
import { createEvent, updateEvent, getEventById, listClubs, errorMessage } from "../services/api";
import { useAuth } from "../context/AuthContext";
import PageHeader from "../components/PageHeader";
import Loader from "../components/Loader";
import EmptyState from "../components/EmptyState";
import ImageUpload from "../components/ImageUpload";
import { toLocalInput, fromLocalInput } from "../utils/format";
import { HiArrowLeft } from "react-icons/hi";

const CATEGORIES = ["Technical", "Cultural", "Sports", "Workshop", "Seminar"];
const splitList = (value) => (value ? value.split(",").map((v) => v.trim()).filter(Boolean) : []);

const EMPTY = {
  clubId: "",
  title: "",
  description: "",
  category: "Technical",
  venue: "",
  startsAt: "",
  endsAt: "",
  registrationOpensAt: "",
  registrationClosesAt: "",
  capacity: 100,
  tags: "",
  coordinatorName: "",
  coordinatorContact: "",
  bannerUrl: "",
};

// Create a new event (as a draft) or edit an existing one.
const EventForm = () => {
  const { id } = useParams();
  const isEdit = !!id;
  const navigate = useNavigate();
  const { isAdmin, activeClubs } = useAuth();
  const [form, setForm] = useState(EMPTY);
  const [clubs, setClubs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const load = async () => {
      try {
        // Organizers pick from clubs where they can manage events; admins from all approved clubs.
        if (isAdmin) {
          const res = await listClubs({ limit: 50 });
          setClubs(res.data.data.map((c) => ({ id: c._id, name: c.name })));
        } else {
          setClubs(
            activeClubs
              .filter((m) => ["owner", "organizer"].includes(m.role))
              .map((m) => ({ id: m.club._id, name: m.club.name }))
          );
        }
        if (isEdit) {
          const res = await getEventById(id);
          const ev = res.data.data;
          if (!res.data.viewer.canManage) throw new Error("You cannot edit this event.");
          setForm({
            clubId: ev.club?._id || "",
            title: ev.title,
            description: ev.description || "",
            category: ev.category,
            venue: ev.venue,
            startsAt: toLocalInput(ev.startsAt),
            endsAt: toLocalInput(ev.endsAt),
            registrationOpensAt: toLocalInput(ev.registrationOpensAt),
            registrationClosesAt: toLocalInput(ev.registrationClosesAt),
            capacity: ev.capacity,
            tags: (ev.tags || []).join(", "),
            coordinatorName: ev.coordinators?.[0]?.name || "",
            coordinatorContact: ev.coordinators?.[0]?.contact || "",
            bannerUrl: ev.bannerUrl || "",
          });
        }
      } catch (err) {
        setLoadError(err.response ? errorMessage(err) : err.message);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id, isEdit, isAdmin, activeClubs]);

  useEffect(() => {
    if (!isEdit && !form.clubId && clubs.length === 1) setForm((f) => ({ ...f, clubId: clubs[0].id }));
  }, [clubs, isEdit, form.clubId]);

  const field = (name) => ({
    id: `ef-${name}`,
    name,
    value: form[name],
    onChange: (e) => setForm({ ...form, [name]: e.target.value }),
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSaving(true);
    const payload = {
      title: form.title,
      description: form.description,
      category: form.category,
      venue: form.venue,
      startsAt: fromLocalInput(form.startsAt),
      endsAt: fromLocalInput(form.endsAt),
      registrationOpensAt: fromLocalInput(form.registrationOpensAt),
      registrationClosesAt: fromLocalInput(form.registrationClosesAt),
      capacity: Number(form.capacity),
      tags: splitList(form.tags),
      coordinators: form.coordinatorName ? [{ name: form.coordinatorName, contact: form.coordinatorContact }] : [],
      bannerUrl: form.bannerUrl,
    };
    try {
      if (isEdit) {
        await updateEvent(id, payload);
        toast.success("Changes saved");
        navigate(`/events/${encodeURIComponent(id)}`);
      } else {
        // New events start as free drafts; payments come in a later release.
        const res = await createEvent({ ...payload, clubId: form.clubId, entryFee: 0 });
        toast.success("Draft created. Submit it for approval when it's ready.");
        navigate(`/events/${encodeURIComponent(res.data.data._id)}`);
      }
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <Loader />;
  if (loadError) {
    return (
      <div className="page-container">
        <EmptyState error title="Can't open this form" message={loadError} />
      </div>
    );
  }
  if (!isEdit && clubs.length === 0) {
    return (
      <div className="page-container">
        <EmptyState
          title="You're not organizing for any club yet"
          message="Ask your club owner to add you as an organizer, or request a new club."
        />
        <div className="center-actions">
          <Link to="/clubs/new" className="btn btn-primary">Request a club</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container page-container--narrow">
      <Link to={isEdit ? `/events/${encodeURIComponent(id)}` : "/manage/events"} className="back-link">
        <HiArrowLeft aria-hidden="true" /> Back
      </Link>
      <PageHeader
        title={isEdit ? "Edit event" : "Create event"}
        subtitle={isEdit ? "Changes to published events are visible immediately." : "New events are saved as drafts. Submit for approval when ready."}
      />

      <form className="detail-card form-card" onSubmit={handleSubmit}>
        {error && <div className="form-error" role="alert">{error}</div>}

        <fieldset className="form-section">
          <legend>Basics</legend>
          <div className="form-grid">
            {!isEdit && (
              <div className="form-group">
                <label htmlFor="ef-clubId">Club</label>
                <select required {...field("clubId")}>
                  <option value="" disabled>Choose a club</option>
                  {clubs.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
            )}
            <div className="form-group">
              <label htmlFor="ef-title">Title</label>
              <input required minLength={3} maxLength={150} {...field("title")} />
            </div>
            <div className="form-group">
              <label htmlFor="ef-category">Category</label>
              <select {...field("category")}>
                {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label htmlFor="ef-venue">Venue</label>
              <input required minLength={2} maxLength={150} placeholder="e.g. Auditorium A" {...field("venue")} />
            </div>
          </div>
          <ImageUpload id="ef-banner" label="Banner image (optional)" value={form.bannerUrl} onChange={(url) => setForm((f) => ({ ...f, bannerUrl: url }))} hint="Wide image, about 1600x500. JPEG, PNG or WebP, up to 2 MB." />
          <div className="form-group">
            <label htmlFor="ef-description">Description</label>
            <textarea rows={5} maxLength={5000} placeholder="What will attendees do or learn? Who is it for?" {...field("description")} />
          </div>
        </fieldset>

        <fieldset className="form-section">
          <legend>Schedule</legend>
          <div className="form-grid">
            <div className="form-group">
              <label htmlFor="ef-startsAt">Starts</label>
              <input type="datetime-local" required {...field("startsAt")} />
            </div>
            <div className="form-group">
              <label htmlFor="ef-endsAt">Ends</label>
              <input type="datetime-local" required {...field("endsAt")} />
            </div>
            <div className="form-group">
              <label htmlFor="ef-registrationOpensAt">Registration opens (optional)</label>
              <input type="datetime-local" {...field("registrationOpensAt")} />
            </div>
            <div className="form-group">
              <label htmlFor="ef-registrationClosesAt">Registration closes (optional)</label>
              <input type="datetime-local" aria-describedby="ef-closes-hint" {...field("registrationClosesAt")} />
              <small id="ef-closes-hint" className="form-hint">Defaults to the start time.</small>
            </div>
          </div>
        </fieldset>

        <fieldset className="form-section">
          <legend>Tickets &amp; contact</legend>
          <div className="form-grid">
            <div className="form-group">
              <label htmlFor="ef-capacity">Capacity</label>
              <input type="number" required min={1} max={100000} {...field("capacity")} />
            </div>
            <div className="form-group">
              <label htmlFor="ef-tags">Tags (comma separated)</label>
              <input placeholder="coding, beginner" {...field("tags")} />
            </div>
            <div className="form-group">
              <label htmlFor="ef-coordinatorName">Coordinator name</label>
              <input maxLength={100} {...field("coordinatorName")} />
            </div>
            <div className="form-group">
              <label htmlFor="ef-coordinatorContact">Coordinator email or phone</label>
              <input maxLength={150} required={!!form.coordinatorName} {...field("coordinatorContact")} />
            </div>
          </div>
          <p className="form-hint">All events are free for now. Paid tickets will be added with a verified payment gateway.</p>
        </fieldset>

        <div className="modal-actions">
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? "Saving..." : isEdit ? "Save changes" : "Create draft"}
          </button>
        </div>
      </form>
    </div>
  );
};

export default EventForm;
