import { useEffect, useState } from "react";
import { save } from "@tauri-apps/plugin-dialog";
import { invoke } from "@tauri-apps/api/core";
import { listProfiles } from "../lib/profiles";
import { getDb } from "../lib/db";
import { buildProfileContext } from "../lib/profileContext";
import { fetchTrendsForProfile, profileKeywords, type SourceResult } from "../lib/sources";
import { analyzeTrends } from "../lib/agent";
import { PROVIDERS, type ProviderId } from "../lib/llm";

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
  const [report, setReport] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [phase, setPhase] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [provider, setProvider] = useState<ProviderId>("groq");
  const [model, setModel] = useState(PROVIDERS.groq.models[0]);
  const [savedNote, setSavedNote] = useState<string | null>(null);

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
    setReport(null);
    setError(null);
    setKeywords(await profileKeywords(id));
  }

  async function runPipeline() {
    if (profileId === null || busy) return;
    setBusy(true);
    setError(null);
    setSavedNote(null);
    setReport(null);
    setResults([]);
    try {
      setPhase("Fetching trends (GitHub / HN / arXiv)...");
      const res = await fetchTrendsForProfile(profileId, (r) =>
        setResults((prev) => [...prev, r])
      );
      const all = res.flatMap((r) => r.items);
      if (!all.length) {
        setError("No items fetched. Check the profile's enabled sources or try later (rate limits).");
        return;
      }
      setPhase("Analyzing with LLM...");
      const ctx = await buildProfileContext(profileId);
      const name = profiles.find((p) => p.id === profileId)?.name ?? "profile";
      const brief = await analyzeTrends(name, ctx, all, provider, model);
      setReport(brief);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
      setPhase("");
    }
  }

  async function saveReport() {
    if (!report || profileId === null) return;
    const path = await save({
      title: "Save trend brief",
      defaultPath: `trend-brief-${new Date().toISOString().slice(0, 10)}.md`,
      filters: [{ name: "Markdown", extensions: ["md"] }],
    });
    if (!path) return;
    try {
      await invoke("export_report", { path, content: report });
      const db = await getDb();
      await db.execute(
        "INSERT INTO reports (profile_id, path, content) VALUES ($1, $2, $3)",
        [profileId, path, report]
      );
      setSavedNote(`Saved to ${path}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  const totalItems = results.reduce((n, r) => n + r.items.length, 0);

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
          <select
            value={provider}
            onChange={(e) => {
              const p = e.target.value as ProviderId;
              setProvider(p);
              setModel(PROVIDERS[p].models[0]);
            }}
            className="rounded bg-slate-800 px-2 py-1.5 text-xs outline-none"
          >
            {Object.entries(PROVIDERS).map(([id, p]) => (
              <option key={id} value={id}>
                {p.label}
              </option>
            ))}
          </select>
          <select
            value={model}
            onChange={(e) => setModel(e.target.value)}
            className="rounded bg-slate-800 px-2 py-1.5 text-xs outline-none"
          >
            {PROVIDERS[provider].models.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
          <button
            onClick={runPipeline}
            disabled={busy || profileId === null}
            className="rounded-lg bg-blue-600 px-4 py-1.5 text-sm font-medium disabled:opacity-40"
          >
            {busy ? phase || "Working..." : "Fetch & analyze trends"}
          </button>
          {report && (
            <button
              onClick={saveReport}
              className="rounded-lg bg-emerald-600 px-4 py-1.5 text-sm font-medium"
            >
              Save as .md
            </button>
          )}
        </div>

        {keywords.length > 0 && (
          <div className="mb-4 flex flex-wrap items-center gap-1 text-[10px] text-slate-400">
            searching:
            {keywords.map((k) => (
              <span key={k} className="rounded-full bg-slate-800 px-2 py-0.5">
                {k}
              </span>
            ))}
            <span className="ml-1">(last 30 days)</span>
          </div>
        )}

        {error && (
          <p className="mb-4 whitespace-pre-wrap rounded-lg bg-red-900/30 p-3 text-xs text-red-300">
            {error}
          </p>
        )}
        {savedNote && (
          <p className="mb-4 rounded-lg bg-emerald-900/30 p-3 text-xs text-emerald-300">
            {savedNote}
          </p>
        )}

        {report && (
          <section className="mb-8">
            <h2 className="mb-2 text-sm font-semibold text-blue-300">
              Trend brief (LLM-ranked for this profile)
            </h2>
            <pre className="whitespace-pre-wrap rounded-xl bg-slate-800/60 p-4 font-sans text-xs leading-relaxed text-slate-200">
              {report}
            </pre>
          </section>
        )}

        <details className="mb-4">
          <summary className="cursor-pointer text-xs text-slate-400">
            Raw fetched items ({totalItems})
          </summary>
          <div className="mt-3 space-y-5">
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
          </div>
        </details>

        {!results.length && !report && !busy && !error && (
          <p className="text-sm text-slate-500">
            Pick a profile and hit <b>Fetch &amp; analyze</b>. The agent pulls
            trending repos/discussions/papers for your fields, then ranks them
            specifically for you and lets you save the brief as a Markdown file.
          </p>
        )}
      </div>
    </div>
  );
}
