import { useState } from "react";
import {
  createProfile,
  setField,
  addLink,
  platformFromUrl,
} from "../lib/profiles";

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

  async function submit() {
    const text = input.trim();
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
            "Profile saved. I'll use it to filter trends for you from now on. Check the Profiles tab anytime.",
        },
      ]);
      setTimeout(() => onDone(profileId), 1200);
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
    <div className="mx-auto flex h-full w-full max-w-2xl flex-col p-6">
      <div className="mb-3 flex items-center gap-2 text-xs text-slate-400">
        {QUESTIONS.map((q, i) => (
          <span
            key={q.key}
            className={`h-1.5 w-8 rounded-full ${
              i < step ? "bg-blue-500" : i === step ? "bg-blue-400" : "bg-slate-700"
            }`}
          />
        ))}
        <span>
          Question {Math.min(step + 1, QUESTIONS.length)} of {QUESTIONS.length}
        </span>
      </div>
      <div className="flex-1 space-y-3 overflow-y-auto pr-1">
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
          <div className="mr-auto rounded-xl bg-blue-900/40 p-3 text-sm text-slate-300">
            Saving your profile...
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
          placeholder={
            busy ? "Saving..." : "Type your answer... (Enter to send)"
          }
          value={input}
          disabled={busy}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && submit()}
          autoFocus
        />
        <button
          onClick={submit}
          disabled={busy}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium disabled:opacity-40"
        >
          Send
        </button>
      </div>
    </div>
  );
}

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
