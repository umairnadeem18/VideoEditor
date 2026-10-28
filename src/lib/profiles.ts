import { getDb } from "./db";

export type Profile = {
  id: number;
  name: string;
  isDefault: number;
  createdAt: string;
};

export type ProfileField = {
  id: number;
  key: string;
  value: string;
};

export type ProfileLink = {
  id: number;
  platform: string;
  url: string;
};

export type ProfileSource = {
  id: number;
  name: string;
  enabled: number;
};

export const DEFAULT_SOURCES = [
  "github",
  "hackernews",
  "arxiv",
  "reddit",
  "youtube",
];

export async function listProfiles(): Promise<Profile[]> {
  const db = await getDb();
  const rows = await db.select<Profile[]>(
    "SELECT id, name, is_default AS isDefault, created_at AS createdAt FROM profiles ORDER BY id"
  );
  return rows;
}

export async function createProfile(name: string): Promise<number> {
  const db = await getDb();
  const res = await db.execute("INSERT INTO profiles (name) VALUES ($1)", [name]);
  let id = Number(res.lastInsertId);
  if (!Number.isFinite(id) || id <= 0) {
    const r = await db.select<{ id: number }[]>("SELECT MAX(id) AS id FROM profiles");
    id = Number(r?.[0]?.id ?? 0);
  }
  for (const s of DEFAULT_SOURCES) {
    await db.execute(
      "INSERT OR IGNORE INTO sources (profile_id, name, enabled) VALUES ($1, $2, 1)",
      [id, s]
    );
  }
  return id;
}

export async function deleteProfile(id: number): Promise<void> {
  const db = await getDb();
  await db.execute("PRAGMA foreign_keys = ON");
  await db.execute("DELETE FROM sources WHERE profile_id = $1", [id]);
  await db.execute("DELETE FROM profile_links WHERE profile_id = $1", [id]);
  await db.execute("DELETE FROM profile_fields WHERE profile_id = $1", [id]);
  await db.execute("DELETE FROM messages WHERE profile_id = $1", [id]);
  await db.execute("DELETE FROM profiles WHERE id = $1", [id]);
}

export async function getFields(profileId: number): Promise<ProfileField[]> {
  const db = await getDb();
  return db.select<ProfileField[]>(
    "SELECT id, key, value FROM profile_fields WHERE profile_id = $1 ORDER BY id",
    [profileId]
  );
}

export async function setField(profileId: number, key: string, value: string): Promise<void> {
  const db = await getDb();
  await db.execute(
    `INSERT INTO profile_fields (profile_id, key, value) VALUES ($1, $2, $3)
     ON CONFLICT(profile_id, key) DO UPDATE SET value = excluded.value`,
    [profileId, key, value]
  );
}

export async function deleteField(fieldId: number): Promise<void> {
  const db = await getDb();
  await db.execute("DELETE FROM profile_fields WHERE id = $1", [fieldId]);
}

export async function getLinks(profileId: number): Promise<ProfileLink[]> {
  const db = await getDb();
  return db.select<ProfileLink[]>(
    "SELECT id, platform, url FROM profile_links WHERE profile_id = $1 ORDER BY id",
    [profileId]
  );
}

export async function addLink(profileId: number, platform: string, url: string): Promise<void> {
  const db = await getDb();
  await db.execute(
    "INSERT OR IGNORE INTO profile_links (profile_id, platform, url) VALUES ($1, $2, $3)",
    [profileId, platform, url]
  );
}

export async function deleteLink(linkId: number): Promise<void> {
  const db = await getDb();
  await db.execute("DELETE FROM profile_links WHERE id = $1", [linkId]);
}

export async function getSources(profileId: number): Promise<ProfileSource[]> {
  const db = await getDb();
  return db.select<ProfileSource[]>(
    "SELECT id, name, enabled FROM sources WHERE profile_id = $1 ORDER BY id",
    [profileId]
  );
}

export async function toggleSource(sourceId: number, enabled: boolean): Promise<void> {
  const db = await getDb();
  await db.execute("UPDATE sources SET enabled = $1 WHERE id = $2", [enabled ? 1 : 0, sourceId]);
}

export function platformFromUrl(url: string): string {
  const u = url.replace(/^https?:\/\//, "");
  if (u.startsWith("github.com")) return "github";
  if (u.startsWith("scholar.google")) return "scholar";
  if (u.startsWith("linkedin.com") || u.startsWith("www.linkedin.com")) return "linkedin";
  if (u.includes("x.com") || u.includes("twitter.com")) return "x";
  if (u.startsWith("medium.com")) return "medium";
  if (u.startsWith("youtube.com")) return "youtube";
  return "web";
}
