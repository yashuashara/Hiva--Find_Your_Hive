import { useRef } from "react";
import { m, spring } from "../lib/motion";

// Segmented tabs whose highlight slides to the active tab.
//   <Tabs id="events-when" label="Event timeframe" value={when}
//         options={[["upcoming", "Upcoming"], ["past", "Past"]]} onChange={setWhen} />
// Arrow keys move between tabs (standard tablist keyboard behaviour).
const Tabs = ({ id, label, value, options, onChange }) => {
  const refs = useRef([]);

  const onKeyDown = (e, index) => {
    const dir = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
    if (!dir) return;
    e.preventDefault();
    const next = (index + dir + options.length) % options.length;
    refs.current[next]?.focus();
    onChange(options[next][0]);
  };

  return (
    <div className="tabs" role="tablist" aria-label={label}>
      {options.map(([v, text], i) => {
        const active = v === value;
        return (
          <button
            key={v}
            ref={(el) => (refs.current[i] = el)}
            type="button"
            role="tab"
            aria-selected={active}
            tabIndex={active ? 0 : -1}
            className={`tab ${active ? "active" : ""}`}
            onClick={() => onChange(v)}
            onKeyDown={(e) => onKeyDown(e, i)}
          >
            {active && <m.span layoutId={`tab-indicator-${id}`} className="tab-indicator" transition={spring} />}
            <span className="tab-label">{text}</span>
          </button>
        );
      })}
    </div>
  );
};

export default Tabs;
