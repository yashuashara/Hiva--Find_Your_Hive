import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { updateMe, errorMessage } from "../services/api";
import { useAuth } from "../context/AuthContext";
import PageHeader from "../components/PageHeader";

const DEPARTMENTS = [
  "Computer Science",
  "Information Technology",
  "Electronics",
  "Electrical Engineering",
  "Mechanical Engineering",
  "Civil Engineering",
  "Management",
  "Design",
  "Law",
  "Liberal Arts",
  "Other",
];

const Profile = () => {
  const { user, setUser, memberships } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const p = user.profile || {};
  // A department that isn't in the list (or "Other") shows as "Other" with
  // the text box filled in.
  const listed = DEPARTMENTS.includes(p.department) && p.department !== "Other";
  const [form, setForm] = useState({
    name: user.name,
    prn: p.prn || "",
    department: listed ? p.department : p.department ? "Other" : "",
    departmentOther: !listed && p.department && p.department !== "Other" ? p.department : "",
    year: p.year || "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSaving(true);
    try {
      const profile = {};
      if (form.prn) profile.prn = form.prn;
      const department = form.department === "Other" ? form.departmentOther.trim() : form.department;
      if (form.department === "Other" && department.length < 2) {
        setError("Please type your department.");
        setSaving(false);
        return;
      }
      if (department) profile.department = department;
      if (form.year) profile.year = Number(form.year);
      const res = await updateMe({ name: form.name, profile });
      setUser(res.data.data);
      toast.success("Profile saved");
      // Came here from an event's Register button: go back to it.
      if (location.state?.from) navigate(location.state.from);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="page-container page-container--narrow">
      <PageHeader title="Your profile" subtitle={user.email} />

      <form className="detail-card form-card" onSubmit={handleSubmit}>
        {error && <div className="form-error" role="alert">{error}</div>}
        <div className="form-group">
          <label htmlFor="pf-name">Full name</label>
          <input id="pf-name" required minLength={2} maxLength={100} autoComplete="name" value={form.name} onChange={set("name")} />
        </div>
        <fieldset className="form-section">
          <legend>Student details</legend>
          <p className="form-hint">Needed to register for events. Only you, admins and the organizers of events you register for can see these.</p>
          <div className="form-grid">
            <div className="form-group">
              <label htmlFor="pf-prn">PRN / student ID</label>
              <input id="pf-prn" maxLength={30} value={form.prn} onChange={set("prn")} />
            </div>
            <div className="form-group">
              <label htmlFor="pf-dept">Department</label>
              <select id="pf-dept" value={form.department} onChange={set("department")}>
                <option value="">Select…</option>
                {DEPARTMENTS.map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>
            {form.department === "Other" && (
              <div className="form-group">
                <label htmlFor="pf-dept-other">Your department</label>
                <input
                  id="pf-dept-other"
                  required
                  minLength={2}
                  maxLength={100}
                  autoFocus={!form.departmentOther}
                  placeholder="e.g. Pharmacy, Architecture"
                  value={form.departmentOther}
                  onChange={set("departmentOther")}
                />
              </div>
            )}
            <div className="form-group">
              <label htmlFor="pf-year">Year of study</label>
              <select id="pf-year" value={form.year} onChange={set("year")}>
                <option value="">Select…</option>
                {[1, 2, 3, 4, 5, 6].map((y) => <option key={y} value={y}>Year {y}</option>)}
              </select>
            </div>
          </div>
        </fieldset>
        <div className="modal-actions">
          <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? "Saving..." : "Save profile"}</button>
        </div>
      </form>

      {memberships.length > 0 && (
        <section className="detail-card">
          <h3>Your clubs</h3>
          <ul className="member-list">
            {memberships.map((m) => (
              <li key={m.membershipId} className="member-row">
                <Link className="text-link cell-bold" to={`/clubs/${m.club.slug}`}>{m.club.name}</Link>
                <span className="muted">{m.role}{m.status === "pending" ? " (awaiting approval)" : ""}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
};

export default Profile;
