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
  // Read user's theme preference from cookie (server-side) so SSR output matches client
  const headersList = await headers();
  const cookieHeader = headersList.get?.("cookie") ?? "";
  const themeCookie = cookieHeader
    .split("; ")
    .find((c: string) => c.startsWith("theme="))
    ?.split("=")[1];
  const htmlClass = themeCookie === "dark" ? "dark" : undefined;

  return (
    <html className={htmlClass}>
      <body>
        <SidebarProvider
          style={
            {
              "--sidebar-width": "calc(var(--spacing) * 72)",
              "--header-height": "calc(var(--spacing) * 12)",
            } as React.CSSProperties
          }
        >
          <AppSidebar variant="inset" />
          <SidebarInset>
            <AppHeader />
            {children}
          </SidebarInset>
        </SidebarProvider>
      </body>
    </html>
  );
}
