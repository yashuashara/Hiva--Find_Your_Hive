import { STATUS_LABELS } from "../utils/format";

const TONE = {
  draft: "badge--event",
  pending_approval: "badge--warning",
  pending: "badge--warning",
  approved: "badge--id",
  published: "badge--success",
  confirmed: "badge--success",
  active: "badge--success",
  completed: "badge--seminar",
  rejected: "badge--danger",
  cancelled: "badge--danger",
  suspended: "badge--danger",
};

const StatusBadge = ({ status }) => (
  <span className={`badge ${TONE[status] || "badge--event"}`}>{STATUS_LABELS[status] || status}</span>
);

export default StatusBadge;
