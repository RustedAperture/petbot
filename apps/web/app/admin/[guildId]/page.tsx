"use client";

import { useParams } from "next/navigation";
import AdminGuildPageContent from "./AdminGuildPageContent";

export default function AdminGuildPage() {
  const params = useParams();
  const rawGuildId = params?.guildId;
  const guildId =
    typeof rawGuildId === "string"
      ? rawGuildId
      : Array.isArray(rawGuildId)
        ? rawGuildId[0] ?? ""
        : "";

  return <AdminGuildPageContent key={guildId || "no-guild"} guildId={guildId} />;
}
