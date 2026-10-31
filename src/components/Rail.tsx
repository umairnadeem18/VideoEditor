import type { View } from "../App";
import { IcoLogo, IcoHome, IcoChat, IcoProfiles, IcoDashboard, IcoSettings } from "./icons";

const ITEMS: { view: View; label: string; node: React.ReactNode }[] = [
  { view: "home", label: "Home", node: <IcoHome /> },
  { view: "chat", label: "Chat", node: <IcoChat /> },
  { view: "profiles", label: "Profiles", node: <IcoProfiles /> },
  { view: "dashboard", label: "Dashboard", node: <IcoDashboard /> },
];

export default function Rail({ view, onNav }: { view: View; onNav: (v: View) => void }) {
  return (
    <aside
      className="rail"
      style={{
        borderRight: "1px solid var(--line)",
        padding: "28px 0",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 10,
        boxSizing: "border-box",
      }}
    >
      <div
        style={{
          width: 40,
          height: 40,
          borderRadius: 12,
          background: "var(--accent)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          marginBottom: 28,
        }}
      >
        <IcoLogo color="var(--on-accent)" />
      </div>

      {ITEMS.map((it) => {
        const active = view === it.view;
        const cls = active ? "rise" : undefined;
        return (
          <a
            key={it.view}
            className={cls}
            aria-label={it.label}
            title={it.label}
            onClick={() => onNav(it.view)}
            style={active ? { background: "var(--hover)", color: "var(--accent)" } : undefined}
          >
            {it.node}
          </a>
        );
      })}

      <a
        aria-label="Settings"
        title="Settings"
        onClick={() => onNav("settings")}
        style={{
          marginTop: "auto",
          ...(view === "settings" ? { background: "var(--hover)", color: "var(--accent)" } : {}),
        }}
      >
        <IcoSettings />
      </a>
    </aside>
  );
}
