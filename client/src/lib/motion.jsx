// Shared animation building blocks (framer-motion).
//
// Only the features in use are loaded (LazyMotion + domMax, which includes
// layout animations), and everything respects the OS "reduce motion"
// setting. Use the `m.*` components, not `motion.*`, inside the app.
import { AnimatePresence, LazyMotion, MotionConfig, m } from "framer-motion";

export { AnimatePresence, m };

export const EASE = [0.4, 0, 0.2, 1];
export const fast = { duration: 0.18, ease: EASE };
export const spring = { type: "spring", stiffness: 500, damping: 40, mass: 0.8 };

// The animation engine (incl. layout animations) loads as its own chunk after
// the first paint; until then components simply render without animating.
// If that chunk can't be downloaded, the app keeps working without animations.
const loadFeatures = () =>
  import("./motionFeatures")
    .then((mod) => mod.default)
    .catch((err) => {
      console.warn("[motion] animations unavailable:", err?.message);
      return {};
    });

export function MotionProvider({ children }) {
  return (
    <LazyMotion features={loadFeatures} strict>
      <MotionConfig reducedMotion="user">{children}</MotionConfig>
    </LazyMotion>
  );
}

// Items fade/scale in and out; `layout` lets the rest of the list slide into
// place instead of jumping when items are added, removed or reordered.
export const itemMotion = {
  layout: "position",
  initial: { opacity: 0, scale: 0.98 },
  animate: { opacity: 1, scale: 1 },
  exit: { opacity: 0, scale: 0.98 },
  transition: fast,
};

// An animated list/grid. Keys must be stable (database ids), never indexes.
//   <AnimatedList className="cards-grid" items={events} getKey={(e) => e._id}
//                 render={(e) => <EventCard event={e} />} />
export function AnimatedList({ items, getKey, render, className, itemClassName = "motion-item", as = "div" }) {
  const List = as === "ul" ? m.ul : m.div;
  const Item = as === "ul" ? m.li : m.div;
  return (
    <List layout className={className}>
      <AnimatePresence mode="popLayout" initial={false}>
        {items.map((item, i) => (
          <Item key={getKey(item)} className={itemClassName} {...itemMotion}>
            {render(item, i)}
          </Item>
        ))}
      </AnimatePresence>
    </List>
  );
}

// Table rows that fade in/out when filters change.
export const rowMotion = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
  transition: { duration: 0.15 },
};
