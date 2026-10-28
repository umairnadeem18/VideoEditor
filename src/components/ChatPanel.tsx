import { useEffect, useRef, useState } from "react";
import { getDb } from "../lib/db";
import {
  getFields,
  getLinks,
  getSources,
  type ProfileField,
  type ProfileLink,
} from "../lib/profiles";
import {
  PROVIDERS,
  chat,
  chatWithFallback,
  getApiKey,
  type ChatMsg,
  type ProviderId,
} from "../lib/llm";

type Message = { role: "user" | "agent"; content: string };

export default function ChatPanel({ activeId }: { activeId: number | null }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [provider, setProvider] = useState<ProviderId>("groq");
  const [model, setModel] = useState(PROVIDERS.groq.models[0]);
  const [error, setError] = useState<string | null>(null);
  const [systemPrompt, setSystemPrompt] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (activeId === null) return;
    (async () => {
      const db = await getDb();
      const [fields, links, sources] = await Promise.all([
        getFields(activeId),
        getLinks(activeId),
        getSources(activeId),
      ]);
      setSystemPrompt(buildSystemPrompt(fields, links, sources));
      const history = await db.select<{ role: string; content: string }[]>(
        "SELECT role, content FROM messages WHERE profile_id = $1 ORDER BY id",
        [activeId]
      );
      setMessages(
        history.map((h) => ({
          role: h.role === "user" ? "user" : "agent",
          content: h.content,
        }))
      );
    })();
  }, [activeId]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages, busy]);

  async function send() {
    const text = input.trim();
    if (!text || busy) return;
    setInput("");
    setError(null);
    const next: Message[] = [...messages, { role: "user", content: text }];
    setMessages(next);
    setBusy(true);

    try {
      const msgs: ChatMsg[] = [
        { role: "system", content: systemPrompt || FALLBACK_SYSTEM },
        ...next.map((m) => ({
          role: m.role === "user" ? ("user" as const) : ("assistant" as const),
          content: m.content,
        })),
      ];
      let reply: string;
      const providerPref = (await getApiKey(provider)) || provider === "ollama";
      if (providerPref) {
        reply = await chat(provider, model, msgs);
      } else {
        const fb = await chatWithFallback(provider, model, msgs);
        reply = fb.content;
      }
      setMessages((m) => [...m, { role: "agent", content: reply }]);
      if (activeId !== null) {
        const db = await getDb();
        await db.execute(
          "INSERT INTO messages (profile_id, role, content) VALUES ($1, $2, $3)",
          [activeId, "user", text]
        );
        await db.execute(
          "INSERT INTO messages (profile_id, role, content) VALUES ($1, $2, $3)",
          [activeId, "agent", reply]
        );
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto flex h-full w-full max-w-3xl flex-col p-6">
      <div className="mb-3 flex items-center gap-2 text-xs">
        <span className="text-slate-500">Model:</span>
        <select
          value={provider}
          onChange={(e) => {
            const p = e.target.value as ProviderId;
            setProvider(p);
            setModel(PROVIDERS[p].models[0]);
          }}
          className="rounded bg-slate-800 px-2 py-1 outline-none"
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
          className="rounded bg-slate-800 px-2 py-1 outline-none"
        >
          {PROVIDERS[provider].models.map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </select>
        {activeId === null && (
          <span className="text-amber-400">no active profile</span>
        )}
      </div>

      <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto pr-1">
        {messages.map((m, i) => (
          <div
            key={i}
            className={
              m.role === "user"
                ? "ml-auto max-w-xl rounded-xl bg-slate-800 p-3"
                : "mr-auto max-w-xl rounded-xl bg-blue-900/40 p-3"
            }
          >
            <p className="whitespace-pre-wrap text-sm">{m.content}</p>
          </div>
        ))}
        {busy && (
          <div className="mr-auto rounded-xl bg-blue-900/40 p-3 text-sm text-slate-400">
            Thinking...
          </div>
        )}
        {error && (
          <div className="rounded-xl bg-red-900/40 p-3 text-xs text-red-300">
            {error}
          </div>
        )}
      </div>

      <div className="mt-4 flex gap-2">
        <input
          className="flex-1 rounded-lg bg-slate-800 px-4 py-2 text-sm outline-none placeholder:text-slate-500"
          placeholder={busy ? "Waiting for reply..." : "Ask your research agent..."}
          value={input}
          disabled={busy}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send()}
        />
        <button
          onClick={send}
          disabled={busy}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium disabled:opacity-40"
        >
          Send
        </button>
      </div>
    </div>
  );
}

function buildSystemPrompt(
  fields: ProfileField[],
  links: ProfileLink[],
  sources: { name: string; enabled: number }[]
): string {
  const fieldLines = fields
    .map((f) => `- ${f.key}: ${f.value}`)
    .join("\n");
  const linkLines = links.map((l) => `- ${l.platform}: ${l.url}`).join("\n");
  const enabled = sources
    .filter((s) => s.enabled)
    .map((s) => s.name)
    .join(", ");
  return [
    "You are a personal research agent. The user profile below is permanent context; never ask for it again.",
    "",
    "USER PROFILE:",
    fieldLines || "(not set)",
    "",
    "PROFILE LINKS:",
    linkLines || "(none)",
    "",
    `ENABLED TREND SOURCES: ${enabled || "(none)"}`,
    "",
    "Tailor every answer to the user's fields, expertise level and goals. Be concrete and cite source URLs when you mention a talk, repo, paper or idea.",
  ].join("\n");
}

const FALLBACK_SYSTEM =
  "You are a personal research agent. Answer helpfully and concretely.";
