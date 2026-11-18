import { lazy, Suspense } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import MainLayout from "./components/MainLayout";
import ProtectedRoute from "./components/ProtectedRoute";
import { PageSkeleton } from "./components/Skeleton";
import { MotionProvider } from "./lib/motion";
import ErrorBoundary from "./components/ErrorBoundary";
import { AuthProvider, ADMIN_ROLES, useAuth } from "./context/AuthContext";
import Dashboard from "./pages/Dashboard";
import Events from "./pages/Events";
import EventDetail from "./pages/EventDetail";
import EventForm from "./pages/EventForm";
import ManageEvents from "./pages/ManageEvents";
import Registrations from "./pages/Registrations";
import Analytics from "./pages/Analytics";
import Clubs from "./pages/Clubs";
import ClubDetail from "./pages/ClubDetail";
import ClubRequest from "./pages/ClubRequest";
import Profile from "./pages/Profile";
import Approvals from "./pages/Approvals";
import AdminUsers from "./pages/AdminUsers";
import Login from "./pages/Login";
import Signup from "./pages/Signup";

import Landing from "./pages/Landing";
import StudentHome from "./pages/StudentHome";
import ClubDashboard from "./pages/ClubDashboard";

// Pages with heavy libraries (camera scanner, QR) load only when opened.
const Scanner = lazy(() => import("./pages/Scanner"));
const MyTickets = lazy(() => import("./pages/MyTickets"));

// Home: visitors see the landing page, students their personal dashboard,
// admins the platform dashboard.
function Home() {
  const { loading, isAdmin, user } = useAuth();
  if (loading) return <PageSkeleton />;
  if (!user) return <Landing />;
  return isAdmin ? <Dashboard /> : <StudentHome />;
}

// Manage-events pages: admins and active club team members.
function RequireManager() {
  const { loading, canManageEvents, user } = useAuth();
  if (loading) return <PageSkeleton />;
  if (!user) return <Navigate to="/login" replace />;
  return canManageEvents ? <ProtectedRoute /> : <Navigate to="/events" replace />;
}

function App() {
  return (
    <AuthProvider>
      <MotionProvider>
      <Router>
        <ErrorBoundary>
        <Suspense fallback={<PageSkeleton />}>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />

          <Route path="/" element={<MainLayout />}>
            <Route index element={<Home />} />

            {/* Public */}
            <Route path="events" element={<Events />} />
            <Route path="events/:id" element={<EventDetail />} />
            <Route path="clubs" element={<Clubs />} />
            <Route path="clubs/:slug" element={<ClubDetail />} />

            {/* Any signed-in user */}
            <Route element={<ProtectedRoute />}>
              <Route path="tickets" element={<MyTickets />} />
              <Route path="profile" element={<Profile />} />
              <Route path="clubs/new" element={<ClubRequest />} />
            </Route>

            {/* Club organizers and admins */}
            <Route element={<RequireManager />}>
              <Route path="manage/dashboard" element={<ClubDashboard />} />
              <Route path="manage/events" element={<ManageEvents />} />
              <Route path="manage/events/new" element={<EventForm />} />
              <Route path="manage/events/:id/edit" element={<EventForm />} />
              <Route path="manage/events/:id/scan" element={<Scanner />} />
            </Route>

            {/* Platform admins */}
            <Route element={<ProtectedRoute roles={ADMIN_ROLES} />}>
              <Route path="registrations" element={<Registrations />} />
              <Route path="analytics" element={<Analytics />} />
              <Route path="admin/approvals" element={<Approvals />} />
              <Route path="admin/users" element={<AdminUsers />} />
            </Route>

            <Route path="*" element={<Navigate to="/events" replace />} />
          </Route>
        </Routes>
        </Suspense>
        </ErrorBoundary>
      </Router>
      </MotionProvider>
    </AuthProvider>
  );
}

export default App;
