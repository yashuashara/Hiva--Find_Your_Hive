// Input schemas for every write endpoint. Only fields listed here are
// accepted; everything else is silently dropped before reaching the database.
const { z } = require("zod");

const trimmed = (min, max) => z.string().trim().min(min).max(max);

// Trim and lowercase BEFORE checking the format, so " A@B.com " is accepted.
const emailField = z.string().trim().toLowerCase().max(254).pipe(z.email("Enter a valid email address"));

// ---------- Auth ----------
const signupSchema = z.object({
  name: trimmed(2, 100),
  email: emailField,
  password: z
    .string()
    .min(10, "Password must be at least 10 characters")
    .max(128, "Password must be at most 128 characters"),
});

const loginSchema = z.object({
  email: emailField,
  password: z.string().min(1).max(128),
});

// ---------- Events ----------
const CATEGORIES = ["Technical", "Cultural", "Sports", "Workshop", "Seminar"];

const eventIdParam = z.object({ id: trimmed(1, 40) });

const eventFields = {
  title: trimmed(3, 150),
  category: z.enum(CATEGORIES),
  organizerClub: trimmed(2, 100),
  venue: trimmed(2, 150),
  capacity: z.coerce.number().int().min(1).max(100000),
  entryFee: z.coerce.number().min(0).max(100000).default(0),
  tags: z.array(trimmed(1, 30)).max(20).default([]),
  coordinators: z
    .array(z.object({ name: trimmed(1, 100), contact: trimmed(3, 150) }))
    .max(10)
    .default([]),
  sponsors: z.array(trimmed(1, 100)).max(20).default([]),
};

const createEventSchema = z.object({
  _id: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z0-9-]{3,20}$/, "Event ID may contain only letters, numbers and dashes (3-20 chars)")
    .optional()
    .or(z.literal("").transform(() => undefined)),
  ...eventFields,
});

// For updates every field is optional, and defaults must NOT kick in
// (otherwise an update that omits tags would wipe them).
const updateEventSchema = z
  .object({
    title: eventFields.title,
    category: eventFields.category,
    organizerClub: eventFields.organizerClub,
    venue: eventFields.venue,
    capacity: eventFields.capacity,
    entryFee: z.coerce.number().min(0).max(100000),
    tags: z.array(trimmed(1, 30)).max(20),
    coordinators: z.array(z.object({ name: trimmed(1, 100), contact: trimmed(3, 150) })).max(10),
    sponsors: z.array(trimmed(1, 100)).max(20),
  })
  .partial()
  .refine((obj) => Object.keys(obj).length > 0, "Provide at least one field to update");

// ---------- Registrations ----------
const ticketParam = z.object({ ticketId: trimmed(1, 60) });
const eventIdForRegsParam = z.object({ eventId: trimmed(1, 40) });

const createRegistrationSchema = z.object({
  eventId: trimmed(1, 40),
  studentId: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z0-9-]{3,30}$/, "Student ID may contain only letters, numbers and dashes"),
  studentName: trimmed(2, 100),
  department: trimmed(2, 100),
  year: z.coerce.number().int().min(1).max(4),
  // Only a preference for paid events. The server always records the payment
  // as Pending; it never trusts a client claim that something was paid.
  paymentMethod: z.enum(["UPI", "Card", "Cash"]).optional(),
});

const checkInSchema = z.object({ checkInStatus: z.boolean() });

module.exports = {
  signupSchema,
  loginSchema,
  CATEGORIES,
  eventIdParam,
  createEventSchema,
  updateEventSchema,
  ticketParam,
  eventIdForRegsParam,
  createRegistrationSchema,
  checkInSchema,
};
