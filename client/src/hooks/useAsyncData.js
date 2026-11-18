import { useCallback, useEffect, useRef, useState } from "react";
import { errorMessage } from "../services/api";

// Loads data for a page and keeps the PREVIOUS result on screen while new
// data loads, so changing a filter never blanks the page.
//
//   const { data, error, initialLoading, refreshing, reload } =
//     useAsyncData(() => api.call(params), JSON.stringify(params));
//
// - initialLoading: nothing to show yet (render a skeleton)
// - refreshing:     old data is visible while new data loads (dim it)
// - Responses that arrive out of order (fast typing) are ignored, so an
//   older, slower request can never overwrite newer results.
export default function useAsyncData(fetcher, key) {
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;
  const latest = useRef(0);
  const [state, setState] = useState({ data: undefined, error: "", loading: true });

  const load = useCallback(async () => {
    const id = ++latest.current;
    setState((s) => ({ ...s, loading: true }));
    try {
      const data = await fetcherRef.current();
      if (id === latest.current) setState({ data, error: "", loading: false });
    } catch (err) {
      if (id === latest.current) setState((s) => ({ ...s, error: errorMessage(err), loading: false }));
    }
  }, []);

  useEffect(() => {
    load();
  }, [key, load]);

  // Local updates (e.g. after a check-in) without refetching.
  const setData = useCallback(
    (updater) => setState((s) => ({ ...s, data: typeof updater === "function" ? updater(s.data) : updater })),
    []
  );

  return {
    data: state.data,
    error: state.error,
    loading: state.loading,
    initialLoading: state.loading && state.data === undefined,
    refreshing: state.loading && state.data !== undefined,
    reload: load,
    setData,
  };
}
