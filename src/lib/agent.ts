import type { TrendItem } from "./sources/base";
import { chatWithFallback, type ProviderId } from "./llm";

const MAX_ITEMS = 30;

export function compactItems(items: TrendItem[]): string {
  return items
    .slice(0, MAX_ITEMS)
    .map(
      (it, i) =>
        `${i + 1}. [${it.source}] ${it.title} | ${it.url} | ${it.extra} | ${it.date}`
    )
    .join("\n");
}

const REPORT_INSTRUCTION = `You are a research curation agent. You receive the user's profile and a raw list of trending items fetched from GitHub, Hacker News and arXiv.

Your job:
1. Pick the items genuinely worth the user's time, judged by relevance to their profile (fields, expertise, links) — not by raw popularity alone.
2. Discard anything the profile says is irrelevant to them.

Return ONLY a markdown report in exactly this structure:

# Trend Brief — <profile name>
_Brief: one sentence summary of what was found._

## Top picks
For each of the 3-5 best items:
### <short name>
<one-sentence what it is> — [link](<url>)
**Why for you:** one or two sentences tying it directly to the user's profile.

## Also notable
- <title> — [link](<url>) — <few words>

## Try next
One concrete, profile-specific action the user could take this week (build, read, or watch).`;

export async function analyzeTrends(
  profileName: string,
  profileContext: string,
  items: TrendItem[],
  provider: ProviderId,
  model: string
): Promise<string> {
  const content = compactItems(items);
  if (!content.trim()) {
    throw new Error("No items found to analyze.");
  }
  const msgs = [
    { role: "system" as const, content: REPORT_INSTRUCTION },
    {
      role: "user" as const,
      content: `USER PROFILE (${profileName}):\n${profileContext}\n\nRAW TRENDING ITEMS:\n${content}\n\nWrite the trend brief now.`,
    },
  ];
  const fb = await chatWithFallback(provider, model, msgs);
  return fb.content;
}
