import "../styles/globals.css";
import type { AppProps } from "next/app";
import { CssVarsProvider } from "@mui/joy/styles";
import { CssBaseline } from "@mui/joy";
import { useEffect } from "react";

export default function App({ Component, pageProps }: AppProps) {
  useEffect(() => {
    try {
      const stored =
        // Sidebar writes `petbot-color-scheme`; MUI stores under `joy-mode-scheme-dark`.
        localStorage.getItem("petbot-color-scheme") ??
        localStorage.getItem("joy-mode-scheme-dark");
      const mode = stored ?? "dark";
      if (mode === "dark") document.documentElement.classList.add("dark");
      else document.documentElement.classList.remove("dark");
    } catch (err) {
      // ignore
    }
  }, []);

  return (
    <CssVarsProvider
      defaultMode="dark"
      modeStorageKey="joy-mode-scheme-dark"
      disableNestedContext
    >
      <CssBaseline />
      <Component {...pageProps} />
    </CssVarsProvider>
  );
}
