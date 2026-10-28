import { useEffect, useState } from "react";
import { PROVIDERS, getApiKey, saveApiKey, deleteApiKey, type ProviderId } from "../lib/llm";

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
    hint: "Optional local fallback. Install Ollama and pull a model (e.g. llama3.2). Planned for later phase.",
  },
};

export default function Settings() {
  const [keys, setKeys] = useState<Record<string, string>>({});
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<Record<string, string>>({});

  useEffect(() => {
    (async () => {
      for (const id of Object.keys(PROVIDERS)) {
        const k = await getApiKey(id);
        setKeys((prev) => ({ ...prev, [id]: k ?? "" }));
      }
    })();
  }, []);

  async function save(id: ProviderId) {
    const val = (drafts[id] ?? "").trim();
    if (!val) return;
    try {
      await saveApiKey(id, val);
      setKeys((prev) => ({ ...prev, [id]: val }));
      setDrafts((prev) => ({ ...prev, [id]: "" }));
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

  return (
    <div className="h-full overflow-y-auto p-6">
      <div className="mx-auto max-w-2xl space-y-5">
        <p className="text-xs text-slate-400">
          API keys are stored in your operating system's secure credential store
          (Windows Credential Manager / macOS Keychain / Linux Secret Service) —
          never in files or git.
        </p>
        {(Object.keys(PROVIDERS) as ProviderId[]).map((id) => (
          <section key={id} className="rounded-xl bg-slate-800/60 p-4">
            <h3 className="text-sm font-semibold">{PROVIDERS[id].label}</h3>
            <p className="mt-1 text-xs text-slate-400">{HELP[id].hint}</p>
            <a
              href={HELP[id].url}
              className="text-xs text-blue-300 underline decoration-slate-600"
            >
              Get a key: {HELP[id].url}
            </a>
            <div className="mt-3 flex gap-2">
              <input
                type="password"
                value={drafts[id] ?? ""}
                onChange={(e) => setDrafts((p) => ({ ...p, [id]: e.target.value }))}
                onKeyDown={(e) => e.key === "Enter" && save(id)}
                placeholder={keys[id] ? "key saved - enter new to replace" : "paste API key"}
                className="flex-1 rounded bg-slate-900 px-3 py-1.5 text-xs outline-none"
              />
              <button
                onClick={() => save(id)}
                className="rounded bg-blue-600 px-3 py-1.5 text-xs font-medium"
              >
                Save
              </button>
              {keys[id] && (
                <button
                  onClick={() => remove(id)}
                  className="rounded bg-slate-700 px-3 py-1.5 text-xs"
                >
                  Remove
                </button>
              )}
            </div>
            <div className="mt-2 flex items-center gap-2 text-[10px]">
              {keys[id] ? (
                <span className="text-green-400">key present ✓</span>
              ) : (
                <span className="text-slate-500">no key</span>
              )}
              {status[id] && <span className="text-slate-400">{status[id]}</span>}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
