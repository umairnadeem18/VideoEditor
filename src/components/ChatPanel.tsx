import { useEffect, useRef, useState } from "react";
import { getDb } from "../lib/db";
import { buildProfileContext, FALLBACK_SYSTEM } from "../lib/profileContext";
import {
  PROVIDERS,
  chat,
  chatWithFallback,
  getApiKey,
  type ChatMsg,
  type ProviderId,
} from "../lib/llm";
import { IcoSend } from "./icons";

type Message = { role: "user" | "agent"; content: string };

export default function ChatPanel({
  activeId,
  pendingPrompt,
  onPromptConsumed,
}: {
  activeId: number | null;
  pendingPrompt: string | null;
  onPromptConsumed: () => void;
}) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [provider, setProvider] = useState<ProviderId>("groq");
  const [model, setModel] = useState(PROVIDERS.groq.models[0]);
  const [error, setError] = useState<string | null>(null);
  const [systemPrompt, setSystemPrompt] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (activeId === null) return;
    (async () => {
      setSystemPrompt(await buildProfileContext(activeId));
      const db = await getDb();
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
    if (pendingPrompt === null) return;
    setInput(pendingPrompt);
    onPromptConsumed();
    inputRef.current?.focus();
  }, [pendingPrompt, onPromptConsumed]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
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
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        width: "100%",
        height: "100%",
      }}
    >
      {/* header: model chips, mirroring the design's muted top area */}
      <div className="rise" style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap", justifyContent: "center" }}>
        <span className="dot" style={{ background: "var(--accent)" }} />
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
        <select
          className="select"
          value={model}
          onChange={(e) => setModel(e.target.value)}
        >
          {PROVIDERS[provider].models.map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </select>
        {activeId === null && (
          <span className="pill" style={{ background: "var(--peach-soft)", color: "#F0A090" }}>
            no active profile
          </span>
        )}
      </div>

      <div
        ref={scrollRef}
        style={{
          width: "100%",
          maxWidth: 620,
          marginTop: 40,
          flex: 1,
          overflowY: "auto",
          display: "flex",
          flexDirection: "column",
          gap: 14,
          paddingBottom: 12,
        }}
      >
        {messages.length === 0 && !busy && (
          <div className="rise" style={{ display: "flex", gap: 14, alignItems: "flex-end", marginTop: 24 }}>
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: "50%",
                background: "var(--accent)",
                animation: "breathe 5s ease-in-out infinite",
                flex: "none",
              }}
            />
            <div className="bubble-agent ser" style={{ fontSize: 26, lineHeight: 1.25 }}>
              Hello. Let's talk research.
            </div>
          </div>
        )}

        {messages.map((m, i) =>
          m.role === "agent" ? (
            <div key={i} className="rise" style={{ display: "flex", gap: 14, alignItems: "flex-end" }}>
              <div
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: "50%",
                  background: "var(--accent)",
                  animation: "breathe 5s ease-in-out infinite",
                  flex: "none",
                }}
              />
              <div className="bubble-agent">{m.content}</div>
            </div>
          ) : (
            <div key={i} className="rise">
              <div className="bubble-user">{m.content}</div>
            </div>
          )
        )}

        {busy && (
          <div style={{ marginLeft: 54, display: "flex", gap: 6, padding: "10px 4px" }} className="typing" aria-label="Thinking">
            <span style={{ animationDelay: "0s" }} />
            <span style={{ animationDelay: "0.2s" }} />
            <span style={{ animationDelay: "0.4s" }} />
          </div>
        )}

        {error && (
          <div
            className="rise"
            style={{
              background: "var(--peach-soft)",
              color: "#F0A090",
              border: "1px solid var(--chip-line)",
              borderRadius: 18,
              padding: "12px 20px",
              fontSize: 13,
              whiteSpace: "pre-wrap",
            }}
          >
            {error}
          </div>
        )}
      </div>

      <form
        className="rise bar"
        style={{ animationDelay: "0.7s", width: "100%", maxWidth: 620, flex: "none" }}
        onSubmit={(e) => {
          e.preventDefault();
          send();
        }}
      >
        <label htmlFor="msg" style={{ position: "absolute", left: -9999 }}>
          Your answer
        </label>
        <input
          id="msg"
          ref={inputRef}
          placeholder={busy ? "Waiting for reply..." : "Type your answer"}
          value={input}
          disabled={busy}
          onChange={(e) => setInput(e.target.value)}
        />
        <button className="send" aria-label="Send" disabled={busy} style={{ ...sendBtn, opacity: busy ? 0.4 : 1 }}>
          <IcoSend />
        </button>
      </form>
    </div>
  );
}

const sendBtn: React.CSSProperties = {
  width: 44,
  height: 44,
  borderRadius: "50%",
  border: 0,
  background: "var(--peach)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  flex: "none",
};
