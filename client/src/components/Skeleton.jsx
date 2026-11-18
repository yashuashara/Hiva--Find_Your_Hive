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

// Generic page placeholder used while a route's code or session is loading
// (the equivalent of a framework "loading" route): header + content blocks
// in the same positions as real pages, so nothing jumps when they arrive.
export const PageSkeleton = ({ variant = "cards" }) => (
  <div className="page-container" aria-busy="true" aria-label="Loading page">
    <div className="page-header" aria-hidden="true">
      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 10 }}>
        <div className="skeleton" style={{ width: "34%", height: "2rem" }} />
        <div className="skeleton skeleton-line" style={{ width: "48%" }} />
      </div>
    </div>
    {variant === "table" ? <SkeletonTable /> : variant === "detail" ? <SkeletonDetail inner /> : <SkeletonCards />}
  </div>
);

export const SkeletonTable = ({ rows = 6 }) => (
  <div className="table-wrapper skeleton-table" aria-busy="true" aria-label="Loading">
    {Array.from({ length: rows }, (_, i) => (
      <div key={i} className="skeleton-row" aria-hidden="true">
        <div className="skeleton skeleton-line" style={{ width: "28%" }} />
        <div className="skeleton skeleton-line" style={{ width: "18%" }} />
        <div className="skeleton skeleton-line" style={{ width: "14%" }} />
        <div className="skeleton skeleton-line" style={{ width: "10%" }} />
      </div>
    ))}
  </div>
);

// Event / club page placeholder: title block + two-column body.
export const SkeletonDetail = ({ inner = false }) => {
  const body = (
    <div aria-hidden="true">
      {!inner && (
        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: "1.5rem" }}>
          <div className="skeleton skeleton-line" style={{ width: 90 }} />
          <div className="skeleton" style={{ width: "45%", height: "2.1rem" }} />
          <div className="skeleton skeleton-line" style={{ width: "30%" }} />
        </div>
      )}
      <div className="event-detail-grid">
        <div className="detail-card" style={{ display: "flex", flexDirection: "column", gap: 12, minHeight: 260 }}>
          <div className="skeleton skeleton-line" style={{ width: "35%", height: "1.1rem" }} />
          <div className="skeleton skeleton-line" style={{ width: "95%" }} />
          <div className="skeleton skeleton-line" style={{ width: "88%" }} />
          <div className="skeleton skeleton-line" style={{ width: "60%" }} />
        </div>
        <div className="detail-card" style={{ minHeight: 160, display: "flex", flexDirection: "column", gap: 12 }}>
          <div className="skeleton skeleton-line" style={{ width: "50%", height: "1.1rem" }} />
          <div className="skeleton" style={{ width: "100%", height: 40 }} />
        </div>
      </div>
    </div>
  );
  return inner ? body : <div className="page-container" aria-busy="true" aria-label="Loading">{body}</div>;
};

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
