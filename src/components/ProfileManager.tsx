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
  type Profile,
  type ProfileField,
  type ProfileLink,
  type ProfileSource,
} from "../lib/profiles";

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
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [selected, setSelected] = useState<number | null>(activeId);
  const [fields, setFields] = useState<ProfileField[]>([]);
  const [links, setLinks] = useState<ProfileLink[]>([]);
  const [sources, setSources] = useState<ProfileSource[]>([]);
  const [newName, setNewName] = useState("");
  const [editKey, setEditKey] = useState("");
  const [editValue, setEditValue] = useState("");
  const [linkUrl, setLinkUrl] = useState("");

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

  async function addProfile() {
    const name = newName.trim();
    if (!name) return;
    setNewName("");
    try {
      await createProfile(name);
      await refresh();
    } catch (e) {
      alert("Could not create profile: " + (e instanceof Error ? e.message : String(e)));
    }
  }

  return (
    <div className="flex h-full">
      <div className="w-64 shrink-0 border-r border-slate-800 p-4">
        <h2 className="mb-3 text-sm font-semibold text-slate-300">Profiles</h2>
        <div className="space-y-1">
          {profiles.map((p) => (
            <div key={p.id} className="flex items-center gap-1">
              <button
                onClick={() => setSelected(p.id)}
                className={`flex-1 truncate rounded-md px-3 py-2 text-left text-sm ${
                  selected === p.id
                    ? "bg-blue-600/20 text-blue-300"
                    : "text-slate-400 hover:bg-slate-800"
                }`}
              >
                {p.name}
                {activeId === p.id && (
                  <span className="ml-1 text-[10px] text-blue-400">• active</span>
                )}
              </button>
              <button
                title="Delete profile"
                onClick={async () => {
                  if (!confirm(`Delete profile "${p.name}"?`)) return;
                  await deleteProfile(p.id);
                  onProfilesChanged();
                  refresh();
                }}
                className="rounded px-2 py-1 text-slate-500 hover:bg-red-900/40 hover:text-red-300"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
        <div className="mt-4 flex gap-1">
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addProfile()}
            placeholder="New profile name"
            className="w-full rounded bg-slate-800 px-2 py-1.5 text-xs outline-none"
          />
          <button
            onClick={addProfile}
            className="rounded bg-blue-600 px-2 py-1.5 text-xs font-medium"
          >
            +
          </button>
        </div>
        <button
          onClick={onRunOnboarding}
          className="mt-6 w-full rounded-md bg-slate-800 px-3 py-2 text-xs text-slate-300 hover:bg-slate-700"
        >
          Run onboarding chat for a new profile
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        {selected === null ? (
          <p className="text-sm text-slate-500">No profiles yet.</p>
        ) : (
          <div className="mx-auto max-w-2xl space-y-6">
            <section>
              <h3 className="mb-2 text-sm font-semibold text-slate-300">Fields</h3>
              <div className="space-y-1">
                {fields.map((f) => (
                  <div
                    key={f.id}
                    className="flex items-start gap-2 rounded-lg bg-slate-800/60 p-2"
                  >
                    <span className="w-32 shrink-0 text-xs font-medium text-blue-300">
                      {f.key}
                    </span>
                    <span className="flex-1 text-xs text-slate-300">{f.value}</span>
                    <button
                      onClick={async () => {
                        await deleteField(f.id);
                        setFields(await getFields(selected));
                      }}
                      className="text-slate-500 hover:text-red-300"
                    >
                      ✕
                    </button>
                  </div>
                ))}
                {!fields.length && (
                  <p className="text-xs text-slate-500">No fields yet.</p>
                )}
              </div>
              <div className="mt-2 flex gap-1">
                <input
                  value={editKey}
                  onChange={(e) => setEditKey(e.target.value)}
                  placeholder="key (e.g. goals)"
                  className="w-36 rounded bg-slate-800 px-2 py-1.5 text-xs outline-none"
                />
                <input
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  placeholder="value"
                  className="flex-1 rounded bg-slate-800 px-2 py-1.5 text-xs outline-none"
                />
                <button
                  onClick={async () => {
                    const k = editKey.trim();
                    const v = editValue.trim();
                    if (!k || !v) return;
                    await setField(selected, k, v);
                    setEditKey("");
                    setEditValue("");
                    setFields(await getFields(selected));
                  }}
                  className="rounded bg-blue-600 px-3 py-1.5 text-xs"
                >
                  Add
                </button>
              </div>
            </section>

            <section>
              <h3 className="mb-2 text-sm font-semibold text-slate-300">Links</h3>
              <div className="space-y-1">
                {links.map((l) => (
                  <div
                    key={l.id}
                    className="flex items-center gap-2 rounded-lg bg-slate-800/60 p-2"
                  >
                    <span className="w-24 shrink-0 text-xs font-medium text-blue-300">
                      {l.platform}
                    </span>
                    <a
                      href={l.url}
                      className="flex-1 truncate text-xs text-slate-300 underline decoration-slate-600"
                    >
                      {l.url}
                    </a>
                    <button
                      onClick={async () => {
                        await deleteLink(l.id);
                        setLinks(await getLinks(selected));
                      }}
                      className="text-slate-500 hover:text-red-300"
                    >
                      ✕
                    </button>
                  </div>
                ))}
                {!links.length && (
                  <p className="text-xs text-slate-500">No links yet.</p>
                )}
              </div>
              <div className="mt-2 flex gap-1">
                <input
                  value={linkUrl}
                  onChange={(e) => setLinkUrl(e.target.value)}
                  placeholder="https://github.com/you"
                  className="flex-1 rounded bg-slate-800 px-2 py-1.5 text-xs outline-none"
                />
                <button
                  onClick={async () => {
                    const t = linkUrl.trim();
                    if (!t) return;
                    const url = /^https?:\/\//i.test(t) ? t : `https://${t}`;
                    await addLink(selected, platformFromUrl(url), url);
                    setLinkUrl("");
                    setLinks(await getLinks(selected));
                  }}
                  className="rounded bg-blue-600 px-3 py-1.5 text-xs"
                >
                  Add
                </button>
              </div>
            </section>

            <section>
              <h3 className="mb-2 text-sm font-semibold text-slate-300">
                Trend sources
              </h3>
              <div className="flex flex-wrap gap-2">
                {sources.map((s) => (
                  <button
                    key={s.id}
                    onClick={async () => {
                      await toggleSource(s.id, !s.enabled);
                      setSources(await getSources(selected));
                    }}
                    className={`rounded-full px-3 py-1 text-xs ${
                      s.enabled
                        ? "bg-blue-600/30 text-blue-200"
                        : "bg-slate-800 text-slate-500"
                    }`}
                  >
                    {s.name} {s.enabled ? "✓" : "✕"}
                  </button>
                ))}
              </div>
            </section>

            <button
              onClick={() => onSelect(selected)}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium"
            >
              Set as active profile
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
