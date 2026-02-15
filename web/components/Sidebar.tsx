import * as React from "react";
import { useColorScheme } from "@mui/joy/styles";
import useMediaQuery from "@mui/material/useMediaQuery";
import MenuIcon from "@mui/icons-material/Menu";
import CloseIcon from "@mui/icons-material/Close";
import LightModeIcon from "@mui/icons-material/LightMode";
import DarkModeIcon from "@mui/icons-material/DarkMode";
import PublicIcon from "@mui/icons-material/Public";
import GroupsIcon from "@mui/icons-material/Groups";
import PersonIcon from "@mui/icons-material/Person";

interface SidebarProps {
  selected?: string;
  onSelect?: (value: string) => void;
}

export default function Sidebar({
  selected = "global",
  onSelect,
}: SidebarProps) {
  const { mode, setMode } = useColorScheme();
  const [open, setOpen] = React.useState(false);
  const isMobile = useMediaQuery("(max-width:900px)");

  React.useEffect(() => {
    try {
      const stored = localStorage.getItem("petbot-color-scheme");
      if (stored && stored !== mode) {
        setMode(stored as "light" | "dark");
      }
    } catch (err) {
      // ignore
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  React.useEffect(() => {
    // keep Tailwind `dark` class in sync with MUI Joy mode
    if (mode === "dark") document.documentElement.classList.add("dark");
    else document.documentElement.classList.remove("dark");
  }, [mode]);

  const isDark = mode === "dark";

  const toggleTheme = () => {
    const next = isDark ? "light" : "dark";
    setMode(next);
    try {
      localStorage.setItem("petbot-color-scheme", next);
    } catch (err) {
      // ignore
    }
    if (next === "dark") document.documentElement.classList.add("dark");
    else document.documentElement.classList.remove("dark");
  };

  const handleSelect = (value: string) => {
    onSelect?.(value);
    if (isMobile) setOpen(false);
  };

  return (
    <>
      {isMobile && !open && (
        <button
          onClick={() => setOpen(true)}
          aria-label="Open menu"
          className="fixed left-3 top-3 z-50 inline-flex items-center justify-center rounded-md bg-slate-800/80 p-2 text-white shadow-md"
        >
          <MenuIcon fontSize="small" />
        </button>
      )}

      {(open || !isMobile) && (
        <>
          {isMobile && open && (
            <div
              onClick={() => setOpen(false)}
              className="fixed inset-0 z-40 bg-black/30"
            />
          )}

          <aside
            className={`z-50 ${
              isMobile
                ? "fixed left-0 top-0 w-64 h-screen p-4"
                : "sticky top-0 w-56 min-h-screen p-6"
            } bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-700 flex flex-col gap-4`}
          >
            <div className="flex items-center justify-between">
              <div className="text-2xl font-semibold">PetBot</div>

              <div className="flex items-center gap-2">
                <button
                  onClick={toggleTheme}
                  aria-label={
                    isDark ? "Switch to light mode" : "Switch to dark mode"
                  }
                  className="rounded-md bg-slate-100/60 p-1 text-slate-700 dark:bg-slate-700 dark:text-slate-200"
                >
                  {isDark ? (
                    <LightModeIcon fontSize="small" />
                  ) : (
                    <DarkModeIcon fontSize="small" />
                  )}
                </button>

                {isMobile && (
                  <button
                    onClick={() => setOpen(false)}
                    aria-label="Close menu"
                    className="rounded-md p-1 text-slate-700 dark:text-slate-200"
                  >
                    <CloseIcon fontSize="small" />
                  </button>
                )}
              </div>
            </div>

            <hr className="border-slate-200 dark:border-slate-700" />

            <nav className="flex flex-col gap-2">
              <button
                onClick={() => handleSelect("global")}
                className={`flex items-center gap-3 rounded-md px-3 py-2 text-left text-sm ${
                  selected === "global"
                    ? "bg-slate-100 dark:bg-slate-800 font-medium"
                    : "text-slate-700 dark:text-slate-300"
                }`}
              >
                <PublicIcon fontSize="small" />
                <span>Global</span>
              </button>

              <button
                onClick={() => handleSelect("guild")}
                className={`flex items-center gap-3 rounded-md px-3 py-2 text-left text-sm ${
                  selected === "guild"
                    ? "bg-slate-100 dark:bg-slate-800 font-medium"
                    : "text-slate-700 dark:text-slate-300"
                }`}
              >
                <GroupsIcon fontSize="small" />
                <span>Guild</span>
              </button>

              <button
                onClick={() => handleSelect("user")}
                className={`flex items-center gap-3 rounded-md px-3 py-2 text-left text-sm ${
                  selected === "user"
                    ? "bg-slate-100 dark:bg-slate-800 font-medium"
                    : "text-slate-700 dark:text-slate-300"
                }`}
              >
                <PersonIcon fontSize="small" />
                <span>User</span>
              </button>
            </nav>

            <div className="mt-auto text-xs text-slate-500 dark:text-slate-400">
              v1 — Stats viewer
            </div>
          </aside>
        </>
      )}
    </>
  );
}
