import { useState } from "react";
import { Outlet, NavLink, Link, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import {
  HiOutlineCalendar,
  HiOutlineTicket,
  HiOutlineHome,
  HiOutlineChartBar,
  HiOutlineLogout,
  HiOutlineLogin,
  HiMenu,
  HiX,
} from "react-icons/hi";
import Footer from "./Footer";
import { useAuth } from "../context/AuthContext";

const ROLE_LABELS = { student: "Student", uni_admin: "University Admin", super_admin: "Super Admin" };

const navClass = ({ isActive }) => (isActive ? "nav-link active" : "nav-link");

const MainLayout = () => {
  const { user, isAdmin, logout } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const closeMenu = () => setMenuOpen(false);

  const handleLogout = async () => {
    await logout();
    toast.success("Signed out");
    navigate("/events");
  };

  return (
    <div className="app-layout">
      <a href="#main" className="skip-link">Skip to content</a>

      <header className="mobile-topbar">
        <Link to="/" className="sidebar-brand" onClick={closeMenu}>
          <HiOutlineCalendar className="brand-icon" aria-hidden="true" />
          <span>Event Engine</span>
        </Link>
        <button
          type="button"
          className="btn-icon"
          aria-label={menuOpen ? "Close menu" : "Open menu"}
          aria-expanded={menuOpen}
          aria-controls="sidebar"
          onClick={() => setMenuOpen((o) => !o)}
        >
          {menuOpen ? <HiX /> : <HiMenu />}
        </button>
      </header>

      <aside id="sidebar" className={`sidebar ${menuOpen ? "sidebar--open" : ""}`}>
        <Link to="/" className="sidebar-brand" onClick={closeMenu}>
          <HiOutlineCalendar className="brand-icon" aria-hidden="true" />
          <span>Event Engine</span>
        </Link>
        <nav className="sidebar-nav" aria-label="Main">
          {isAdmin && (
            <NavLink to="/" end className={navClass} onClick={closeMenu}>
              <HiOutlineHome aria-hidden="true" /> <span>Dashboard</span>
            </NavLink>
          )}
          <NavLink to="/events" className={navClass} onClick={closeMenu}>
            <HiOutlineCalendar aria-hidden="true" /> <span>Events</span>
          </NavLink>
          {isAdmin && (
            <>
              <NavLink to="/registrations" className={navClass} onClick={closeMenu}>
                <HiOutlineTicket aria-hidden="true" /> <span>Registrations</span>
              </NavLink>
              <NavLink to="/analytics" className={navClass} onClick={closeMenu}>
                <HiOutlineChartBar aria-hidden="true" /> <span>Analytics</span>
              </NavLink>
            </>
          )}
        </nav>

        <div className="sidebar-user">
          {user ? (
            <>
              <div className="sidebar-user-info">
                <span className="sidebar-user-name">{user.name}</span>
                <span className="sidebar-user-role">{ROLE_LABELS[user.role] || user.role}</span>
              </div>
              <button type="button" className="nav-link nav-button" onClick={handleLogout}>
                <HiOutlineLogout aria-hidden="true" /> <span>Sign out</span>
              </button>
            </>
          ) : (
            <NavLink to="/login" className={navClass} onClick={closeMenu}>
              <HiOutlineLogin aria-hidden="true" /> <span>Sign in</span>
            </NavLink>
          )}
        </div>
      </aside>

      {menuOpen && <div className="sidebar-backdrop" onClick={closeMenu} aria-hidden="true" />}

      <main id="main" className="main-content">
        <Outlet />
        <Footer />
      </main>
    </div>
  );
};

export default MainLayout;
