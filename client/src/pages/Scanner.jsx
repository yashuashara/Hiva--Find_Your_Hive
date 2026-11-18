import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import QrScanner from "qr-scanner";
import { getEventById, getAttendance, scanTicket, errorMessage } from "../services/api";
import Loader from "../components/Loader";
import EmptyState from "../components/EmptyState";
import { formatTime } from "../utils/format";
import { HiArrowLeft, HiCheckCircle, HiExclamationCircle, HiXCircle } from "react-icons/hi";

const RESULT_RESET_MS = 2500; // how long a result stays on screen
const SAME_CODE_COOLDOWN_MS = 4000; // ignore the same QR held in front of the camera

// Short audio cue so volunteers don't have to look at the screen.
function beep(ok) {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.frequency.value = ok ? 880 : 220;
    gain.gain.value = 0.08;
    osc.connect(gain).connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + (ok ? 0.12 : 0.35));
    osc.onended = () => ctx.close();
  } catch {
    /* audio not available */
  }
}

const Scanner = () => {
  const { id } = useParams();
  const videoRef = useRef(null);
  const scannerRef = useRef(null);
  const busyRef = useRef(false);
  const lastCodeRef = useRef({ code: "", at: 0 });
  const resetTimer = useRef(null);

  const [event, setEvent] = useState(null);
  const [loadError, setLoadError] = useState("");
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [recent, setRecent] = useState([]);
  const [result, setResult] = useState(null); // { tone: ok|warn|error, title, detail }
  const [cameraError, setCameraError] = useState("");
  const [cameraOn, setCameraOn] = useState(false);
  const [manual, setManual] = useState("");

  // ---- Load event + verify the user may scan here ----
  useEffect(() => {
    (async () => {
      try {
        const res = await getEventById(id);
        if (!res.data.viewer.canCheckIn) throw new Error("You are not on this event's check-in team.");
        setEvent(res.data.data);
      } catch (err) {
        setLoadError(err.response ? errorMessage(err) : err.message);
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  // ---- Live attendance (other doors' scans show up too) ----
  const refreshAttendance = useCallback(async () => {
    try {
      const res = await getAttendance(id);
      setStats(res.data.data);
      setRecent(res.data.data.recent);
    } catch {
      /* keep last known numbers */
    }
  }, [id]);

  useEffect(() => {
    if (!event) return undefined;
    refreshAttendance();
    const t = setInterval(() => document.visibilityState === "visible" && refreshAttendance(), 10000);
    return () => clearInterval(t);
  }, [event, refreshAttendance]);

  // ---- Verify a code with the server ----
  const handleCode = useCallback(
    async (code) => {
      const now = Date.now();
      if (busyRef.current) return;
      if (code === lastCodeRef.current.code && now - lastCodeRef.current.at < SAME_CODE_COOLDOWN_MS) return;
      lastCodeRef.current = { code, at: now };
      busyRef.current = true;
      clearTimeout(resetTimer.current);

      let next;
      try {
        const res = await scanTicket(id, code);
        const { attendee, stats: s } = res.data.data;
        next = { tone: "ok", title: `Welcome, ${attendee.name}`, detail: `${attendee.department} · Year ${attendee.year} · ${attendee.studentId}` };
        setStats((prev) => ({ ...prev, ...s }));
        setRecent((prev) => [{ name: attendee.name, checkedInAt: res.data.data.checkedInAt }, ...prev].slice(0, 10));
      } catch (err) {
        const d = err.response?.data?.details || {};
        const who = d.attendee ? `${d.attendee.name} · ` : "";
        if (d.code === "ALREADY_CHECKED_IN") {
          next = { tone: "warn", title: "Already checked in", detail: `${who}entered at ${formatTime(d.checkedInAt)}` };
        } else {
          next = { tone: "error", title: errorMessage(err, "Could not verify ticket"), detail: who ? who.replace(/ · $/, "") : "Do not admit. Ask the attendee to check My Tickets." };
        }
      }
      setResult(next);
      beep(next.tone === "ok");
      if (navigator.vibrate) navigator.vibrate(next.tone === "ok" ? 80 : [80, 60, 80]);
      busyRef.current = false;
      resetTimer.current = setTimeout(() => setResult(null), RESULT_RESET_MS);
    },
    [id]
  );

  // ---- Camera ----
  const startCamera = useCallback(async () => {
    setCameraError("");
    if (!window.isSecureContext) {
      setCameraError("The camera only works on a secure (https://) connection. Use manual entry below, or open the site over HTTPS.");
      return;
    }
    try {
      if (!scannerRef.current) {
        scannerRef.current = new QrScanner(videoRef.current, (r) => handleCode(r.data), {
          returnDetailedScanResult: true,
          preferredCamera: "environment",
          highlightScanRegion: true,
          highlightCodeOutline: true,
          maxScansPerSecond: 5,
        });
      }
      await scannerRef.current.start();
      setCameraOn(true);
    } catch (err) {
      const msg = String(err?.name || err);
      setCameraError(
        msg.includes("NotAllowed")
          ? "Camera permission was denied. Allow camera access in your browser settings, then try again."
          : msg.toLowerCase().includes("not found")
            ? "No camera was found on this device. Use manual entry below."
            : "Couldn't start the camera. Use manual entry below."
      );
    }
  }, [handleCode]);

  const stopCamera = () => {
    scannerRef.current?.stop();
    setCameraOn(false);
  };

  useEffect(() => {
    if (event) startCamera();
    return () => {
      clearTimeout(resetTimer.current);
      scannerRef.current?.destroy();
      scannerRef.current = null;
    };
  }, [event, startCamera]);

  const submitManual = (e) => {
    e.preventDefault();
    const code = manual.trim();
    if (!code) return;
    lastCodeRef.current = { code: "", at: 0 }; // manual entry always retries
    handleCode(code);
    setManual("");
  };

  if (loading) return <Loader />;
  if (loadError) {
    return (
      <div className="page-container">
        <Link to="/manage/events" className="back-link"><HiArrowLeft aria-hidden="true" /> Back</Link>
        <EmptyState error title="Can't open the scanner" message={loadError} />
      </div>
    );
  }

  const Icon = result?.tone === "ok" ? HiCheckCircle : result?.tone === "warn" ? HiExclamationCircle : HiXCircle;

  return (
    <div className="page-container scanner-page">
      <Link to={`/events/${encodeURIComponent(id)}`} className="back-link"><HiArrowLeft aria-hidden="true" /> {event.title}</Link>

      <div className="scanner-header">
        <h1>Check-in</h1>
        {stats && (
          <div className="scanner-count" aria-live="polite">
            <strong>{stats.checkedIn}</strong> / {stats.registered} checked in
          </div>
        )}
      </div>

      {event.status !== "published" && (
        <div className="notice notice--danger">This event is {event.status}. Scans will be rejected.</div>
      )}

      <div className="scanner-viewport">
        <video ref={videoRef} className="scanner-video" muted playsInline aria-label="Camera view" />
        {!cameraOn && <div className="scanner-off">{cameraError || "Starting camera…"}</div>}
        {result && (
          <div className={`scan-result scan-result--${result.tone}`} role="status" aria-live="assertive">
            <Icon className="scan-result-icon" aria-hidden="true" />
            <div className="scan-result-title">{result.title}</div>
            <div className="scan-result-detail">{result.detail}</div>
          </div>
        )}
      </div>

      <div className="scanner-controls">
        {cameraOn ? (
          <button type="button" className="btn btn-ghost btn-sm" onClick={stopCamera}>Stop camera</button>
        ) : (
          <button type="button" className="btn btn-secondary btn-sm" onClick={startCamera}>Start camera</button>
        )}
      </div>

      <form className="manual-entry" onSubmit={submitManual}>
        <label htmlFor="manual-code" className="sr-only">Ticket ID</label>
        <input
          id="manual-code"
          placeholder="Or type a ticket ID (TKT-…)"
          autoComplete="off"
          autoCapitalize="off"
          spellCheck={false}
          value={manual}
          onChange={(e) => setManual(e.target.value)}
        />
        <button type="submit" className="btn btn-primary btn-sm">Check in</button>
      </form>

      {recent.length > 0 && (
        <section className="detail-card">
          <h3>Recent check-ins</h3>
          <ul className="member-list">
            {recent.map((r, i) => (
              <li key={`${r.name}-${r.checkedInAt}-${i}`} className="member-row">
                <span>{r.name}</span>
                <span className="muted">{formatTime(r.checkedInAt)}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
};

export default Scanner;
