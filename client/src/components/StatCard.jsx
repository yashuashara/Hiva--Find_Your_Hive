const StatCard = ({ icon, label, value, color }) => {
  return (
    <div className={`stat-card stat-card--${color || "blue"}`}>
      <div className="stat-card-icon">{icon}</div>
      <div className="stat-card-info">
        <span className="stat-card-value">{value}</span>
        <span className="stat-card-label">{label}</span>
      </div>
    </div>
  );
};

export default StatCard;
