import { fetch } from "@tauri-apps/plugin-http";
import type { TrendItem } from "./base";

export async function fetchArxiv(keywords: string[], perKeyword = 4): Promise<TrendItem[]> {
  const items: TrendItem[] = [];
  for (const kw of keywords) {
    const q = `all:${kw.replace(/\s+/g, "+")}`;
    const url = `https://export.arxiv.org/api/query?search_query=${encodeURIComponent(
      q
    )}&sortBy=submittedDate&sortOrder=descending&max_results=${perKeyword}`;
    try {
      const res = await fetch(url);
      if (!res.ok) continue;
      const xml = await res.text();
      items.push(...parseAtom(xml));
    } catch {
      // tolerated per-keyword failure
    }
  }
  return items;
}

function parseAtom(xml: string): TrendItem[] {
  const doc = new DOMParser().parseFromString(xml, "application/xml");
  const entries = Array.from(doc.getElementsByTagName("entry"));
  return entries.map((e) => {
    const title = textOf(e, "title");
    const summary = textOf(e, "summary");
    const published = textOf(e, "published");
    const linkEl = Array.from(e.getElementsByTagName("link")).find(
      (l) => l.getAttribute("type") === "application/pdf" || l.getAttribute("rel") === "alternate"
    );
    const absId = textOf(e, "id") ?? "";
    return {
      source: "arxiv",
      title: (title ?? "(untitled)").replace(/\s+/g, " ").trim(),
      url: linkEl?.getAttribute("href") ?? absId,
      score: 0,
      date: (published ?? "").slice(0, 10),
      extra: (summary ?? "").replace(/\s+/g, " ").trim().slice(0, 180) + "...",
    };
  });
}

function textOf(parent: Element, tag: string): string | null {
  const el = parent.getElementsByTagName(tag)[0];
  return el?.textContent ?? null;
}
