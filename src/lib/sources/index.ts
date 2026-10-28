import { getFields, getSources, getLinks } from "../profiles";
import { fetchGithub } from "./github";
import { fetchHackerNews } from "./hackernews";
import { fetchArxiv } from "./arxiv";
import type { SourceId, TrendItem } from "./base";

export type SourceResult = { source: SourceId; items: TrendItem[]; error?: string };

export async function profileKeywords(profileId: number): Promise<string[]> {
  const fields = await getFields(profileId);
  const raw = fields
    .filter((f) => ["fields_of_study", "interests", "expertise"].includes(f.key))
    .map((f) => f.value)
    .join(", ");
  const kws = raw
    .split(/[,;/\n]+/)
    .map((k) => k.trim())
    .filter((k) => k.length > 2);
  const unique = Array.from(new Set(kws.map((k) => k.toLowerCase())));
  return unique.slice(0, 4);
}

export async function enabledSources(profileId: number): Promise<SourceId[]> {
  const sources = await getSources(profileId);
  return sources
    .filter((s) => s.enabled && ["github", "hackernews", "arxiv"].includes(s.name))
    .map((s) => s.name as SourceId);
}

export async function fetchTrendsForProfile(
  profileId: number,
  onPartial: (r: SourceResult) => void
): Promise<SourceResult[]> {
  const [keywords, sources, links] = await Promise.all([
    profileKeywords(profileId),
    enabledSources(profileId),
    getLinks(profileId),
  ]);

  const tasks: { source: SourceId; run: () => Promise<TrendItem[]> }[] = [];
  if (sources.includes("github")) tasks.push({ source: "github", run: () => fetchGithub(keywords) });
  if (sources.includes("hackernews"))
    tasks.push({ source: "hackernews", run: () => fetchHackerNews(keywords) });
  if (sources.includes("arxiv")) tasks.push({ source: "arxiv", run: () => fetchArxiv(keywords) });

  if (!tasks.length) {
    return [{ source: "github", items: [], error: "No sources enabled for this profile." }];
  }

  const results = await Promise.all(
    tasks.map(async (t): Promise<SourceResult> => {
      try {
        return { source: t.source, items: await t.run() };
      } catch (e) {
        return { source: t.source, items: [], error: e instanceof Error ? e.message : String(e) };
      }
    })
  );
  results.forEach(onPartial);
  void links;
  return results;
}
