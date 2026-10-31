import { useEffect, useState } from "react";
import { listProfiles, type Profile } from "./lib/profiles";
import Rail from "./components/Rail";
import Home from "./components/Home";
import OnboardingChat from "./components/OnboardingChat";
import ProfileManager from "./components/ProfileManager";
import ChatPanel from "./components/ChatPanel";
import Settings from "./components/Settings";
import TrendPanel from "./components/TrendPanel";

export type View = "home" | "chat" | "profiles" | "dashboard" | "settings";

export default function App() {
  const [view, setView] = useState<View>("home");
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [activeId, setActiveId] = useState<number | null>(null);
  const [onboarding, setOnboarding] = useState(false);
  const [pendingPrompt, setPendingPrompt] = useState<string | null>(null);
  const [accent, setAccent] = useState<"apricot" | "terracotta" | "sage">(() => {
    const v = localStorage.getItem("ra.accent");
    return v === "terracotta" || v === "sage" ? v : "apricot";
  });

  useEffect(() => {
    localStorage.setItem("ra.accent", accent);
  }, [accent]);

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
    return listProfiles().then((list) => {
      setProfiles(list);
      if (list.length && activeId === null) setActiveId(list[0].id);
    });
  }

  function nav(v: View) {
    if (v !== "chat") setOnboarding(false);
    setView(v);
  }

  function ask(text?: string) {
    if (text) setPendingPrompt(text);
    setView("chat");
  }

  const active = profiles.find((p) => p.id === activeId) ?? null;

  return (
    <div
      data-accent={accent}
      style={{
        display: "grid",
        gridTemplateColumns: "84px 1fr",
        height: "100vh",
        background: "var(--ink)",
        color: "var(--text)",
        fontFamily: "'DM Sans', system-ui, sans-serif",
      }}
    >
      <Rail view={view} onNav={nav} />

      <main
        style={{
          padding: "36px 48px 40px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          boxSizing: "border-box",
          minWidth: 0,
          overflow: "hidden",
          position: "relative",
        }}
      >
        {onboarding && view === "chat" ? (
          <OnboardingChat
            onDone={(id) => {
              setActiveId(id);
              setOnboarding(false);
              setView("profiles");
              refreshProfiles();
            }}
          />
        ) : view === "chat" ? (
          <ChatPanel
            activeId={activeId}
            pendingPrompt={pendingPrompt}
            onPromptConsumed={() => setPendingPrompt(null)}
          />
        ) : view === "settings" ? (
          <Settings accent={accent} onAccent={setAccent} />
        ) : view === "dashboard" ? (
          <TrendPanel />
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
        ) : (
          <Home activeName={active?.name ?? null} onRefresh={refreshProfiles} onNav={nav} onAsk={ask} />
        )}
      </main>
    </div>
  );
}
