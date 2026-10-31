import { useEffect, useRef, useState } from "react";
import {
  createProfile,
  setField,
  addLink,
  platformFromUrl,
} from "../lib/profiles";
import { IcoSend } from "./icons";

type Message = { role: "agent" | "user"; content: string };

const QUESTIONS = [
  {
    key: "role",
    prompt: "First: what do you do? (e.g. student, researcher, developer, freelancer)",
  },
  {
    key: "fields",
    prompt:
      "What are your fields of study or interests? List them comma separated (e.g. machine learning, computer vision, robotics)",
  },
  {
    key: "expertise",
    prompt:
      "Describe your expertise — level and strong areas (e.g. 'beginner in ML, strong in Python and web dev')",
  },
  {
    key: "links",
    prompt:
      "Share your profile links, one per line (GitHub, Google Scholar, LinkedIn, X...). Type 'skip' if none.",
  },
  {
    key: "extra",
    prompt:
      "Anything else the agent should always remember about you? (goals, preferred content types...) Type 'skip' if none.",
  },
];

const ROLE_CHIPS = ["Student", "Researcher", "Developer", "Freelancer"];

export default function OnboardingChat({
  onDone,
}: {
  onDone: (profileId: number) => void;
}) {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "agent",
      content:
        "Hi! I'm your research agent. Let me learn who you are once, so you never have to repeat it. I'll ask 5 quick questions.",
    },
    { role: "agent", content: QUESTIONS[0].prompt },
  ]);
  const [step, setStep] = useState(0);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, busy, error]);

  async function submit(preset?: string) {
    const text = (preset ?? input).trim();
    if (!text || busy) return;
    setInput("");
    const key = QUESTIONS[step].key;
    const nextMessages: Message[] = [...messages, { role: "user", content: text }];
    const nextAnswers = { ...answers, [key]: text };

    if (step + 1 < QUESTIONS.length) {
      nextMessages.push({ role: "agent", content: QUESTIONS[step + 1].prompt });
      setMessages(nextMessages);
      setAnswers(nextAnswers);
      setStep(step + 1);
      return;
    }

    setMessages(nextMessages);
    setAnswers(nextAnswers);
    setBusy(true);
    setError(null);

    try {
      const profileId = await saveProfile(nextAnswers);
      setMessages((m) => [
        ...m,
        {
          role: "agent",
          content:
            "Profile saved. I'll use it to filter trends for you from now on. Taking you to your profile…",
        },
      ]);
      setTimeout(() => onDone(profileId), 1400);
    } catch (e) {
      setBusy(false);
      setError(
        "Save failed: " +
          (e instanceof Error ? e.message : String(e)) +
          " — check Settings/tabs; you can retry or continue without finishing now."
      );
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
      {/* progress tubes — exactly the design's segmented rope */}
      <div className="rise" style={{ display: "flex", gap: 10, alignItems: "center" }} aria-hidden="true">
        {QUESTIONS.map((q, i) => (
          <span
            key={q.key}
            style={{
              width: i === 0 ? 44 : 28,
              height: 6,
              borderRadius: 99,
              background: i <= step ? "var(--accent)" : "var(--line-2)",
              transition: "background .35s ease",
            }}
          />
        ))}
      </div>

      <div
        ref={scrollRef}
        style={{
          width: "100%",
          maxWidth: 620,
          marginTop: 48,
          flex: 1,
          overflowY: "auto",
          display: "flex",
          flexDirection: "column",
          gap: 14,
          paddingBottom: 12,
        }}
      >
        {messages.map((m, i) => (
          <div
            key={i}
            className="rise"
            style={{ animationDelay: `${Math.min(i * 0.12, 0.6)}s`, display: "flex", gap: 14, alignItems: m.role === "user" ? undefined : "flex-end" }}
          >
            {m.role === "agent" ? (
              <>
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
              </>
            ) : (
              <>
                <div style={{ width: 54, flex: "none" }} />
                <div className="bubble-user">{m.content}</div>
              </>
            )}
          </div>
        ))}

        {step === 0 && !busy && (
          <div className="rise" style={{ animationDelay: "1s", marginLeft: 54, display: "flex", flexWrap: "wrap", gap: 12, marginTop: 6 }}>
            {ROLE_CHIPS.map((c) => (
              <button key={c} className="chip" style={{ fontSize: 15 }} onClick={() => submit(c)}>
                {c}
              </button>
            ))}
          </div>
        )}

        {busy && (
          <div style={{ marginLeft: 54, display: "flex", gap: 6, padding: "10px 4px" }} className="typing" aria-label="Working">
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
          submit();
        }}
      >
        <label htmlFor="msg" style={{ position: "absolute", left: -9999 }}>
          Your answer
        </label>
        <input
          id="msg"
          placeholder={busy ? "Saving..." : "Type your answer"}
          value={input}
          disabled={busy}
          onChange={(e) => setInput(e.target.value)}
          autoFocus
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

function parseLinks(text: string): { platform: string; url: string }[] {
  const out: { platform: string; url: string }[] = [];
  for (const line of text.split(/[\n,;\s]+/)) {
    const t = line.trim();
    if (!t || /^skip$/i.test(t)) continue;
    const url = /^https?:\/\//i.test(t) ? t : `https://${t}`;
    out.push({ platform: platformFromUrl(url), url });
  }
  return out;
}

export async function saveProfile(a: Record<string, string>): Promise<number> {
  const baseName = (a.role || "My Profile").split(/[,.]/)[0].trim();
  const name = (baseName || "My Profile").slice(0, 40);
  const id = await createProfile(name);
  if (a.role) await setField(id, "role", a.role);
  if (a.fields) {
    await setField(id, "fields_of_study", a.fields);
    await setField(id, "interests", a.fields);
  }
  if (a.expertise) await setField(id, "expertise", a.expertise);
  if (a.extra && !/^skip$/i.test(a.extra)) await setField(id, "about", a.extra);

  if (a.links && !/^skip$/i.test(a.links)) {
    for (const l of parseLinks(a.links)) {
      await addLink(id, l.platform, l.url);
    }
  }
  return id;
}
