import { useState } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { HiOutlineCalendar } from "react-icons/hi";
import { useAuth, ADMIN_ROLES } from "../context/AuthContext";
import { errorMessage } from "../services/api";

const Login = () => {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState({ email: "", password: "" });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  if (user) return <Navigate to="/" replace />;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      const signedIn = await login(form);
      toast.success(`Welcome back, ${signedIn.name.split(" ")[0]}!`);
      const fallback = ADMIN_ROLES.includes(signedIn.role) ? "/" : "/events";
      navigate(location.state?.from || fallback, { replace: true });
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <Link to="/events" className="auth-brand">
          <HiOutlineCalendar aria-hidden="true" /> Event Engine
        </Link>
        <h1>Sign in</h1>
        <p className="auth-subtitle">Welcome back. Sign in to manage your events and tickets.</p>

        <form onSubmit={handleSubmit} className="auth-form" noValidate>
          {error && <div className="form-error" role="alert">{error}</div>}
          <div className="form-group">
            <label htmlFor="login-email">Email</label>
            <input
              id="login-email"
              type="email"
              autoComplete="email"
              required
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
          </div>
          <div className="form-group">
            <label htmlFor="login-password">Password</label>
            <input
              id="login-password"
              type="password"
              autoComplete="current-password"
              required
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
            />
          </div>
          <button type="submit" className="btn btn-primary btn-block" disabled={submitting}>
            {submitting ? "Signing in..." : "Sign in"}
          </button>
        </form>

        <p className="auth-switch">
          New here? <Link to="/signup">Create an account</Link>
        </p>
      </div>
    </div>
  );
};

export default Login;
