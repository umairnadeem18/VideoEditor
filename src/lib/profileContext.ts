import { getFields, getLinks, getSources } from "./profiles";

export async function buildProfileContext(profileId: number): Promise<string> {
  const [fields, links, sources] = await Promise.all([
    getFields(profileId),
    getLinks(profileId),
    getSources(profileId),
  ]);
  const fieldLines = fields.map((f) => `- ${f.key}: ${f.value}`).join("\n");
  const linkLines = links.map((l) => `- ${l.platform}: ${l.url}`).join("\n");
  const enabled = sources
    .filter((s) => s.enabled)
    .map((s) => s.name)
    .join(", ");
  return [
    "USER PROFILE:",
    fieldLines || "(not set)",
    "",
    "PROFILE LINKS:",
    linkLines || "(none)",
    "",
    `ENABLED TREND SOURCES: ${enabled || "(none)"}`,
  ].join("\n");
}

export const FALLBACK_SYSTEM =
  "You are a personal research agent. Answer helpfully and concretely.";
