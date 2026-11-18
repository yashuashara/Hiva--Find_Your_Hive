import axios from "axios";

// VITE_API_URL should point at ".../api". Older configs pointed at
// ".../api/campus"; that suffix is stripped so they keep working.
const baseURL = (import.meta.env.VITE_API_URL || "http://localhost:5000/api")
  .replace(/\/+$/, "")
  .replace(/\/campus$/, "");

const API = axios.create({
  baseURL,
  // Send the httpOnly session cookie with every request.
  withCredentials: true,
  // Required by the API on every state-changing request (CSRF protection).
  headers: { "X-Requested-With": "XMLHttpRequest" },
});

// Turns any API/network error into a message that is safe to show users.
export const errorMessage = (err, fallback = "Something went wrong. Please try again.") => {
  if (err?.response?.data?.details?.length) {
    return err.response.data.details.map((d) => (d.field ? `${d.field}: ${d.message}` : d.message)).join("\n");
  }
  if (err?.response?.data?.message) return err.response.data.message;
  if (err?.request && !err.response) return "Cannot reach the server. Check your connection.";
  return fallback;
};

// ==================== AUTH API ====================

export const signup = (data) => API.post("/auth/signup", data);
export const login = (data) => API.post("/auth/login", data);
export const logout = () => API.post("/auth/logout");
export const getMe = () => API.get("/auth/me");

// ==================== EVENT API ====================

export const getAllEvents = () => API.get("/campus/events");

export const getEventById = (id) => API.get(`/campus/events/${encodeURIComponent(id)}`);

export const createEvent = (eventData) => API.post("/campus/events", eventData);

export const updateEvent = (id, eventData) => API.put(`/campus/events/${encodeURIComponent(id)}`, eventData);

export const deleteEvent = (id) => API.delete(`/campus/events/${encodeURIComponent(id)}`);

// ==================== REGISTRATION API (admin) ====================

export const getAllRegistrations = () => API.get("/campus/registrations");

export const getRegistrationsByEvent = (eventId) =>
  API.get(`/campus/registrations/event/${encodeURIComponent(eventId)}`);

export const getRegistrationByTicket = (ticketId) =>
  API.get(`/campus/registrations/${encodeURIComponent(ticketId)}`);

export const createRegistration = (regData) => API.post("/campus/registrations", regData);

export const setCheckIn = (ticketId, checkInStatus) =>
  API.put(`/campus/registrations/${encodeURIComponent(ticketId)}`, { checkInStatus });

export const deleteRegistration = (ticketId) =>
  API.delete(`/campus/registrations/${encodeURIComponent(ticketId)}`);

export default API;
