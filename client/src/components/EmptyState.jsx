import { HiOutlineInbox } from "react-icons/hi";

const EmptyState = ({ message, subMessage }) => {
  return (
    <div className="empty-state">
      <HiOutlineInbox className="empty-state-icon" />
      <h3>{message || "No data found"}</h3>
      {subMessage && <p>{subMessage}</p>}
    </div>
  );
};

export default EmptyState;
