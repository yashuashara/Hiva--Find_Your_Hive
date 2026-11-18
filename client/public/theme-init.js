// Apply the saved colour theme before the page paints (no flash).
// Kept as a file (not inline) so the Content Security Policy can forbid inline scripts.
try {
  var t = localStorage.getItem("ee-theme");
  if (t === "light" || t === "dark") document.documentElement.setAttribute("data-theme", t);
} catch (e) {}
