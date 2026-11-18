import { useState } from "react";

// Small modal asking for a reason (used when rejecting or cancelling).
const ReasonDialog = ({ title, description, confirmLabel = "Confirm", danger = true, onConfirm, onClose }) => {
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (!reason.trim()) return;
    setBusy(true);
    try {
      await onConfirm(reason.trim());
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal-content modal-content--narrow"
        role="dialog"
        aria-modal="true"
        aria-labelledby="reason-title"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.key === "Escape" && onClose()}
      >
        <div className="modal-header">
          <h3 id="reason-title">{title}</h3>
          <button type="button" className="close-btn" aria-label="Close" onClick={onClose}>×</button>
        </div>
        <form className="modal-form" onSubmit={submit}>
          {description && <p className="modal-description">{description}</p>}
          <div className="form-group">
            <label htmlFor="reason-input">Reason (shown to the organizers)</label>
            <textarea id="reason-input" rows={3} maxLength={500} required autoFocus value={reason} onChange={(e) => setReason(e.target.value)} />
          </div>
          <div className="modal-actions">
            <button type="button" className="btn btn-ghost" onClick={onClose}>Back</button>
            <button type="submit" className={`btn ${danger ? "btn-danger" : "btn-primary"}`} disabled={busy || !reason.trim()}>
              {busy ? "Working..." : confirmLabel}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ReasonDialog;
