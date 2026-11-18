import { Suspense, useState } from "react";
import { NavLink, Link, useLocation, useNavigate, useOutlet } from "react-router-dom";
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
import { PageSkeleton } from "./Skeleton";
import { useAuth } from "../context/AuthContext";
import { AnimatePresence, m, spring, EASE } from "../lib/motion";

const ROLE_LABELS = { student: "Student", uni_admin: "University Admin", super_admin: "Super Admin" };

const navClass = ({ isActive }) => (isActive ? "nav-link active" : "nav-link");

// A sidebar link. The active highlight is one shared element (layoutId)
// that slides from the previous item to the new one.
const NavItem = ({ to, end, icon: Icon, onClick, children }) => (
  <NavLink to={to} end={end} className={navClass} onClick={onClick}>
    {({ isActive }) => (
      <>
        {isActive && <m.span layoutId="nav-indicator" className="nav-indicator" transition={spring} />}
        <Icon aria-hidden="true" />
        {children}
      </>
    )}
  </NavLink>
);

const MainLayout = () => {
  const { user, isAdmin, canManageEvents, activeClubs, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const outlet = useOutlet();
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
          {!isAdmin && <NavItem to="/" end icon={HiOutlineHome} onClick={closeMenu}><span>Home</span></NavItem>}
          <NavItem to="/events" icon={HiOutlineCalendar} onClick={closeMenu}><span>Events</span></NavItem>
          <NavItem to="/clubs" end icon={HiOutlineUserGroup} onClick={closeMenu}><span>Clubs</span></NavItem>
          {user && <NavItem to="/tickets" icon={HiOutlineTicket} onClick={closeMenu}><span>My tickets</span></NavItem>}

          {canManageEvents && (
            <>
              <span className="nav-section">Organize</span>
              {(isAdmin || activeClubs.some((mb) => ["owner", "organizer"].includes(mb.role))) && (
                <NavItem to="/manage/dashboard" icon={HiOutlinePresentationChartLine} onClick={closeMenu}>
                  <span>Club dashboard</span>
                </NavItem>
              )}
              <NavItem to="/manage/events" icon={HiOutlineClipboardList} onClick={closeMenu}><span>Manage events</span></NavItem>
            </>
          )}

          {isAdmin && (
            <>
              <span className="nav-section">Admin</span>
              <NavItem to="/" end icon={HiOutlineHome} onClick={closeMenu}><span>Dashboard</span></NavItem>
              <NavItem to="/admin/approvals" icon={HiOutlineBadgeCheck} onClick={closeMenu}><span>Approvals</span></NavItem>
              <NavItem to="/registrations" icon={HiOutlineCollection} onClick={closeMenu}><span>Registrations</span></NavItem>
              <NavItem to="/analytics" icon={HiOutlineChartBar} onClick={closeMenu}><span>Reports</span></NavItem>
              <NavItem to="/admin/users" icon={HiOutlineUsers} onClick={closeMenu}><span>Users</span></NavItem>
            </>
          )}
        </nav>

        <div className="sidebar-user">
          <ThemeToggle />
          {user ? (
            <>
              <NavItem to="/profile" icon={HiOutlineUserCircle} onClick={closeMenu}>
                <span className="sidebar-user-info">
                  <span className="sidebar-user-name">{user.name}</span>
                  <span className="sidebar-user-role">{ROLE_LABELS[user.role] || user.role}</span>
                </span>
              </NavItem>
              <button type="button" className="nav-link nav-button" onClick={handleLogout}>
                <HiOutlineLogout aria-hidden="true" /> <span>Sign out</span>
              </button>
            </>
          ) : (
            <>
              <NavItem to="/login" icon={HiOutlineLogin} onClick={closeMenu}><span>Sign in</span></NavItem>
              <Link to="/signup" className="btn btn-primary btn-sm" onClick={closeMenu}>Create account</Link>
            </>
          )}
        </div>
      </aside>

      {menuOpen && <div className="sidebar-backdrop" onClick={closeMenu} aria-hidden="true" />}

      <main id="main" className="main-content">
        {/* Page transitions are keyed by PATH only: changing filters or tabs
            (the query string) never re-animates or remounts the page.
            The old page fades out, the window scrolls to the top, then the new
            page fades in, so content never jumps mid-transition. */}
        <AnimatePresence mode="wait" initial={false} onExitComplete={() => window.scrollTo({ top: 0 })}>
          <m.div
            // Also keyed by account: if the signed-in user changes (e.g. in
            // another tab), every page remounts and reloads its data for the
            // new account instead of showing the previous person's data.
            key={`${location.pathname}|${user?.id || "guest"}`}
            className="page-transition"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.16, ease: EASE }}
          >
            <Suspense fallback={<PageSkeleton />}>{outlet}</Suspense>
          </m.div>
        </AnimatePresence>
        <Footer />
      </main>
    </div>
  );
};

export default MainLayout;
