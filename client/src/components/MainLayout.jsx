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
  HiOutlineUserGroup,
  HiOutlineClipboardList,
  HiOutlineBadgeCheck,
  HiOutlineCollection,
  HiOutlineUsers,
  HiOutlineUserCircle,
  HiOutlinePresentationChartLine,
  HiMenu,
  HiX,
} from "react-icons/hi";
import Footer from "./Footer";
import ThemeToggle from "./ThemeToggle";
import { useAuth } from "../context/AuthContext";

const ROLE_LABELS = { student: "Student", uni_admin: "University Admin", super_admin: "Super Admin" };

const navClass = ({ isActive }) => (isActive ? "nav-link active" : "nav-link");

const MainLayout = () => {
  const { user, isAdmin, canManageEvents, activeClubs, logout } = useAuth();
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
          {!isAdmin && (
            <NavLink to="/" end className={navClass} onClick={closeMenu}>
              <HiOutlineHome aria-hidden="true" /> <span>Home</span>
            </NavLink>
          )}
          <NavLink to="/events" className={navClass} onClick={closeMenu}>
            <HiOutlineCalendar aria-hidden="true" /> <span>Events</span>
          </NavLink>
          <NavLink to="/clubs" end className={navClass} onClick={closeMenu}>
            <HiOutlineUserGroup aria-hidden="true" /> <span>Clubs</span>
          </NavLink>
          {user && (
            <NavLink to="/tickets" className={navClass} onClick={closeMenu}>
              <HiOutlineTicket aria-hidden="true" /> <span>My tickets</span>
            </NavLink>
          )}

          {canManageEvents && (
            <>
              <span className="nav-section">Organize</span>
              {(isAdmin || activeClubs.some((m) => ["owner", "organizer"].includes(m.role))) && (
                <NavLink to="/manage/dashboard" className={navClass} onClick={closeMenu}>
                  <HiOutlinePresentationChartLine aria-hidden="true" /> <span>Club dashboard</span>
                </NavLink>
              )}
              <NavLink to="/manage/events" className={navClass} onClick={closeMenu}>
                <HiOutlineClipboardList aria-hidden="true" /> <span>Manage events</span>
              </NavLink>
            </>
          )}

          {isAdmin && (
            <>
              <span className="nav-section">Admin</span>
              <NavLink to="/" end className={navClass} onClick={closeMenu}>
                <HiOutlineHome aria-hidden="true" /> <span>Dashboard</span>
              </NavLink>
              <NavLink to="/admin/approvals" className={navClass} onClick={closeMenu}>
                <HiOutlineBadgeCheck aria-hidden="true" /> <span>Approvals</span>
              </NavLink>
              <NavLink to="/registrations" className={navClass} onClick={closeMenu}>
                <HiOutlineCollection aria-hidden="true" /> <span>Registrations</span>
              </NavLink>
              <NavLink to="/analytics" className={navClass} onClick={closeMenu}>
                <HiOutlineChartBar aria-hidden="true" /> <span>Reports</span>
              </NavLink>
              <NavLink to="/admin/users" className={navClass} onClick={closeMenu}>
                <HiOutlineUsers aria-hidden="true" /> <span>Users</span>
              </NavLink>
            </>
          )}
        </nav>

        <div className="sidebar-user">
          <ThemeToggle />
          {user ? (
            <>
              <NavLink to="/profile" className={navClass} onClick={closeMenu}>
                <HiOutlineUserCircle aria-hidden="true" />
                <span className="sidebar-user-info">
                  <span className="sidebar-user-name">{user.name}</span>
                  <span className="sidebar-user-role">{ROLE_LABELS[user.role] || user.role}</span>
                </span>
              </NavLink>
              <button type="button" className="nav-link nav-button" onClick={handleLogout}>
                <HiOutlineLogout aria-hidden="true" /> <span>Sign out</span>
              </button>
            </>
          ) : (
            <>
              <NavLink to="/login" className={navClass} onClick={closeMenu}>
                <HiOutlineLogin aria-hidden="true" /> <span>Sign in</span>
              </NavLink>
              <Link to="/signup" className="btn btn-primary btn-sm" onClick={closeMenu}>Create account</Link>
            </>
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
