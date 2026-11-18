import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { requestClub, errorMessage } from "../services/api";
import { useAuth } from "../context/AuthContext";
import PageHeader from "../components/PageHeader";
import { HiArrowLeft } from "react-icons/hi";

const CATEGORIES = ["Technical", "Cultural", "Sports", "Entrepreneurship", "Arts", "Social", "Academic", "Other"];

// Any signed-in user can request a club. It stays private until a university
// admin approves it; the requester then becomes its owner.
const ClubRequest = () => {
  const navigate = useNavigate();
  const { isAdmin, refreshMemberships } = useAuth();
  const [form, setForm] = useState({ name: "", category: "Technical", description: "", contactEmail: "", logoUrl: "", instagram: "", website: "" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSaving(true);
    try {
      const res = await requestClub({
        name: form.name,
        category: form.category,
        description: form.description,
        contactEmail: form.contactEmail,
        logoUrl: form.logoUrl,
        socials: { instagram: form.instagram, website: form.website },
      });
      await refreshMemberships();
      toast.success(isAdmin ? "Club created" : "Request sent. A university admin will review it.");
      navigate(`/clubs/${res.data.data.slug}`);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="page-container page-container--narrow">
      <Link to="/clubs" className="back-link"><HiArrowLeft aria-hidden="true" /> Clubs</Link>
      <PageHeader
        title={isAdmin ? "Create a club" : "Request a club"}
        subtitle={isAdmin ? "Clubs you create are approved immediately." : "A university admin verifies every club before it can publish events."}
      />
      <form className="detail-card form-card" onSubmit={handleSubmit}>
        {error && <div className="form-error" role="alert">{error}</div>}
        <div className="form-grid">
          <div className="form-group">
            <label htmlFor="cr-name">Club name</label>
            <input id="cr-name" required minLength={3} maxLength={100} value={form.name} onChange={set("name")} />
          </div>
          <div className="form-group">
            <label htmlFor="cr-category">Category</label>
            <select id="cr-category" value={form.category} onChange={set("category")}>
              {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        </div>
        <div className="form-group">
          <label htmlFor="cr-description">What does the club do?</label>
          <textarea id="cr-description" rows={4} maxLength={2000} value={form.description} onChange={set("description")} />
        </div>
        <div className="form-grid">
          <div className="form-group">
            <label htmlFor="cr-email">Club contact email (optional)</label>
            <input id="cr-email" type="email" value={form.contactEmail} onChange={set("contactEmail")} />
          </div>
          <div className="form-group">
            <label htmlFor="cr-logo">Logo image link (optional)</label>
            <input id="cr-logo" type="url" placeholder="https://..." value={form.logoUrl} onChange={set("logoUrl")} />
          </div>
          <div className="form-group">
            <label htmlFor="cr-insta">Instagram (optional)</label>
            <input id="cr-insta" type="url" placeholder="https://instagram.com/..." value={form.instagram} onChange={set("instagram")} />
          </div>
          <div className="form-group">
            <label htmlFor="cr-web">Website (optional)</label>
            <input id="cr-web" type="url" placeholder="https://..." value={form.website} onChange={set("website")} />
          </div>
        </div>
        <div className="modal-actions">
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? "Sending..." : isAdmin ? "Create club" : "Send request"}
          </button>
        </div>
      </form>
    </div>
  );
};

export default ClubRequest;
