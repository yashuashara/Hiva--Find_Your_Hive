import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import MainLayout from "./components/MainLayout";
import ProtectedRoute from "./components/ProtectedRoute";
import Loader from "./components/Loader";
import { AuthProvider, ADMIN_ROLES, useAuth } from "./context/AuthContext";
import Dashboard from "./pages/Dashboard";
import Events from "./pages/Events";
import EventDetail from "./pages/EventDetail";
import Registrations from "./pages/Registrations";
import Analytics from "./pages/Analytics";
import Login from "./pages/Login";
import Signup from "./pages/Signup";

function Home() {
  const { loading, isAdmin } = useAuth();
  if (loading) return <Loader />;
  return isAdmin ? <Dashboard /> : <Navigate to="/events" replace />;
}

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />

          <Route path="/" element={<MainLayout />}>
            {/* Public: anyone can browse events */}
            <Route path="events" element={<Events />} />
            <Route path="events/:id" element={<EventDetail />} />

            {/* Home: admins see the dashboard, everyone else the events list */}
            <Route index element={<Home />} />

            {/* Admin console */}
            <Route element={<ProtectedRoute roles={ADMIN_ROLES} />}>
              <Route path="registrations" element={<Registrations />} />
              <Route path="analytics" element={<Analytics />} />
            </Route>

            <Route path="*" element={<Navigate to="/events" replace />} />
          </Route>
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
