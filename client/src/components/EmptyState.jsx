import { HiOutlineInbox, HiOutlineExclamationCircle } from "react-icons/hi";

// Use `title` + `message`. Pass `error` for failed requests so users can tell
// "nothing here" apart from "something went wrong", plus an optional retry.
const EmptyState = ({ title, message, error = false, onRetry }) => {
  const Icon = error ? HiOutlineExclamationCircle : HiOutlineInbox;
  return (
    <div className={`empty-state ${error ? "empty-state--error" : ""}`} role={error ? "alert" : undefined}>
      <Icon className="empty-state-icon" aria-hidden="true" />
      <h3>{title || (error ? "Something went wrong" : "No data found")}</h3>
      {message && <p>{message}</p>}
      {onRetry && (
        <button type="button" className="btn btn-secondary btn-sm empty-state-action" onClick={onRetry}>
          Try again
        </button>
      )}
    </div>
  );
};

export default EmptyState;
