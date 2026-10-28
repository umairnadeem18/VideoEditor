import { useEffect, useState } from "react";
import { listProfiles } from "../lib/profiles";
import { fetchTrendsForProfile, profileKeywords, type SourceResult } from "../lib/sources";

const SOURCE_LABELS: Record<string, string> = {
  github: "GitHub",
  hackernews: "Hacker News",
  arxiv: "arXiv",
};

export default function TrendPanel() {
  const [profiles, setProfiles] = useState<{ id: number; name: string }[]>([]);
  const [profileId, setProfileId] = useState<number | null>(null);
  const [keywords, setKeywords] = useState<string[]>([]);
  const [results, setResults] = useState<SourceResult[]>([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    listProfiles().then((list) => {
      setProfiles(list.map((p) => ({ id: p.id, name: p.name })));
      if (list.length) {
        setProfileId(list[0].id);
        profileKeywords(list[0].id).then(setKeywords);
      }
    });
  }, []);

  async function pickProfile(id: number) {
    setProfileId(id);
    setResults([]);
    setKeywords(await profileKeywords(id));
  }

  async function fetchNow() {
    if (profileId === null || busy) return;
    setBusy(true);
    setResults([]);
    await fetchTrendsForProfile(profileId, (r) =>
      setResults((prev) => [...prev, r])
    );
    setBusy(false);
  }

  const hasData = results.some((r) => r.items.length);

  return (
    <div className="h-full overflow-y-auto p-6">
      <div className="mx-auto max-w-3xl">
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <select
            value={profileId ?? ""}
            onChange={(e) => pickProfile(Number(e.target.value))}
            className="rounded bg-slate-800 px-2 py-1.5 text-sm outline-none"
          >
            {profiles.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
          <button
            onClick={fetchNow}
            disabled={busy || profileId === null}
            className="rounded-lg bg-blue-600 px-4 py-1.5 text-sm font-medium disabled:opacity-40"
          >
            {busy ? "Fetching trends..." : "Fetch trending for this profile"}
          </button>
          <span className="text-xs text-slate-500">last 30 days</span>
        </div>

        {keywords.length > 0 && (
          <div className="mb-4 flex flex-wrap gap-1 text-[10px] text-slate-400">
            searching for:
            {keywords.map((k) => (
              <span key={k} className="rounded-full bg-slate-800 px-2 py-0.5">
                {k}
              </span>
            ))}
          </div>
        )}

        {!results.length && !busy && (
          <p className="text-sm text-slate-500">
            Pick a profile and hit fetch. Results come from GitHub, Hacker News and
            arXiv (whatever is enabled on the profile), filtered by your fields of
            study.
          </p>
        )}

        <div className="space-y-6">
          {results.map((r) => (
            <section key={r.source}>
              <h3 className="mb-2 text-sm font-semibold text-slate-300">
                {SOURCE_LABELS[r.source] ?? r.source}
                <span className="ml-2 text-xs font-normal text-slate-500">
                  {r.items.length} items
                </span>
              </h3>
              {r.error && (
                <p className="rounded bg-red-900/30 p-2 text-xs text-red-300">
                  {r.error}
                </p>
              )}
              <div className="space-y-1">
                {r.items.map((it, i) => (
                  <a
                    key={i}
                    href={it.url}
                    className="block rounded-lg bg-slate-800/60 p-2.5 hover:bg-slate-800"
                  >
                    <div className="text-sm text-slate-200">{it.title}</div>
                    <div className="mt-0.5 text-[10px] text-slate-500">
                      {it.date} · {it.extra}
                    </div>
                  </a>
                ))}
              </div>
            </section>
          ))}
          {hasData && !busy && (
            <p className="text-xs text-slate-500">
              Raw results shown. Phase 4 adds the LLM ranking pass ("why this
              matters for you") and Phase 5 turns it into a downloadable report.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
