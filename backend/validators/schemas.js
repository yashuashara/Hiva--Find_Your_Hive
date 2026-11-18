// Input schemas for every endpoint that accepts data. Only fields listed here
// are accepted; everything else is silently dropped before reaching the
// database, so clients can never set server-controlled fields.
const { z } = require("zod");
const { CATEGORIES } = require("../models/Event");
const { CLUB_CATEGORIES } = require("../models/Club");
const { CLUB_ROLES } = require("../models/ClubMembership");
const { ROLES } = require("../models/User");

const trimmed = (min, max) => z.string().trim().min(min).max(max);
const optionalText = (max) => z.string().trim().max(max).optional();

// Trim and lowercase BEFORE checking the format, so " A@B.com " is accepted.
const emailField = z.string().trim().toLowerCase().max(254).pipe(z.email("Enter a valid email address"));
const objectId = z.string().regex(/^[a-f0-9]{24}$/i, "Invalid id");
// Only http(s) links, never javascript: or data: URLs. "" clears the field.
const urlField = z
  .string()
  .trim()
  .max(500)
  .pipe(z.url({ protocol: /^https?$/, message: "Enter a full https:// link" }))
  .or(z.literal(""));
const dateField = z.coerce.date({ message: "Enter a valid date and time" });
const nullableDate = z.union([z.null(), dateField]);
const prnField = z
  .string()
  .trim()
  .toUpperCase()
  .regex(/^[A-Z0-9-]{3,30}$/, "PRN / student ID may contain only letters, numbers and dashes");

// ---------- Auth & profile ----------
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

const updateProfileSchema = z
  .object({
    name: trimmed(2, 100),
    profile: z
      .object({
        prn: prnField,
        department: trimmed(2, 100),
        year: z.coerce.number().int().min(1).max(6),
      })
      .partial(),
  })
  .partial();

// ---------- Pagination ----------
const pageFields = {
  page: z.coerce.number().int().min(1).max(1000).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(12),
};

// ---------- Events ----------
const eventIdParam = z.object({ id: trimmed(1, 40) });

const listEventsQuery = z.object({
  q: z.string().trim().max(100).optional(),
  category: z.enum(CATEGORIES).optional(),
  club: z.string().trim().max(120).optional(), // club slug
  when: z.enum(["upcoming", "past", "all"]).default("upcoming"),
  price: z.enum(["free", "paid"]).optional(),
  from: dateField.optional(),
  to: dateField.optional(),
  ...pageFields,
});

const manageEventsQuery = z.object({
  status: z.enum(["draft", "pending_approval", "approved", "published", "completed", "rejected", "cancelled"]).optional(),
  club: objectId.optional(),
  q: z.string().trim().max(100).optional(),
  ...pageFields,
  limit: z.coerce.number().int().min(1).max(100).default(25),
});

const coordinatorsField = z.array(z.object({ name: trimmed(1, 100), contact: trimmed(3, 150) })).max(10);

const createEventSchema = z.object({
  _id: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z0-9-]{3,20}$/, "Event ID may contain only letters, numbers and dashes (3-20 chars)")
    .optional()
    .or(z.literal("").transform(() => undefined)),
  clubId: objectId,
  title: trimmed(3, 150),
  description: optionalText(5000),
  category: z.enum(CATEGORIES),
  venue: trimmed(2, 150),
  startsAt: dateField,
  endsAt: dateField,
  registrationOpensAt: nullableDate.optional(),
  registrationClosesAt: nullableDate.optional(),
  bannerUrl: urlField.optional(),
  capacity: z.coerce.number().int().min(1).max(100000),
  entryFee: z.coerce.number().min(0).max(100000).default(0),
  tags: z.array(trimmed(1, 30)).max(20).default([]),
  coordinators: coordinatorsField.default([]),
  sponsors: z.array(trimmed(1, 100)).max(20).default([]),
});

// For updates every field is optional, and defaults must NOT kick in
// (otherwise an update that omits tags would wipe them).
const updateEventSchema = z
  .object({
    title: trimmed(3, 150),
    description: z.string().trim().max(5000),
    category: z.enum(CATEGORIES),
    venue: trimmed(2, 150),
    startsAt: dateField,
    endsAt: dateField,
    registrationOpensAt: nullableDate,
    registrationClosesAt: nullableDate,
    bannerUrl: urlField,
    capacity: z.coerce.number().int().min(1).max(100000),
    entryFee: z.coerce.number().min(0).max(100000),
    tags: z.array(trimmed(1, 30)).max(20),
    coordinators: coordinatorsField,
    sponsors: z.array(trimmed(1, 100)).max(20),
  })
  .partial()
  .refine((obj) => Object.keys(obj).length > 0, "Provide at least one field to update");

const transitionParam = z.object({
  id: trimmed(1, 40),
  action: z.enum(["submit", "withdraw", "approve", "reject", "publish", "cancel", "complete"]),
});
const transitionBody = z.object({ reason: z.string().trim().max(500).optional() });

// ---------- Registrations ----------
const ticketParam = z.object({ ticketId: trimmed(1, 60) });
const eventIdForRegsParam = z.object({ eventId: trimmed(1, 40) });

const listRegistrationsQuery = z.object({
  status: z.enum(["confirmed", "cancelled", "all"]).default("confirmed"),
});

// Walk-in registration entered by an organizer.
const createRegistrationSchema = z.object({
  eventId: trimmed(1, 40),
  studentId: prnField,
  studentName: trimmed(2, 100),
  department: trimmed(2, 100),
  year: z.coerce.number().int().min(1).max(6),
  // Only a preference for paid events. The server always records the payment
  // as Pending; it never trusts a client claim that something was paid.
  paymentMethod: z.enum(["UPI", "Card", "Cash"]).optional(),
});

const selfRegisterSchema = z.object({
  paymentMethod: z.enum(["UPI", "Card", "Cash"]).optional(),
});

const checkInSchema = z.object({
  checkInStatus: z.boolean(),
  // When scanning at a specific event's entrance, reject tickets for other events.
  eventId: trimmed(1, 40).optional(),
});

// Raw QR text from the scanner (or a typed ticket ID). Parsed server-side.
const scanSchema = z.object({ code: z.string().trim().min(1).max(200) });

const myRegistrationsQuery = z.object({
  when: z.enum(["upcoming", "past", "all"]).default("all"),
});

// ---------- Clubs ----------
const socialsField = z
  .object({ website: urlField, instagram: urlField, linkedin: urlField, x: urlField })
  .partial();

const clubIdParam = z.object({ id: objectId });
const clubSlugParam = z.object({ slug: z.string().trim().toLowerCase().max(120) });
const memberParam = z.object({ id: objectId, memberId: objectId });

const listClubsQuery = z.object({
  q: z.string().trim().max(100).optional(),
  category: z.enum(CLUB_CATEGORIES).optional(),
  status: z.enum(["pending", "approved", "rejected", "suspended"]).optional(), // admins only
  ...pageFields,
  limit: z.coerce.number().int().min(1).max(50).default(24),
});

const createClubSchema = z.object({
  name: trimmed(3, 100),
  description: optionalText(2000),
  category: z.enum(CLUB_CATEGORIES).default("Other"),
  contactEmail: emailField.optional().or(z.literal("")),
  logoUrl: urlField.optional(),
  socials: socialsField.optional(),
});

const updateClubSchema = z
  .object({
    name: trimmed(3, 100), // admins only (checked in the controller)
    description: z.string().trim().max(2000),
    category: z.enum(CLUB_CATEGORIES),
    contactEmail: emailField.or(z.literal("")),
    logoUrl: urlField,
    socials: socialsField,
  })
  .partial()
  .refine((obj) => Object.keys(obj).length > 0, "Provide at least one field to update");

const reviewParam = z.object({ id: objectId, action: z.enum(["approve", "reject", "suspend", "reinstate"]) });
const reasonBody = z.object({ reason: z.string().trim().max(500).optional() });

const addMemberSchema = z.object({
  email: emailField,
  role: z.enum(CLUB_ROLES),
});

// ---------- Platform admin ----------
const userIdParam = z.object({ id: objectId });
const listUsersQuery = z.object({
  q: z.string().trim().max(100).optional(),
  role: z.enum(ROLES).optional(),
  ...pageFields,
  limit: z.coerce.number().int().min(1).max(100).default(25),
});
const setRoleSchema = z.object({ role: z.enum(ROLES) });
const setStatusSchema = z.object({ status: z.enum(["active", "suspended"]) });

module.exports = {
  signupSchema,
  loginSchema,
  updateProfileSchema,
  eventIdParam,
  listEventsQuery,
  manageEventsQuery,
  createEventSchema,
  updateEventSchema,
  transitionParam,
  transitionBody,
  ticketParam,
  eventIdForRegsParam,
  listRegistrationsQuery,
  createRegistrationSchema,
  selfRegisterSchema,
  checkInSchema,
  scanSchema,
  myRegistrationsQuery,
  clubIdParam,
  clubSlugParam,
  memberParam,
  listClubsQuery,
  createClubSchema,
  updateClubSchema,
  reviewParam,
  reasonBody,
  addMemberSchema,
  userIdParam,
  listUsersQuery,
  setRoleSchema,
  setStatusSchema,
};
