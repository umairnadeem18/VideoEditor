import { useState } from "react";

type Message = { role: "user" | "agent"; content: string };

export default function App() {
  const [messages] = useState<Message[]>([
    {
      role: "agent",
      content:
        "Hi! I'm your research agent. Phase 0 shell - chat, profiles and trend discovery coming in next phases.",
    },
  ]);

  return (
    <div className="flex h-screen bg-slate-900 text-slate-100">
      <aside className="w-60 shrink-0 border-r border-slate-800 bg-slate-950 p-4">
        <h1 className="mb-4 text-lg font-semibold">Research Agent</h1>
        <nav className="space-y-1 text-sm">
          <button className="block w-full rounded-md bg-blue-600/20 px-3 py-2 text-left text-blue-300">
            Chat
          </button>
          <button className="block w-full rounded-md px-3 py-2 text-slate-400 hover:bg-slate-800">
            Profiles
          </button>
          <button className="block w-full rounded-md px-3 py-2 text-slate-400 hover:bg-slate-800">
            Dashboard
          </button>
        </nav>
      </aside>
      <main className="flex flex-1 flex-col">
        <div className="flex-1 space-y-3 overflow-y-auto p-6">
          {messages.map((m, i) => (
            <div
              key={i}
              className={
                m.role === "user"
                  ? "self-end rounded-xl bg-slate-800 p-3"
                  : "self-start rounded-xl bg-blue-900/40 p-3"
              }
            >
              <p className="max-w-xl whitespace-pre-wrap text-sm">{m.content}</p>
            </div>
          ))}
        </div>
        <div className="border-t border-slate-800 p-4">
          <input
            className="w-full rounded-lg bg-slate-800 px-4 py-2 text-sm outline-none placeholder:text-slate-500"
            placeholder="Ask about trending ideas in your field..."
            disabled
          />
        </div>
      </main>
    </div>
  );
}
