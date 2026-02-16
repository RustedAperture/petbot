import type { Metadata } from "next";
import { headers } from "next/headers";
import "./globals.css";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { AppHeader } from "@/components/app-header";

export const metadata: Metadata = {
  title: "PetBot Dashboard",
  description: "Stats Dashboard for PetBot.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Read user's theme preference and sidebar state from cookie (server-side) so SSR output matches client
  const headersList = await headers();
  const cookieHeader = headersList.get?.("cookie") ?? "";
  const themeCookie = cookieHeader
    .split("; ")
    .find((c: string) => c.startsWith("theme="))
    ?.split("=")[1];
  // Default to dark mode when no explicit preference is present.
  // Respect `theme=light` if the user explicitly chose light.
  const htmlClass = themeCookie === "light" ? undefined : "dark";

  // Read persisted sidebar state (server-side) to avoid "flash" on mount.
  const sidebarCookie = cookieHeader
    .split("; ")
    .find((c: string) => c.startsWith("sidebar_state="))
    ?.split("=")[1];
  const sidebarDefaultOpen =
    sidebarCookie === undefined ? true : sidebarCookie === "true";

  return (
    <html className={htmlClass}>
      <body>
        <SidebarProvider
          defaultOpen={sidebarDefaultOpen}
          style={
            {
              "--sidebar-width": "calc(var(--spacing) * 72)",
              "--header-height": "calc(var(--spacing) * 12)",
            } as React.CSSProperties
          }
        >
          <AppSidebar variant="floating" />
          <SidebarInset>
            <AppHeader />
            <div className="flex justify-center p-4 pt-0">{children}</div>
          </SidebarInset>
        </SidebarProvider>
      </body>
    </html>
  );
}
