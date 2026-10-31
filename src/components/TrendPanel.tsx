import { useEffect, useState } from "react";
import { save } from "@tauri-apps/plugin-dialog";
import { invoke } from "@tauri-apps/api/core";
import { listProfiles } from "../lib/profiles";
import { getDb } from "../lib/db";
import { buildProfileContext } from "../lib/profileContext";
import { fetchTrendsForProfile, profileKeywords, type SourceResult } from "../lib/sources";
import { analyzeTrends } from "../lib/agent";
import { PROVIDERS, type ProviderId } from "../lib/llm";
import { IcoDashboard, IcoRefresh, IcoClock } from "./icons";

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
  const [savedReports, setSavedReports] = useState<
    { id: number; path: string | null; createdAt: string; content: string }[]
  >([]);

  async function loadReports(id: number) {
    const db = await getDb();
    const rows = await db.select<
      { id: number; path: string | null; createdAt: string; content: string }[]
    >(
      "SELECT id, path, created_at AS createdAt, content FROM reports WHERE profile_id = $1 ORDER BY id DESC",
      [id]
    );
    setSavedReports(rows);
  }

  useEffect(() => {
    listProfiles().then((list) => {
      setProfiles(list.map((p) => ({ id: p.id, name: p.name })));
      if (list.length) {
        setProfileId(list[0].id);
        profileKeywords(list[0].id).then(setKeywords);
        loadReports(list[0].id);
      }
    });
  }, []);

  async function pickProfile(id: number) {
    setProfileId(id);
    setResults([]);
    setReport(null);
    setError(null);
    setKeywords(await profileKeywords(id));
    loadReports(id);
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
      loadReports(profileId);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  const totalItems = results.reduce((n, r) => n + r.items.length, 0);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        width: "100%",
        height: "100%",
        overflowY: "auto",
      }}
    >
      <div className="rise" style={{ width: "100%", maxWidth: 620, display: "flex", flexDirection: "column" }}>
        <h1 className="rise ser" style={{ margin: "0 0 6px", fontWeight: 400, fontSize: 46 }}>
          Trends
        </h1>
        <p className="rise meta" style={{ animationDelay: "0.1s", margin: 0, fontSize: 15 }}>
          Trending repos, papers and discussions — ranked for you.
        </p>

        {/* controls */}
        <div className="rise" style={{ animationDelay: "0.2s", display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center", marginTop: 20 }}>
          <select
            className="select"
            value={profileId ?? ""}
            onChange={(e) => pickProfile(Number(e.target.value))}
          >
            {profiles.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
          <select
            className="select"
            value={provider}
            onChange={(e) => {
              const p = e.target.value as ProviderId;
              setProvider(p);
              setModel(PROVIDERS[p].models[0]);
            }}
          >
            {Object.entries(PROVIDERS).map(([id, p]) => (
              <option key={id} value={id}>
                {p.label}
              </option>
            ))}
          </select>
          <select className="select" value={model} onChange={(e) => setModel(e.target.value)}>
            {PROVIDERS[provider].models.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
          {report && !busy && (
            <button
              className="chip"
              style={{ color: "var(--on-accent)", background: "var(--mint)", borderColor: "transparent" }}
              onClick={saveReport}
            >
              Save as .md
            </button>
          )}
          <button
            className="chip"
            style={{ color: "var(--on-accent)", background: "var(--accent)", borderColor: "transparent", opacity: busy || profileId === null ? 0.5 : 1 }}
            disabled={busy || profileId === null}
            onClick={runPipeline}
          >
            {busy ? (
              <>
                <span className="dot" style={{ background: "var(--on-accent)" }} />
                {phase || "Working..."}
              </>
            ) : (
              <>
                <IcoRefresh size={16} />
                Fetch &amp; analyze
              </>
            )}
          </button>
        </div>

        {/* keyword pills */}
        {keywords.length > 0 && (
          <div className="rise" style={{ animationDelay: "0.3s", marginTop: 16, display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
            <span className="meta" style={{ fontSize: 12 }}>searching</span>
            {keywords.map((k) => (
              <span
                key={k}
                style={{
                  background: "var(--hover)",
                  border: "1px solid var(--line-2)",
                  color: "var(--muted)",
                  borderRadius: 999,
                  padding: "5px 14px",
                  fontSize: 12,
                }}
              >
                {k}
              </span>
            ))}
            <span className="meta" style={{ fontSize: 12 }}>(last 30 days)</span>
          </div>
        )}
      </div>

      {/* in-flight status: rings + bounce */}
      {busy && (
        <div className="rise" style={{ marginTop: 40, display: "flex", flexDirection: "column", alignItems: "center", gap: 18 }}>
          <div style={{ position: "relative", width: 150, height: 150 }}>
            <div className="ring" style={{ borderColor: "var(--accent)", width: 150, height: 150, margin: "-75px 0 0 -75px" }} />
            <div className="ring" style={{ borderColor: "var(--accent)", width: 150, height: 150, margin: "-75px 0 0 -75px", animationDelay: "-2.5s" }} />
            <div className="ring" style={{ borderColor: "var(--accent)", width: 150, height: 150, margin: "-75px 0 0 -75px", animationDelay: "-5s" }} />
            <div
              style={{
                position: "absolute",
                inset: 55,
                borderRadius: "50%",
                background: "var(--accent)",
                animation: "breathe 5s ease-in-out infinite",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <IcoDashboard size={22} style={{ color: "var(--on-accent)" }} />
            </div>
          </div>
          <div style={{ display: "flex", gap: 10, alignItems: "center", fontSize: 15 }}>
            <span>{phase || "Working..."}</span>
            <span className="typing" style={{ display: "flex", gap: 5 }}>
              <span style={{ animationDelay: "0s" }} />
              <span style={{ animationDelay: "0.2s" }} />
              <span style={{ animationDelay: "0.4s" }} />
            </span>
          </div>
        </div>
      )}

      {/* the brief */}
      {report && (
        <section className="rise" style={{ width: "100%", maxWidth: 620, marginTop: 36 }}>
          <h2 className="ser" style={{ margin: "0 0 14px", fontWeight: 400, fontSize: 30 }}>
            Trend brief
          </h2>
          <div className="card" style={{ fontFamily: "'Fraunces', Georgia, serif", fontSize: 16, lineHeight: 1.65, whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>
            {report}
          </div>
        </section>
      )}

      {error && (
        <div
          className="rise"
          style={{
            width: "100%",
            maxWidth: 620,
            marginTop: 24,
            background: "var(--peach-soft)",
            color: "#F0A090",
            border: "1px solid var(--chip-line)",
            borderRadius: 18,
            padding: "14px 20px",
            fontSize: 13,
            whiteSpace: "pre-wrap",
          }}
        >
          {error}
        </div>
      )}
      {savedNote && (
        <div className="rise" style={{ width: "100%", maxWidth: 620, marginTop: 24 }}>
          <div className="row" style={{ fontSize: 13, color: "var(--mint)" }}>
            <div style={{ display: "flex", alignItems: "center" }}>
              <div className="tile">
                <IcoClock size={18} />
              </div>
              {savedNote}
            </div>
          </div>
        </div>
      )}

      {/* raw items */}
      {results.length > 0 && (
        <details className="rise" style={{ width: "100%", maxWidth: 620, marginTop: 32 }}>
          <summary
            className="chip"
            style={{ width: "100%", justifyContent: "space-between", listStyle: "none", display: "flex" }}
          >
            <span style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span className="dot" style={{ background: "var(--peach)" }} />
              Raw fetched items
            </span>
            <span className="meta" style={{ fontSize: 13 }}>{totalItems}</span>
          </summary>
          <div style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 20 }}>
            {results.map((r) => (
              <section key={r.source}>
                <h3 style={{ margin: "0 0 8px", fontSize: 15, fontWeight: 500 }}>
                  {SOURCE_LABELS[r.source] ?? r.source}
                  <span className="meta" style={{ fontSize: 12, marginLeft: 8 }}>
                    {r.items.length} items
                  </span>
                </h3>
                {r.error && (
                  <p className="meta" style={{ fontSize: 12, margin: 0 }}>
                    {r.error}
                  </p>
                )}
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {r.items.map((it, i) => (
                    <a key={i} href={it.url} className="row" style={{ fontSize: 14, textDecoration: "none" }}>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ overflowWrap: "anywhere" }}>{it.title}</div>
                        <div className="meta" style={{ fontSize: 11, marginTop: 3 }}>
                          {it.date} · {it.extra}
                        </div>
                      </div>
                    </a>
                  ))}
                </div>
              </section>
            ))}
          </div>
        </details>
      )}

      {!results.length && !report && !busy && !error && (
        <p className="rise meta" style={{ animationDelay: "0.5s", marginTop: 48, maxWidth: 460, textAlign: "center", fontSize: 15, lineHeight: 1.6 }}>
          Pick a profile and hit <b style={{ color: "var(--text)" }}>Fetch &amp; analyze</b>. The agent
          pulls trending repos, discussions and papers for your fields, ranks them for you, and lets
          you save the brief as a Markdown file.
        </p>
      )}

      {/* saved briefs */}
      {savedReports.length > 0 && (
        <section className="rise" style={{ width: "100%", maxWidth: 620, marginTop: 40 }}>
          <h2 className="ser" style={{ margin: "0 0 14px", fontWeight: 400, fontSize: 30 }}>
            Saved briefs
          </h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {savedReports.map((r) => (
              <div key={r.id} className="row" style={{ fontSize: 14 }}>
                <button
                  onClick={() => {
                    setReport(r.content);
                    window.scrollTo({ top: 0 });
                  }}
                  className="meta"
                  style={{ flex: 1, textAlign: "left", background: "transparent", border: 0, color: "var(--accent)", fontSize: 13, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
                  title={r.path ?? undefined}
                >
                  {r.createdAt} {r.path ? `· ${r.path}` : "(not exported)"}
                </button>
                <button
                  onClick={async () => {
                    const db = await getDb();
                    await db.execute("DELETE FROM reports WHERE id = $1", [r.id]);
                    if (profileId !== null) loadReports(profileId);
                  }}
                  style={{ background: "transparent", border: 0, color: "var(--muted)" }}
                  title="Delete"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
