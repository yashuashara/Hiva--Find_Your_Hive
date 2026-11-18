import axios from "axios";

// By default the API is on the same site under /api (Vercel in production,
// the Vite dev-server proxy locally). VITE_API_URL can point elsewhere.
// Older configs pointed at ".../api/campus"; that suffix is stripped.
export const API_BASE = (import.meta.env.VITE_API_URL || "/api")
  .replace(/\/+$/, "")
  .replace(/\/campus$/, "");

const API = axios.create({
  baseURL: API_BASE,
  // Send the httpOnly session cookie with every request.
  withCredentials: true,
  // Required by the API on every state-changing request (CSRF protection).
  headers: { "X-Requested-With": "XMLHttpRequest" },
});

// Turns any API/network error into a message that is safe to show users.
export const errorMessage = (err, fallback = "Something went wrong. Please try again.") => {
  const details = err?.response?.data?.details;
  if (Array.isArray(details) && details.length) {
    return details.map((d) => (d.field ? `${d.field}: ${d.message}` : d.message)).join("\n");
  }
  if (err?.response?.data?.message) return err.response.data.message;
  if (err?.request && !err.response) return "Cannot reach the server. Check your connection.";
  return fallback;
};

export const errorCode = (err) => err?.response?.data?.details?.code;

const enc = encodeURIComponent;

// ==================== AUTH & PROFILE ====================
export const signup = (data) => API.post("/auth/signup", data);
export const login = (data) => API.post("/auth/login", data);
export const logout = () => API.post("/auth/logout");
export const getMe = () => API.get("/auth/me");
export const updateMe = (data) => API.patch("/auth/me", data);

// ==================== EVENTS ====================
// Public discovery: { q, category, club, when, price, page, limit }
export const listEvents = (params) => API.get("/campus/events", { params });
export const getEventById = (id) => API.get(`/campus/events/${enc(id)}`);
// Events the user can manage, in any status: { status, club, q, page, limit }
export const listManageableEvents = (params) => API.get("/campus/manage/events", { params });
export const createEvent = (data) => API.post("/campus/events", data);
export const updateEvent = (id, data) => API.put(`/campus/events/${enc(id)}`, data);
export const deleteEvent = (id) => API.delete(`/campus/events/${enc(id)}`);
// action: submit | withdraw | approve | reject | publish | cancel | complete
export const transitionEvent = (id, action, reason) =>
  API.post(`/campus/events/${enc(id)}/${action}`, reason ? { reason } : {});
export const registerForEvent = (id) => API.post(`/campus/events/${enc(id)}/register`, {});
export const exportAttendeesUrl = (id) => `${API_BASE}/campus/events/${enc(id)}/registrations/export`;

// ==================== REGISTRATIONS ====================
export const getAllRegistrations = () => API.get("/campus/registrations");
export const getRegistrationsByEvent = (eventId, status = "confirmed") =>
  API.get(`/campus/events/${enc(eventId)}/registrations`, { params: { status } });
export const getRegistrationByTicket = (ticketId) => API.get(`/campus/registrations/${enc(ticketId)}`);
export const createRegistration = (data) => API.post("/campus/registrations", data);
export const setCheckIn = (ticketId, checkInStatus) =>
  API.put(`/campus/registrations/${enc(ticketId)}`, { checkInStatus });
export const cancelRegistration = (ticketId) => API.delete(`/campus/registrations/${enc(ticketId)}`);

// ==================== DOOR SCANNING ====================
// `code` is the raw QR text (or a typed ticket ID); the server verifies it.
export const scanTicket = (eventId, code) => API.post(`/campus/events/${enc(eventId)}/check-in`, { code });
export const getAttendance = (eventId) => API.get(`/campus/events/${enc(eventId)}/attendance`);

// ==================== MY TICKETS ====================
export const myRegistrations = (when = "all") => API.get("/me/registrations", { params: { when } });
export const cancelMyRegistration = (ticketId) => API.post(`/me/registrations/${enc(ticketId)}/cancel`, {});

// ==================== CLUBS ====================
export const listClubs = (params) => API.get("/clubs", { params });
export const myClubs = () => API.get("/clubs/mine");
export const getClub = (slug) => API.get(`/clubs/${enc(slug)}`);
export const requestClub = (data) => API.post("/clubs", data);
export const updateClub = (id, data) => API.patch(`/clubs/${enc(id)}`, data);
// action: approve | reject | suspend | reinstate
export const reviewClub = (id, action, reason) => API.post(`/clubs/${enc(id)}/${action}`, reason ? { reason } : {});
export const listClubMembers = (id) => API.get(`/clubs/${enc(id)}/members`);
export const addClubMember = (id, data) => API.post(`/clubs/${enc(id)}/members`, data);
export const approveClubMember = (id, memberId) => API.post(`/clubs/${enc(id)}/members/${enc(memberId)}/approve`, {});
export const removeClubMember = (id, memberId) => API.delete(`/clubs/${enc(id)}/members/${enc(memberId)}`);

export const followClub = (id) => API.post(`/clubs/${enc(id)}/follow`, {});
export const unfollowClub = (id) => API.delete(`/clubs/${enc(id)}/follow`);

// ==================== DASHBOARDS ====================
export const getAdminAnalytics = () => API.get("/analytics/admin");
export const getClubAnalytics = (clubId) => API.get(`/analytics/clubs/${enc(clubId)}`);
export const getMyDashboard = () => API.get("/me/dashboard");
export const getRecommendations = () => API.get("/me/recommendations");

// ==================== UPLOADS ====================
// Returns { url } for a JPEG/PNG/WebP image (max 2 MB). The server checks
// the actual file contents, not just the extension.
export const uploadImage = (file) => {
  const form = new FormData();
  form.append("image", file);
  return API.post("/uploads/images", form);
};

// ==================== PLATFORM ADMIN ====================
export const getApprovals = () => API.get("/admin/approvals");
export const listUsers = (params) => API.get("/admin/users", { params });
export const setUserRole = (id, role) => API.patch(`/admin/users/${enc(id)}/role`, { role });
export const setUserStatus = (id, status) => API.patch(`/admin/users/${enc(id)}/status`, { status });

export default API;
