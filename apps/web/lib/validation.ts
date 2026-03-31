import { z } from "zod";
import { ACTIONS } from "@petbot/constants";

export const discordIdSchema = z.string().regex(/^\d+$/, "Invalid Discord ID");

export const userIdParam = z.object({ userId: discordIdSchema });
export const guildIdParam = z.object({ guildId: discordIdSchema });
export const userGuildParams = z.object({
  userId: discordIdSchema,
  guildId: discordIdSchema,
});
export const userLocationParams = z.object({
  userId: discordIdSchema,
  locationId: discordIdSchema,
});

export const setImagesBody = z
  .object({
    guildId: discordIdSchema.optional(),
    actionType: z.string().refine((v) => v in ACTIONS, "Invalid action type"),
    images: z
      .array(
        z.union([
          z.literal(""),
          z
            .string()
            .regex(/^https?:\/\//i, "Must be HTTP(S) URL")
            .max(2048),
        ]),
      )
      .max(4),
    everywhere: z.boolean().optional().default(false),
  })
  .refine(
    (data) => data.everywhere || data.guildId,
    "guildId is required when everywhere is false",
  );

export const serverSettingsBody = z
  .object({})
  .passthrough()
  .refine(
    (v) => typeof v === "object" && v !== null && !Array.isArray(v),
    "Body must be a JSON object",
  );
