<!-- Context: project-intelligence/technical | Priority: critical | Version: 1.0 | Updated: 2026-04-07 -->

# Technical Domain

**Purpose**: Tech stack, architecture, development patterns for PetBot.
**Last Updated**: 2026-04-07

## Quick Reference

**Update Triggers**: Tech stack changes | New patterns | Architecture decisions
**Audience**: Developers, AI agents

## Primary Stack

| Layer         | Technology           | Version | Rationale                |
| ------------- | -------------------- | ------- | ------------------------ |
| Bot Framework | discord.js           | v14     | Discord bot interactions |
| Backend API   | Express.js           | v5      | HTTP routes, middleware  |
| Frontend      | Next.js              | 16      | Web dashboard, SSR       |
| UI Components | shadcn/ui + Tailwind | —       | Consistent design system |
| Database      | SQLite (Turso)       | —       | Embedded, Drizzle ORM    |
| Testing       | Vite                 | —       | Fast test runner         |
| Language      | TypeScript           | strict  | Type safety              |

## Code Patterns

### API Handler (Express)

```typescript
export default async function statsHandler(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    const validated = schema.parse(req.body);
    const result = await drizzleDb.select().from(table).where(eq(col, id));
    res.json({ success: true, data: result });
  } catch (err) {
    logger.error({ err }, "/api/route error");
    res.status(500).json({ error: "server_error" });
  }
}
```

### Component (Next.js Client)

```tsx
"use client";
import { memo } from "react";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";

interface StatsCardProps {
  title: string;
  value: number;
}
export const StatsCard = memo(function StatsCard({
  title,
  value,
}: StatsCardProps) {
  return (
    <Card className="rounded-lg border p-4">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <p className="text-2xl font-bold">{value}</p>
    </Card>
  );
});
```

## Naming Conventions

| Type       | Convention | Example            |
| ---------- | ---------- | ------------------ |
| Files      | kebab-case | `user-profile.tsx` |
| Components | PascalCase | `UserProfile`      |
| Functions  | camelCase  | `getUserProfile`   |
| Database   | snake_case | `user_profiles`    |

## Code Standards

- Avoid `any` type in TypeScript
- Validate w/ Zod
- Use Drizzle for DB queries

## Security Requirements

- Validate user input
- Sanitize before rendering

## 📂 Codebase References

**API Handlers**: `src/http/routes/` — Express route handlers (default export async fn)
**DB Schema**: `src/db/schema.ts` — Drizzle table definitions
**DB Connector**: `src/db/connector.js` — Shared `drizzleDb` instance
**Components**: `apps/web/components/` — shadcn/ui + custom components
**Config**: `src/config.ts` — Environment config loader
**Logger**: `src/logger.ts` — Pino structured logging

## Related Files

- `src/types/constants.js` — Shared constants (ACTIONS, etc.)
- `apps/web/components/ui/` — shadcn/ui component registry
