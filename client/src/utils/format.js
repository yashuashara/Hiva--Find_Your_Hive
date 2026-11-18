// Date/time helpers. Times are shown in the viewer's local time zone.
const dateFmt = new Intl.DateTimeFormat("en-IN", { weekday: "short", day: "numeric", month: "short", year: "numeric" });
const timeFmt = new Intl.DateTimeFormat("en-IN", { hour: "numeric", minute: "2-digit" });

export const formatDate = (value) => (value ? dateFmt.format(new Date(value)) : "Date to be announced");
export const formatTime = (value) => (value ? timeFmt.format(new Date(value)) : "");

export function formatDateRange(startsAt, endsAt) {
  if (!startsAt) return "Date to be announced";
  const start = new Date(startsAt);
  if (!endsAt) return `${dateFmt.format(start)}, ${timeFmt.format(start)}`;
  const end = new Date(endsAt);
  if (start.toDateString() === end.toDateString()) {
    return `${dateFmt.format(start)}, ${timeFmt.format(start)} – ${timeFmt.format(end)}`;
  }
  return `${dateFmt.format(start)}, ${timeFmt.format(start)} – ${dateFmt.format(end)}, ${timeFmt.format(end)}`;
}

// <input type="datetime-local"> works with "YYYY-MM-DDTHH:mm" in local time.
export function toLocalInput(value) {
  if (!value) return "";
  const d = new Date(value);
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export const fromLocalInput = (value) => (value ? new Date(value).toISOString() : null);

export const STATUS_LABELS = {
  draft: "Draft",
  pending_approval: "Awaiting approval",
  approved: "Approved",
  published: "Published",
  completed: "Completed",
  rejected: "Rejected",
  cancelled: "Cancelled",
  pending: "Pending",
  suspended: "Suspended",
  confirmed: "Confirmed",
  active: "Active",
};

// A club's category as shown to people: the custom label when it's "Other".
export const clubCategoryLabel = (club) =>
  club?.category === "Other" && club?.customCategory ? club.customCategory : club?.category;

export const pct =(part, whole) => (whole ? Math.round((part / whole) * 100) : 0);
