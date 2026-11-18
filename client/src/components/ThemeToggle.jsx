import { useEffect, useState } from "react";
import { HiOutlineSun, HiOutlineMoon, HiOutlineDesktopComputer } from "react-icons/hi";

const KEY = "ee-theme";
const OPTIONS = [
  ["system", "Use system theme", HiOutlineDesktopComputer],
  ["light", "Light theme", HiOutlineSun],
  ["dark", "Dark theme", HiOutlineMoon],
];

const readSaved = () => {
  try {
    return localStorage.getItem(KEY) || "system";
  } catch {
    return "system";
  }
};

// System / light / dark. "System" follows the OS setting; the choice is
// remembered on this device. index.html applies it before first paint.
const ThemeToggle = () => {
  const [theme, setTheme] = useState(readSaved);

  useEffect(() => {
    const root = document.documentElement;
    if (theme === "system") root.removeAttribute("data-theme");
    else root.setAttribute("data-theme", theme);
    try {
      localStorage.setItem(KEY, theme);
    } catch {
      /* storage unavailable: theme still applies for this visit */
    }
  }, [theme]);

  return (
    <div className="theme-switch" role="group" aria-label="Colour theme">
      {OPTIONS.map(([value, label, Icon]) => (
        <button key={value} type="button" aria-pressed={theme === value} aria-label={label} title={label} onClick={() => setTheme(value)}>
          <Icon aria-hidden="true" />
        </button>
      ))}
    </div>
  );
};

export default ThemeToggle;
