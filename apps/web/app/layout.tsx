import type { Metadata } from "next";
import { cookies } from "next/headers";
import "./globals.css";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import pkg from "../../../package.json";
import { AppHeader } from "@/components/app-header";
import { ThemeProvider } from "@/components/theme-provider";

export const metadata: Metadata = {
  title: "PetBot Dashboard",
  description: "Stats Dashboard for PetBot.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const cookieStore = await cookies();
  const defaultOpen = cookieStore.get("sidebar:state")?.value === "true";

  return (
    <html suppressHydrationWarning>
      <body>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <SidebarProvider
            defaultOpen={defaultOpen}
            style={
              {
                "--sidebar-width": "calc(var(--spacing) * 72)",
                "--header-height": "calc(var(--spacing) * 12)",
              } as React.CSSProperties
            }
          >
            <AppSidebar variant="floating" version={pkg.version} />
            <SidebarInset>
              <AppHeader />
              <div className="flex justify-center p-4 pt-0">{children}</div>
            </SidebarInset>
          </SidebarProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
