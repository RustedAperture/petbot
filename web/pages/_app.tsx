import type { AppProps } from "next/app";
import { CssVarsProvider } from "@mui/joy/styles";
import { CssBaseline } from "@mui/joy";

export default function App({ Component, pageProps }: AppProps) {
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
