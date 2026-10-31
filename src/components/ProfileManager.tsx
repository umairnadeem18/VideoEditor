import { useEffect, useState } from "react";
import {
  listProfiles,
  createProfile,
  deleteProfile,
  getFields,
  getLinks,
  getSources,
  setField,
  addLink,
  deleteField,
  deleteLink,
  toggleSource,
  platformFromUrl,
  type ProfileField,
  type ProfileLink,
  type ProfileSource,
} from "../lib/profiles";
import { IcoPlus, IcoRefresh } from "./icons";

const INVALID_KEYS = new Set(["interests", "fields_of_study", "about", "role"]);

const CHIP_TONES = [
  { bg: "var(--accent-soft)", color: "var(--accent)" },
  { bg: "var(--peach-soft)", color: "#F0A090" },
  { bg: "var(--mint-soft)", color: "var(--mint)" },
];

export default function ProfileManager({
  activeId,
  onSelect,
  onProfilesChanged,
  onRunOnboarding,
}: {
  activeId: number | null;
  onSelect: (id: number) => void;
  onProfilesChanged: () => void;
  onRunOnboarding: () => void;
}) {
  const [profiles, setProfiles] = useState<{ id: number; name: string }[]>([]);
  const [selected, setSelected] = useState<number | null>(activeId);
  const [fields, setFields] = useState<ProfileField[]>([]);
  const [links, setLinks] = useState<ProfileLink[]>([]);
  const [sources, setSources] = useState<ProfileSource[]>([]);
  const [newName, setNewName] = useState("");
  const [addingProfile, setAddingProfile] = useState(false);
  const [editKey, setEditKey] = useState("");
  const [editValue, setEditValue] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const [addingInterest, setAddingInterest] = useState(false);
  const [interestDraft, setInterestDraft] = useState("");
  const [openSection, setOpenSection] = useState<"details" | "links" | "sources" | null>(null);

  async function refresh() {
    const list = await listProfiles();
    setProfiles(list);
    if (!list.length) {
      setSelected(null);
      return;
    }
    if (selected === null || !list.some((p) => p.id === selected)) {
      setSelected(list[0].id);
    }
  }

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (selected === null) return;
    (async () => {
      setFields(await getFields(selected));
      setLinks(await getLinks(selected));
      setSources(await getSources(selected));
    })();
  }, [selected]);

  const role = fields.find((f) => f.key === "role")?.value;
  const interests = fields
    .filter((f) => f.key === "interests" || f.key === "fields_of_study")
    .flatMap((f) => f.value.split(/[,;]+/).map((s) => s.trim()))
    .filter(Boolean);
  const details = fields.filter((f) => !INVALID_KEYS.has(f.key) && f.value.trim());
  const sel = profiles.find((p) => p.id === selected);

  async function addInterest() {
    const t = interestDraft.trim();
    if (!t || selected === null) return;
    const existing = fields.find((f) => f.key === "interests")?.value ?? "";
    await setField(selected, "interests", existing ? `${existing}, ${t}` : t);
    setInterestDraft("");
    setAddingInterest(false);
    setFields(await getFields(selected));
  }

  async function addDetail() {
    const k = editKey.trim();
    const v = editValue.trim();
    if (!k || !v || selected === null) return;
    await setField(selected, k, v);
    setEditKey("");
    setEditValue("");
    setFields(await getFields(selected));
  }

  async function addLinkRow() {
    const t = linkUrl.trim();
    if (!t || selected === null) return;
    const url = /^https?:\/\//i.test(t) ? t : `https://${t}`;
    await addLink(selected, platformFromUrl(url), url);
    setLinkUrl("");
    setLinks(await getLinks(selected));
  }

  async function addProfileRow() {
    const name = newName.trim();
    if (!name) return;
    setNewName("");
    setAddingProfile(false);
    try {
      await createProfile(name);
      await refresh();
      onProfilesChanged();
    } catch (e) {
      alert("Could not create profile: " + (e instanceof Error ? e.message : String(e)));
    }
  }

  function Section({
    id,
    label,
    count,
    children,
  }: {
    id: "details" | "links" | "sources";
    label: string;
    count: number;
    children: React.ReactNode;
  }) {
    const open = openSection === id;
    return (
      <div style={{ width: "100%", maxWidth: 620, marginTop: 10 }}>
        <button
          className="chip"
          style={{ width: "100%", justifyContent: "space-between", background: open ? "var(--hover)" : "var(--card)" }}
          onClick={() => setOpenSection(open ? null : id)}
        >
          <span style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span className="dot" style={{ background: "var(--accent)" }} />
            {label}
          </span>
          <span className="meta" style={{ fontSize: 13 }}>
            {count} · {open ? "−" : "+"}
          </span>
        </button>
        <div className={`expand${open ? " open" : ""}`}>
          <div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10, padding: "14px 4px" }}>{children}</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        width: "100%",
        height: "100%",
        overflowY: "auto",
      }}
    >
      {/* profile switcher */}
      <div className="rise" style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center", justifyContent: "center" }}>
        {profiles.map((p) => (
          <button
            key={p.id}
            className="chip"
            style={{
              padding: "8px 18px",
              minHeight: 38,
              fontSize: 14,
              background: selected === p.id ? "var(--hover)" : "var(--card)",
              color: selected === p.id ? "var(--text)" : "var(--muted)",
            }}
            onClick={() => setSelected(p.id)}
            title={activeId === p.id ? "Active profile" : undefined}
          >
            {activeId === p.id && <span className="dot" style={{ background: "var(--mint)" }} />}
            {p.name}
            <span
              title="Delete profile"
              role="button"
              onClick={async (e) => {
                e.stopPropagation();
                if (!confirm(`Delete profile "${p.name}"?`)) return;
                await deleteProfile(p.id);
                onProfilesChanged();
                refresh();
              }}
              style={{ color: "inherit", opacity: 0.55, fontSize: 12 }}
            >
              ✕
            </span>
          </button>
        ))}
        {addingProfile ? (
          <input
            autoFocus
            className="text-input"
            style={{ width: 180 }}
            placeholder="Profile name…"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onBlur={() => setAddingProfile(false)}
            onKeyDown={(e) => {
              if (e.key === "Enter") addProfileRow();
              if (e.key === "Escape") setAddingProfile(false);
            }}
          />
        ) : (
          <button
            onClick={() => setAddingProfile(true)}
            aria-label="Add profile"
            title="Add profile"
            style={{
              width: 38,
              height: 38,
              borderRadius: "50%",
              border: "1.5px dashed #6A5F51",
              background: "transparent",
              color: "var(--muted)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <IcoPlus size={16} />
          </button>
        )}
      </div>

      {selected === null ? (
        <p className="rise meta" style={{ marginTop: 48 }}>
          No profiles yet — take the questions below.
        </p>
      ) : (
        <>
          {/* the scene: ripple rings + breathing persona */}
          <div className="rise" style={{ marginTop: 36, position: "relative", width: 150, height: 150, flex: "none" }}>
            <div className="ring" style={{ borderColor: "var(--accent)", width: 150, height: 150, margin: "-75px 0 0 -75px" }} />
            <div className="ring" style={{ borderColor: "var(--accent)", width: 150, height: 150, margin: "-75px 0 0 -75px", animationDelay: "-3.7s" }} />
            <div
              style={{
                position: "absolute",
                inset: 11,
                borderRadius: "50%",
                background: "var(--accent)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                animation: "breathe 5s ease-in-out infinite",
              }}
            >
              <svg width="52" height="52" viewBox="0 0 24 24" fill="none" stroke="var(--on-accent)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <circle cx="12" cy="8" r="4" />
                <path d="M4 21c0-4 4-6 8-6s8 2 8 6" />
              </svg>
            </div>
          </div>

          <h1 className="rise ser" style={{ animationDelay: "0.2s", margin: "28px 0 0", fontWeight: 400, fontSize: 46, overflowWrap: "anywhere", textAlign: "center" }}>
            {sel?.name ?? "[Your name]"}
          </h1>
          <p className="rise meta" style={{ animationDelay: "0.3s", margin: "8px 0 0", fontSize: 17 }}>
            {role ?? "[Your role]"}
          </p>
          {activeId !== selected && (
            <button
              className="rise chip"
              style={{ animationDelay: "0.35s", marginTop: 16, padding: "8px 18px", minHeight: 38, fontSize: 13, color: "var(--accent)", background: "transparent" }}
              onClick={() => onSelect(selected)}
            >
              Set as active profile
            </button>
          )}

          {/* floating interest chips */}
          <div style={{ marginTop: 40, maxWidth: 620, display: "flex", flexWrap: "wrap", justifyContent: "center", gap: 16 }}>
            {interests.map((it, i) => {
              const tone = CHIP_TONES[i % 3];
              return (
                <div key={`${it}-${i}`} className="rise" style={{ animationDelay: `${0.5 + i * 0.1}s` }}>
                  <div
                    style={{
                      animation: "float 6s ease-in-out infinite",
                      animationDelay: `${(-(i % 3) * 2).toFixed(0)}s`,
                      background: tone.bg,
                      color: tone.color,
                      borderRadius: 999,
                      padding: "13px 26px",
                      fontSize: 16,
                    }}
                  >
                    {it}
                  </div>
                </div>
              );
            })}
            {addingInterest ? (
              <div className="rise">
                <input
                  autoFocus
                  className="text-input"
                  placeholder="New interest…"
                  value={interestDraft}
                  onChange={(e) => setInterestDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") addInterest();
                    if (e.key === "Escape") setAddingInterest(false);
                  }}
                  onBlur={() => setAddingInterest(false)}
                  style={{ borderRadius: 999, width: 150, background: "var(--hover)" }}
                />
              </div>
            ) : (
              <div className="rise" style={{ animationDelay: `${0.5 + interests.length * 0.1}s` }}>
                <button
                  aria-label="Add interest"
                  onClick={() => setAddingInterest(true)}
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: "50%",
                    border: "1.5px dashed #6A5F51",
                    background: "transparent",
                    color: "var(--muted)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <IcoPlus size={18} />
                </button>
              </div>
            )}
          </div>

          <Section id="details" label="Details" count={details.length}>
            {details.map((f) => (
              <div key={f.id} className="row" style={{ fontSize: 14 }}>
                <span className="ser" style={{ color: "var(--accent)", minWidth: 96 }}>
                  {f.key}
                </span>
                <span className="meta" style={{ flex: 1, fontSize: 13 }}>
                  {f.value}
                </span>
                <button
                  onClick={async () => {
                    await deleteField(f.id);
                    setFields(await getFields(selected!));
                  }}
                  style={{ background: "transparent", border: 0, color: "var(--muted)" }}
                  title="Delete"
                >
                  ✕
                </button>
              </div>
            ))}
            {!details.length && <p className="meta" style={{ fontSize: 13, margin: 0 }}>No other details yet.</p>}
            <div style={{ display: "flex", gap: 8 }}>
              <input className="text-input" style={{ width: 140 }} placeholder="key (e.g. goals)" value={editKey} onChange={(e) => setEditKey(e.target.value)} />
              <input className="text-input" style={{ flex: 1 }} placeholder="value" value={editValue} onChange={(e) => setEditValue(e.target.value)} />
              <button className="chip" style={{ minHeight: 44, padding: "0 20px", color: "var(--accent)", background: "transparent" }} onClick={addDetail}>
                Add
              </button>
            </div>
          </Section>

          <Section id="links" label="Links" count={links.length}>
            {links.map((l) => (
              <div key={l.id} className="row" style={{ fontSize: 14 }}>
                <span className="ser" style={{ color: "var(--accent)", minWidth: 96 }}>
                  {l.platform}
                </span>
                <a href={l.url} className="meta" style={{ flex: 1, fontSize: 13, textDecoration: "underline" }}>
                  {l.url}
                </a>
                <button
                  onClick={async () => {
                    await deleteLink(l.id);
                    setLinks(await getLinks(selected!));
                  }}
                  style={{ background: "transparent", border: 0, color: "var(--muted)" }}
                  title="Delete"
                >
                  ✕
                </button>
              </div>
            ))}
            {!links.length && <p className="meta" style={{ fontSize: 13, margin: 0 }}>No links yet.</p>}
            <div style={{ display: "flex", gap: 8 }}>
              <input className="text-input" style={{ flex: 1 }} placeholder="https://github.com/you" value={linkUrl} onChange={(e) => setLinkUrl(e.target.value)} />
              <button className="chip" style={{ minHeight: 44, padding: "0 20px", color: "var(--accent)", background: "transparent" }} onClick={addLinkRow}>
                Add
              </button>
            </div>
          </Section>

          <Section id="sources" label="Trend sources" count={sources.filter((s) => s.enabled).length}>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
              {sources.map((s) => (
                <button
                  key={s.id}
                  className="chip"
                  style={{
                    fontSize: 14,
                    minHeight: 40,
                    color: s.enabled ? "var(--accent)" : "var(--muted)",
                    borderColor: s.enabled ? "var(--chip-line)" : "var(--line-2)",
                  }}
                  onClick={async () => {
                    await toggleSource(s.id, !s.enabled);
                    setSources(await getSources(selected!));
                  }}
                >
                  <span className="dot" style={{ background: s.enabled ? "var(--mint)" : "#5a5347", animationDelay: `${-s.id}s` }} />
                  {s.name}
                </button>
              ))}
            </div>
          </Section>

          {/* bottom action chips */}
          <div style={{ marginTop: "auto", paddingTop: 28, display: "flex", gap: 12 }}>
            <button className="chip rise" style={{ animationDelay: "1.3s", background: "transparent" }} onClick={onRunOnboarding}>
              <IcoRefresh size={16} />
              Retake the questions
            </button>
          </div>
        </>
      )}

      {selected === null && (
        <button className="chip rise" style={{ marginTop: "auto", marginBottom: 20 }} onClick={onRunOnboarding}>
          <span className="dot" style={{ background: "var(--accent)" }} />
          Start the questions
        </button>
      )}
    </div>
  );
}
