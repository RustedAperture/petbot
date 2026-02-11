import * as React from "react";
import type { AppProps } from "next/app";
import { CssVarsProvider } from "@mui/joy/styles";

export default function App({ Component, pageProps }: AppProps) {
  return (
    <CssVarsProvider>
      <Component {...pageProps} />
    </CssVarsProvider>
  );
}
