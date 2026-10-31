import { useEffect, useState } from "react";
import { PROVIDERS, getApiKey, saveApiKey, deleteApiKey, type ProviderId } from "../lib/llm";
import { getSecret, saveSecret, deleteSecret } from "../lib/sources/base";
import { IcoKey, IcoSun, IcoPeople, IcoClock, IcoRotate } from "./icons";

type Accent = "apricot" | "terracotta" | "sage";

const HELP: Record<ProviderId, { url: string; hint: string }> = {
  groq: {
    url: "https://console.groq.com/keys",
    hint: "Create a free account, generate an API key. Fast Llama models, generous free tier.",
  },
  openrouter: {
    url: "https://openrouter.ai/settings/keys",
    hint: "Free API key; gives access to ':free' models as backup.",
  },
  gemini: {
    url: "https://aistudio.google.com/app/apikey",
    hint: "Free key from Google AI Studio. Good fallback for summaries.",
  },
  ollama: {
    url: "https://ollama.com/download",
    hint: "Optional local fallback. Install Ollama and pull a model (e.g. llama3.2).",
  },
};

const ACCENTS: { id: Accent; label: string; css: string }[] = [
  { id: "apricot", label: "Apricot", css: "var(--accent)" },
  { id: "terracotta", label: "Terracotta", css: "var(--peach)" },
  { id: "sage", label: "Sage", css: "var(--mint)" },
];

function KeyRow({
  icon,
  title,
  hint,
  url,
  present,
  status,
  onSave,
  onRemove,
  placeholder,
}: {
  icon: React.ReactNode;
  title: string;
  hint?: string;
  url?: string;
  present: boolean;
  status?: string;
  onSave: (val: string) => void;
  onRemove?: () => void;
  placeholder: string;
}) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState("");

  return (
    <div className="rise">
      <div
        className="row"
        style={{ cursor: "pointer" }}
        onClick={() => setOpen((o) => !o)}
        role="button"
        aria-expanded={open}
      >
        <div style={{ display: "flex", alignItems: "center" }}>
          <div className="tile">{icon}</div>
          <span>
            {title}
            {hint && <div className="meta" style={{ fontSize: 12, marginTop: 2 }}>{hint}</div>}
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <span
            className="pill"
            style={present ? undefined : { background: "transparent", border: "1px solid var(--line-2)", color: "var(--muted)", fontSize: 13 }}
          >
            {present ? "key saved ✓" : "not set"}
          </span>
          <span className="meta" style={{ fontSize: 12 }}>
            {open ? "−" : "+"}
          </span>
        </div>
      </div>
      <div className={open ? "expand open" : "expand"}>
        <div>
          <div style={{ padding: "12px 6px 4px", display: "flex", flexDirection: "column", gap: 10 }}>
            {url && (
              <a href={url} className="meta" style={{ fontSize: 12, textDecoration: "underline" }}>
                Get a key: {url}
              </a>
            )}
            <div style={{ display: "flex", gap: 8 }}>
              <input
                type="password"
                className="text-input"
                style={{ flex: 1 }}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder={placeholder}
                onClick={(e) => e.stopPropagation()}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && draft.trim()) {
                    onSave(draft.trim());
                    setDraft("");
                  }
                }}
              />
              <button
                className="chip"
                style={{ minHeight: 44, padding: "0 22px", color: "var(--on-accent)", background: "var(--accent)", borderColor: "transparent" }}
                onClick={() => {
                  const v = draft.trim();
                  if (!v) return;
                  onSave(v);
                  setDraft("");
                }}
              >
                Save
              </button>
              {present && onRemove && (
                <button className="chip" style={{ minHeight: 44, padding: "0 22px", color: "#F0A090", background: "transparent" }} onClick={onRemove}>
                  Remove
                </button>
              )}
            </div>
            {status && <div className="meta" style={{ fontSize: 11 }}>{status}</div>}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Settings({
  accent,
  onAccent,
}: {
  accent: Accent;
  onAccent: (a: Accent) => void;
}) {
  const [keys, setKeys] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<Record<string, string>>({});
  const [ghToken, setGhToken] = useState("");
  const [ghDraft, setGhDraft] = useState("");
  const [ghStatus, setGhStatus] = useState("");

  useEffect(() => {
    (async () => {
      for (const id of Object.keys(PROVIDERS)) {
        const k = await getApiKey(id);
        setKeys((prev) => ({ ...prev, [id]: k ?? "" }));
      }
      const gh = await getSecret("github_token");
      setGhToken(gh ?? "");
    })();
  }, []);

  async function saveGh() {
    const val = ghDraft.trim();
    if (!val) return;
    try {
      await saveSecret("github_token", val);
      setGhToken(val);
      setGhDraft("");
      setGhStatus("saved to OS keyring ✓");
    } catch (e) {
      setGhStatus(`error: ${String(e)}`);
    }
  }

  async function removeGh() {
    try {
      await deleteSecret("github_token");
      setGhToken("");
      setGhStatus("removed");
    } catch (e) {
      setGhStatus(`error: ${String(e)}`);
    }
  }

  async function save(id: ProviderId, val: string) {
    if (!val) return;
    try {
      await saveApiKey(id, val);
      setKeys((prev) => ({ ...prev, [id]: val }));
      setStatus((prev) => ({ ...prev, [id]: "saved to OS keyring ✓" }));
    } catch (e) {
      setStatus((prev) => ({ ...prev, [id]: `error: ${String(e)}` }));
    }
  }

  async function remove(id: ProviderId) {
    try {
      await deleteApiKey(id);
      setKeys((prev) => ({ ...prev, [id]: "" }));
      setStatus((prev) => ({ ...prev, [id]: "removed" }));
    } catch (e) {
      setStatus((prev) => ({ ...prev, [id]: `error: ${String(e)}` }));
    }
  }

  const rowIcons: Record<ProviderId, React.ReactNode> = {
    groq: <IcoSun size={18} />,
    gemini: <IcoKey size={18} />,
    openrouter: <IcoRotate size={18} />,
    ollama: <IcoClock size={18} />,
  };

  return (
    <div
      className="rise"
      style={{
        width: "100%",
        maxWidth: 560,
        marginTop: 64,
        display: "flex",
        flexDirection: "column",
        gap: 14,
        overflowY: "auto",
        paddingBottom: 8,
      }}
    >
      <h1 className="rise ser" style={{ animationDelay: "0s", margin: "0 0 18px", fontWeight: 400, fontSize: 46 }}>
        Settings
      </h1>

      {(Object.keys(PROVIDERS) as ProviderId[]).map((id) => (
        <KeyRow
          key={id}
          icon={rowIcons[id]}
          title={PROVIDERS[id].label}
          hint={HELP[id].hint}
          url={HELP[id].url}
          present={!!keys[id]}
          status={status[id]}
          placeholder={keys[id] ? "key saved — enter new to replace" : "paste API key"}
          onSave={(v) => save(id, v)}
          onRemove={PROVIDERS[id].needsKey ? () => remove(id) : undefined}
        />
      ))}

      <KeyRow
        icon={<IcoPeople />}
        title="GitHub token (optional)"
        hint="Raises GitHub search rate limits — read-only PAT from github.com/settings/tokens."
        url="https://github.com/settings/tokens"
        present={!!ghToken}
        status={ghStatus || (ghToken ? undefined : "works without it, rate limited")}
        placeholder={ghToken ? "token saved — enter new to replace" : "paste token (optional)"}
        onSave={() => saveGh()}
        onRemove={removeGh}
      />

      {/* Accent picker — exactly the design's row, now functional */}
      <div className="row rise" style={{ animationDelay: "0.55s" }}>
        <div style={{ display: "flex", alignItems: "center" }}>
          <div className="tile">
            <IcoPeople />
          </div>
          Accent
        </div>
        <div style={{ display: "flex", gap: 12 }}>
          {ACCENTS.map((a) => (
            <button
              key={a.id}
              aria-label={a.label}
              title={a.label}
              onClick={() => onAccent(a.id)}
              style={{
                width: 28,
                height: 28,
                borderRadius: "50%",
                border: 0,
                background: a.css,
                ...(accent === a.id ? { outline: "2px solid #F6F0E6", outlineOffset: 3 } : {}),
              }}
            />
          ))}
        </div>
      </div>

      <p className="meta rise" style={{ animationDelay: "0.7s", fontSize: 12, margin: "4px 0 0", lineHeight: 1.6 }}>
        API keys are stored in your operating system's secure credential store (Windows Credential
        Manager / macOS Keychain / Linux Secret Service) — never in files or git.
      </p>
    </div>
  );
}
