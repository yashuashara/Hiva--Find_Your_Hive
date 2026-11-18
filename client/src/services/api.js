import axios from "axios";

const API = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:5000/api/campus",
});

// ==================== EVENT API ====================

export const getAllEvents = () => API.get("/events");

export const getEventById = (id) => API.get(`/events/${id}`);

export const createEvent = (eventData) => API.post("/events", eventData);

export const updateEvent = (id, eventData) => API.put(`/events/${id}`, eventData);

export const deleteEvent = (id) => API.delete(`/events/${id}`);

// ==================== REGISTRATION API ====================

export const getAllRegistrations = () => API.get("/registrations");

export const getRegistrationsByEvent = (eventId) => API.get(`/registrations/event/${eventId}`);

export const getRegistrationByTicket = (ticketId) => API.get(`/registrations/${ticketId}`);

export const createRegistration = (regData) => API.post("/registrations", regData);

export const updateRegistration = (ticketId, regData) => API.put(`/registrations/${ticketId}`, regData);

export const deleteRegistration = (ticketId) => API.delete(`/registrations/${ticketId}`);

export default API;
