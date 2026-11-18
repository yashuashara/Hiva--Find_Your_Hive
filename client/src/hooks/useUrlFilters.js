import { useCallback, useMemo } from "react";
import { useSearchParams } from "react-router-dom";

// Filters stored in the URL (?q=...&category=...), so they survive reloads,
// can be shared as links, and work with the browser's back button.
// Updates REPLACE the history entry and never reset the scroll position,
// so changing a filter doesn't jump the page.
//
// `defaults` must be a stable object (define it outside the component).
// Changing any filter except `page` resets `page` to the first page.
export default function useUrlFilters(defaults) {
  const [params, setParams] = useSearchParams();

  const values = useMemo(
    () => Object.fromEntries(Object.entries(defaults).map(([k, d]) => [k, params.get(k) ?? d])),
    [params, defaults]
  );

  const update = useCallback(
    (changes) => {
      setParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          for (const [k, v] of Object.entries(changes)) {
            if (v === undefined || v === null || v === "" || String(v) === String(defaults[k])) next.delete(k);
            else next.set(k, String(v));
          }
          if (!("page" in changes)) next.delete("page");
          return next;
        },
        { replace: true, preventScrollReset: true }
      );
    },
    [setParams, defaults]
  );

  return [values, update];
}
