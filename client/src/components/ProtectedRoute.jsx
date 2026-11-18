import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import Loader from "./Loader";
import EmptyState from "./EmptyState";

// Guards a group of routes. This is a UX convenience only: the API enforces
// the same rules, so hiding a page here is never the actual security boundary.
const ProtectedRoute = ({ roles }) => {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) return <Loader label="Checking your session..." />;

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  if (roles && !roles.includes(user.role)) {
    return (
      <div className="page-container">
        <EmptyState
          title="You don't have access to this page"
          message="This area is for platform administrators. If you think this is a mistake, contact your administrator."
        />
      </div>
    );
  }

  return <Outlet />;
};

export default ProtectedRoute;
