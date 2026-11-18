import { Outlet, NavLink } from "react-router-dom";
import { HiOutlineCalendar, HiOutlineTicket, HiOutlineHome, HiOutlineChartBar } from "react-icons/hi";
import Footer from "./Footer";

const MainLayout = () => {
  return (
    <div className="app-layout">
      <aside className="sidebar">
        <div className="sidebar-brand">
          <HiOutlineCalendar className="brand-icon" />
          <span>CampusEvents</span>
        </div>
        <nav className="sidebar-nav">
          <NavLink to="/" className={({ isActive }) => isActive ? "nav-link active" : "nav-link"}>
            <HiOutlineHome /> <span>Dashboard</span>
          </NavLink>
          <NavLink to="/events" className={({ isActive }) => isActive ? "nav-link active" : "nav-link"}>
            <HiOutlineCalendar /> <span>Events</span>
          </NavLink>
          <NavLink to="/registrations" className={({ isActive }) => isActive ? "nav-link active" : "nav-link"}>
            <HiOutlineTicket /> <span>Registrations</span>
          </NavLink>
          <NavLink to="/analytics" className={({ isActive }) => isActive ? "nav-link active" : "nav-link"}>
            <HiOutlineChartBar /> <span>Analytics</span>
          </NavLink>
        </nav>
      </aside>
      <main className="main-content">
        <Outlet />
        <Footer />
      </main>
    </div>
  );
};

export default MainLayout;
