const StatCard = ({ icon, label, value, color }) => {
  return (
    <div className="stat-card">
      <div className={`stat-icon ${color || "blue"}`} aria-hidden="true">{icon}</div>
      <div className="stat-info">
        <div className="stat-value">{value}</div>
        <div className="stat-label">{label}</div>
      </div>
    </div>
  );
};

export default StatCard;
