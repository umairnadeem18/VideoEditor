import { useEffect, useState } from "react";
import { listProfiles, type Profile } from "./lib/profiles";
import OnboardingChat from "./components/OnboardingChat";
import ProfileManager from "./components/ProfileManager";
import ChatPanel from "./components/ChatPanel";
import Settings from "./components/Settings";
import TrendPanel from "./components/TrendPanel";

type View = "chat" | "profiles" | "dashboard" | "settings";

export default function App() {
  const [view, setView] = useState<View>("chat");
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [activeId, setActiveId] = useState<number | null>(null);
  const [onboarding, setOnboarding] = useState(false);

  useEffect(() => {
    (async () => {
      const list = await listProfiles();
      setProfiles(list);
      if (list.length) {
        setActiveId(list[0].id);
      } else {
        setOnboarding(true);
      }
    })();
  }, []);

  function refreshProfiles() {
    listProfiles().then((list) => {
      setProfiles(list);
      if (list.length && activeId === null) setActiveId(list[0].id);
    });
  }

  const active = profiles.find((p) => p.id === activeId) ?? null;

  return (
    <div className="flex h-screen bg-slate-900 text-slate-100">
      <aside className="w-60 shrink-0 border-r border-slate-800 bg-slate-950 p-4">
        <h1 className="mb-4 text-lg font-semibold">Research Agent</h1>
        {active && (
          <div className="mb-4 rounded-lg bg-slate-800/60 p-2 text-xs">
            <div className="text-slate-500">Active profile</div>
            <div className="truncate font-medium text-blue-300">{active.name}</div>
          </div>
        )}
        <nav className="space-y-1 text-sm">
          {(
            [
              ["chat", "Chat"],
              ["profiles", "Profiles"],
              ["dashboard", "Dashboard"],
              ["settings", "Settings"],
            ] as [View, string][]
          ).map(([v, label]) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={`block w-full rounded-md px-3 py-2 text-left ${
                view === v && !onboarding
                  ? "bg-blue-600/20 text-blue-300"
                  : "text-slate-400 hover:bg-slate-800"
              }`}
            >
              {label}
            </button>
          ))}
        </nav>
      </aside>
      <main className="flex-1 overflow-hidden">
        {onboarding ? (
          <OnboardingChat
            onDone={(id) => {
              setActiveId(id);
              setOnboarding(false);
              setView("profiles");
              refreshProfiles();
            }}
          />
        ) : view === "profiles" ? (
          <ProfileManager
            activeId={activeId}
            onSelect={(id) => setActiveId(id)}
            onProfilesChanged={refreshProfiles}
            onRunOnboarding={() => {
              setOnboarding(true);
              setView("chat");
            }}
          />
        ) : view === "chat" ? (
          <ChatPanel activeId={activeId} />
        ) : view === "settings" ? (
          <Settings />
        ) : view === "dashboard" ? (
          <TrendPanel />
        ) : (
          <div className="flex h-full items-center justify-center">
            <div className="max-w-md rounded-xl bg-slate-800/60 p-6 text-sm text-slate-300">
              Trend dashboard lands in Phase 3-4 (GitHub / HN / arXiv connectors +
              agent pipeline).
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
