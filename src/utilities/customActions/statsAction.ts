import {
  resolveAction,
  type ActionContext,
  type ResolvedAction,
} from "./resolver.js";

/** Stats outlive definitions, so a name with recorded rows but no definition still needs an action to render. */
export async function resolveStatsAction(
  name: string,
  ctx: ActionContext,
): Promise<ResolvedAction> {
  return (
    (await resolveAction(name, ctx)) ?? {
      name,
      phrase: name,
      isBuiltIn: false,
      sources: [],
      imageSource: "custom",
      definitionImages: {},
      personalOwnerIds: [],
    }
  );
}
