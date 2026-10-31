import { useState } from "react";
import type { View } from "../App";
import { IcoLogo, IcoRefresh, IcoSend } from "./icons";

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning.";
  if (h < 18) return "Good afternoon.";
  return "Good evening.";
}

const ORBIT_CHIPS: { label: string; target: View; color: string; left: string; top: string; delay: string }[] = [
  { label: "Trends", target: "dashboard", color: "var(--peach)", left: "50%", top: "8.7%", delay: "0s" },
  { label: "Ideas", target: "chat", color: "var(--mint)", left: "85.8%", top: "70.7%", delay: "-1s" },
  { label: "Debates", target: "chat", color: "var(--accent)", left: "14.2%", top: "70.7%", delay: "-2s" },
];

export default function Home({
  activeName,
  onRefresh,
  onNav,
  onAsk,
}: {
  activeName: string | null;
  onRefresh: () => void;
  onNav: (v: View) => void;
  onAsk: (text: string) => void;
}) {
  const [ask, setAsk] = useState("");

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: "100%", height: "100%" }}>
      <div style={{ alignSelf: "flex-end" }}>
        <button
          className="rise"
          aria-label="Refresh"
          title="Refresh"
          onClick={onRefresh}
          style={{
            animationDelay: "0.9s",
            width: 44,
            height: 44,
            borderRadius: "50%",
            border: "1px solid var(--line-2)",
            background: "transparent",
            color: "var(--muted)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <IcoRefresh />
        </button>
      </div>

      <div style={{ textAlign: "center", marginTop: -8 }}>
        <h1 className="rise ser" style={{ margin: 0, fontWeight: 400, fontSize: 54, letterSpacing: "-0.01em" }}>
          {greeting()}
        </h1>
        <p className="rise" style={{ margin: "10px 0 0", color: "var(--muted)", fontSize: 17, animationDelay: "0.2s" }}>
          {activeName ? "Ready when you are." : "Let's get to know you first."}
        </p>
      </div>

      <div
        className="rise"
        style={{
          animationDelay: "0.4s",
          position: "relative",
          width: 460,
          height: 460,
          flex: "none",
          margin: "auto 0",
          transform: "scale(min(1, max(0.6, calc((100vh - 400px) / 460))))",
        }}
      >
        <div
          style={{
            position: "absolute",
            left: "50%",
            top: "50%",
            width: 380,
            height: 380,
            margin: "-190px 0 0 -190px",
            borderRadius: "50%",
            border: "1px dashed var(--line-2)",
          }}
        />
        <div className="ring" style={{ borderColor: "var(--accent)", width: 220, height: 220, margin: "-110px 0 0 -110px" }} />
        <div className="ring" style={{ borderColor: "var(--accent)", width: 220, height: 220, margin: "-110px 0 0 -110px", animationDelay: "-2.5s" }} />
        <div className="ring" style={{ borderColor: "var(--accent)", width: 220, height: 220, margin: "-110px 0 0 -110px", animationDelay: "-5s" }} />

        <div
          style={{
            position: "absolute",
            left: "50%",
            top: "50%",
            width: 112,
            height: 112,
            margin: "-56px 0 0 -56px",
            borderRadius: "50%",
            background: "var(--accent)",
            boxShadow: "0 0 70px var(--glow)",
            animation: "breathe 5s ease-in-out infinite",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <IcoLogo size={38} />
        </div>

        <div className="orbit">
          {ORBIT_CHIPS.map((c) => (
            <div key={c.label} className="slot" style={{ left: c.left, top: c.top }}>
              <div className="counter">
                <button
                  className="chip"
                  style={{ fontSize: 15 }}
                  title={c.label}
                  onClick={() => onNav(c.target)}
                >
                  <span className="dot" style={{ background: c.color, animationDelay: c.delay }} />
                  {c.label}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <form
        className="rise bar"
        style={{ animationDelay: "0.7s", width: "100%", maxWidth: 560 }}
        onSubmit={(e) => {
          e.preventDefault();
          const t = ask.trim();
          if (t) {
            onAsk(t);
            setAsk("");
          }
        }}
      >
        <label htmlFor="ask" style={{ position: "absolute", left: -9999 }}>
          Ask anything
        </label>
        <input
          id="ask"
          placeholder="Ask anything"
          value={ask}
          onChange={(e) => setAsk(e.target.value)}
          style={{ flex: 1 }}
        />
        <button className="send" aria-label="Send" style={sendStyle}>
          <IcoSend />
        </button>
      </form>
    </div>
  );
}

const sendStyle: React.CSSProperties = {
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
