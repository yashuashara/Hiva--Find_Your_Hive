import { Component } from "react";
import { HiOutlineExclamationCircle } from "react-icons/hi";

const CHUNK_ERROR = /Failed to fetch dynamically imported module|Importing a module script failed|error loading dynamically imported module|Loading chunk|Outdated Optimize Dep/i;
const RELOAD_KEY = "ee-chunk-reload";

// Catches errors while rendering a page so the app shows a helpful message
// (and keeps the sidebar) instead of going blank.
//
// A common case is a page's code file that can no longer be downloaded:
// after a new version is deployed, or when the development server restarted.
// For that case the page reloads itself once to fetch the current files.
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error) {
    console.error("[app] page crashed:", error);
    if (CHUNK_ERROR.test(String(error?.message))) {
      try {
        if (!sessionStorage.getItem(RELOAD_KEY)) {
          sessionStorage.setItem(RELOAD_KEY, "1");
          window.location.reload();
        }
      } catch {
        /* storage unavailable: show the message instead */
      }
    }
  }

  componentDidUpdate(prevProps) {
    // Navigating elsewhere clears the error so the next page can render.
    if (this.state.error && prevProps.resetKey !== this.props.resetKey) this.setState({ error: null });
  }

  render() {
    const { error } = this.state;
    if (!error) {
      try {
        sessionStorage.removeItem(RELOAD_KEY);
      } catch {
        /* ignore */
      }
      return this.props.children;
    }
    const chunk = CHUNK_ERROR.test(String(error?.message));
    return (
      <div className="page-container">
        <div className="empty-state empty-state--error" role="alert">
          <HiOutlineExclamationCircle className="empty-state-icon" aria-hidden="true" />
          <h3>{chunk ? "This page needs a refresh" : "Something went wrong on this page"}</h3>
          <p>
            {chunk
              ? "A newer version of the app is available, or the connection dropped while loading. Reloading will fix it."
              : "Your data is safe. Reload the page to try again. If it keeps happening, please report it."}
          </p>
          <button type="button" className="btn btn-primary btn-sm empty-state-action" onClick={() => window.location.reload()}>
            Reload page
          </button>
          <details className="error-details">
            <summary>Technical details</summary>
            <code>{String(error?.message || error)}</code>
          </details>
        </div>
      </div>
    );
  }
}
