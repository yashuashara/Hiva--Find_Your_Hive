import { useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { HiOutlineCalendar } from "react-icons/hi";
import { useAuth } from "../context/AuthContext";
import { errorMessage } from "../services/api";

const MIN_PASSWORD = 10;

const Signup = () => {
  const { user, signup } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: "", email: "", password: "", confirm: "" });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  if (user) return <Navigate to="/" replace />;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (form.password.length < MIN_PASSWORD) {
      setError(`Password must be at least ${MIN_PASSWORD} characters.`);
      return;
    }
    if (form.password !== form.confirm) {
      setError("Passwords do not match.");
      return;
    }
    setSubmitting(true);
    try {
      await signup({ name: form.name, email: form.email, password: form.password });
      toast.success("Account created. Welcome!");
      navigate("/events", { replace: true });
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  const set = (field) => (e) => setForm({ ...form, [field]: e.target.value });

  return (
    <div className="auth-page">
      <div className="auth-card">
        <Link to="/events" className="auth-brand">
          <HiOutlineCalendar aria-hidden="true" /> Hiva
        </Link>
        <h1>Create your account</h1>
        <p className="auth-subtitle">Discover campus events and keep all your tickets in one place.</p>

        <form onSubmit={handleSubmit} className="auth-form" noValidate>
          {error && <div className="form-error" role="alert">{error}</div>}
          <div className="form-group">
            <label htmlFor="signup-name">Full name</label>
            <input id="signup-name" autoComplete="name" required maxLength={100} value={form.name} onChange={set("name")} />
          </div>
          <div className="form-group">
            <label htmlFor="signup-email">Email</label>
            <input id="signup-email" type="email" autoComplete="email" required value={form.email} onChange={set("email")} />
          </div>
          <div className="form-group">
            <label htmlFor="signup-password">Password</label>
            <input
              id="signup-password"
              type="password"
              autoComplete="new-password"
              required
              minLength={MIN_PASSWORD}
              aria-describedby="signup-password-hint"
              value={form.password}
              onChange={set("password")}
            />
            <small id="signup-password-hint" className="form-hint">
              At least {MIN_PASSWORD} characters. A short phrase is easier to remember.
            </small>
          </div>
          <div className="form-group">
            <label htmlFor="signup-confirm">Confirm password</label>
            <input
              id="signup-confirm"
              type="password"
              autoComplete="new-password"
              required
              value={form.confirm}
              onChange={set("confirm")}
            />
          </div>
          <button type="submit" className="btn btn-primary btn-block" disabled={submitting}>
            {submitting ? "Creating account..." : "Create account"}
          </button>
        </form>

        <p className="auth-switch">
          Already have an account? <Link to="/login">Sign in</Link>
        </p>
      </div>
    </div>
  );
};

export default Signup;
