import { httpGetJson, getSecret, daysAgoIso, type TrendItem } from "./base";

type GhRepo = {
  full_name: string;
  html_url: string;
  description: string | null;
  stargazers_count: number;
  pushed_at: string;
  topics?: string[];
  language: string | null;
};

export async function fetchGithub(keywords: string[], perKeyword = 4): Promise<TrendItem[]> {
  const since = daysAgoIso(30);
  const token = await getSecret("github_token");
  const headers: Record<string, string> = { Accept: "application/vnd.github+json" };
  if (token) headers.Authorization = `Bearer ${token}`;

  const items: TrendItem[] = [];
  for (const kw of keywords) {
    const q = encodeURIComponent(`${kw} created:>${since}`);
    const url = `https://api.github.com/search/repositories?q=${q}&sort=stars&order=desc&per_page=${perKeyword}`;
    try {
      const data = await httpGetJson<{ items: GhRepo[] }>(url, headers);
      for (const r of data.items) {
        items.push({
          source: "github",
          title: `${r.full_name} — ${r.description ?? "(no description)"}`,
          url: r.html_url,
          score: r.stargazers_count,
          date: r.pushed_at.slice(0, 10),
          extra: `★${r.stargazers_count}${r.language ? " · " + r.language : ""}${
            r.topics?.length ? " · " + r.topics.slice(0, 3).join(", ") : ""
          }`,
        });
      }
    } catch {
      // per-keyword failures are tolerated; the keyword just contributes nothing
    }
  }
  return items;
}
