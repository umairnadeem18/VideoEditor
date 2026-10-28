import { httpGetJson, type TrendItem } from "./base";

type HnHit = {
  title: string | null;
  url: string | null;
  points: number;
  num_comments: number;
  objectID: string;
  created_at: string;
};

export async function fetchHackerNews(keywords: string[], perKeyword = 5): Promise<TrendItem[]> {
  const cutoff = Math.floor(Date.now() / 1000 - 30 * 86400);
  const items: TrendItem[] = [];
  for (const kw of keywords) {
    const url = `https://hn.algolia.com/api/v1/search?query=${encodeURIComponent(
      kw
    )}&tags=story&hitsPerPage=${perKeyword}&numericFilters=created_at_i>${cutoff}`;
    try {
      const data = await httpGetJson<{ hits: HnHit[] }>(url);
      for (const h of data.hits) {
        if (!h.title) continue;
        items.push({
          source: "hackernews",
          title: h.title,
          url: h.url ?? `https://news.ycombinator.com/item?id=${h.objectID}`,
          score: h.points,
          date: h.created_at.slice(0, 10),
          extra: `${h.points} points · ${h.num_comments} comments`,
        });
      }
    } catch {
      // tolerated per-keyword failure
    }
  }
  return items;
}
