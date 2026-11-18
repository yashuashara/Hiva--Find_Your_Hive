// Placeholder shapes shown while content loads, so the layout doesn't jump.
export const SkeletonCards = ({ count = 6 }) => (
  <div className="cards-grid" aria-busy="true" aria-label="Loading">
    {Array.from({ length: count }, (_, i) => (
      <div key={i} className="event-card skeleton-card" aria-hidden="true">
        <div className="skeleton skeleton-banner" />
        <div className="skeleton-body">
          <div className="skeleton skeleton-line" style={{ width: "40%" }} />
          <div className="skeleton skeleton-line" style={{ width: "85%", height: "1.1rem" }} />
          <div className="skeleton skeleton-line" style={{ width: "60%" }} />
          <div className="skeleton skeleton-line" style={{ width: "70%" }} />
        </div>
      </div>
    ))}
  </div>
);

export const SkeletonStats = ({ count = 4 }) => (
  <div className="stats-grid" aria-busy="true" aria-label="Loading">
    {Array.from({ length: count }, (_, i) => (
      <div key={i} className="stat-card" aria-hidden="true">
        <div className="skeleton" style={{ width: 44, height: 44, borderRadius: 11 }} />
        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 8 }}>
          <div className="skeleton skeleton-line" style={{ width: "50%", height: "1.3rem" }} />
          <div className="skeleton skeleton-line" style={{ width: "70%" }} />
        </div>
      </div>
    ))}
  </div>
);
