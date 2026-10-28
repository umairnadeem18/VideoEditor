import { invoke } from "@tauri-apps/api/core";
import { fetch } from "@tauri-apps/plugin-http";

export type TrendItem = {
  source: string;
  title: string;
  url: string;
  score: number;
  date: string;
  extra: string;
};

export type SourceId = "github" | "hackernews" | "arxiv";

export async function getSecret(name: string): Promise<string | null> {
  try {
    return await invoke<string | null>("get_api_key", { provider: name });
  } catch {
    return null;
  }
}

export async function saveSecret(name: string, value: string): Promise<void> {
  await invoke("save_api_key", { provider: name, key: value });
}

export async function deleteSecret(name: string): Promise<void> {
  await invoke("delete_api_key", { provider: name });
}

export async function httpGetJson<T>(url: string, headers: Record<string, string> = {}): Promise<T> {
  const res = await fetch(url, { headers });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`${res.status}: ${t.slice(0, 200)}`);
  }
  return res.json() as Promise<T>;
}

export function daysAgoIso(days: number): string {
  return new Date(Date.now() - days * 86400000).toISOString().slice(0, 10);
}
