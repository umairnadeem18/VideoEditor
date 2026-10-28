import { invoke } from "@tauri-apps/api/core";
import { fetch } from "@tauri-apps/plugin-http";

export type ProviderId = "groq" | "gemini" | "openrouter" | "ollama";

export type ChatMsg = { role: "system" | "user" | "assistant"; content: string };

export const PROVIDERS: Record<
  ProviderId,
  { label: string; models: string[]; needsKey: boolean }
> = {
  groq: {
    label: "Groq (free tier)",
    models: ["llama-3.3-70b-versatile", "llama-3.1-8b-instant"],
    needsKey: true,
  },
  openrouter: {
    label: "OpenRouter (free models)",
    models: [
      "meta-llama/llama-3.3-70b-instruct:free",
      "google/gemma-2-9b-it:free",
    ],
    needsKey: true,
  },
  gemini: {
    label: "Gemini (free tier)",
    models: ["gemini-2.0-flash", "gemini-1.5-flash"],
    needsKey: true,
  },
  ollama: {
    label: "Ollama (local, optional)",
    models: ["llama3.2", "qwen2.5"],
    needsKey: false,
  },
};

export const CLOUD_ORDER: ProviderId[] = ["groq", "gemini", "openrouter"];

export async function getApiKey(provider: string): Promise<string | null> {
  try {
    return await invoke<string | null>("get_api_key", { provider });
  } catch {
    return null;
  }
}

export async function saveApiKey(provider: string, key: string): Promise<void> {
  await invoke("save_api_key", { provider, key });
}

export async function deleteApiKey(provider: string): Promise<void> {
  await invoke("delete_api_key", { provider });
}

async function openAiFormat(
  url: string,
  key: string,
  model: string,
  msgs: ChatMsg[],
  extraHeaders: Record<string, string> = {}
): Promise<string> {
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${key}`,
      ...extraHeaders,
    },
    body: JSON.stringify({ model, messages: msgs, temperature: 0.4 }),
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`${res.status}: ${t.slice(0, 300)}`);
  }
  const data = await res.json();
  const content = data?.choices?.[0]?.message?.content;
  if (!content) throw new Error("Empty response from provider");
  return content as string;
}

async function callGroq(model: string, msgs: ChatMsg[]): Promise<string> {
  const key = await getApiKey("groq");
  if (!key) throw new Error("No Groq API key set - add it in Settings");
  return openAiFormat("https://api.groq.com/openai/v1/chat/completions", key, model, msgs);
}

async function callOpenRouter(model: string, msgs: ChatMsg[]): Promise<string> {
  const key = await getApiKey("openrouter");
  if (!key) throw new Error("No OpenRouter API key set - add it in Settings");
  return openAiFormat("https://openrouter.ai/api/v1/chat/completions", key, model, msgs);
}

async function callGemini(model: string, msgs: ChatMsg[]): Promise<string> {
  const key = await getApiKey("gemini");
  if (!key) throw new Error("No Gemini API key set - add it in Settings");
  const system = msgs.filter((m) => m.role === "system").map((m) => m.content).join("\n\n");
  const contents = msgs
    .filter((m) => m.role !== "system")
    .map((m) => ({ role: m.role === "assistant" ? "model" : "user", parts: [{ text: m.content }] }));
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": key },
      body: JSON.stringify({
        contents,
        systemInstruction: system ? { parts: [{ text: system }] } : undefined,
      }),
    }
  );
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`${res.status}: ${t.slice(0, 300)}`);
  }
  const data = await res.json();
  const content = data?.candidates?.[0]?.content?.parts?.map((p: { text?: string }) => p.text ?? "").join("");
  if (!content) throw new Error("Empty response from Gemini");
  return content;
}

async function callOllama(model: string, msgs: ChatMsg[]): Promise<string> {
  const res = await fetch("http://localhost:11434/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ model, messages: msgs, stream: false }),
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`${res.status}: ${t.slice(0, 300)}`);
  }
  const data = await res.json();
  const content = data?.message?.content;
  if (!content) throw new Error("Empty response from Ollama");
  return content as string;
}

export async function chat(provider: ProviderId, model: string, msgs: ChatMsg[]): Promise<string> {
  switch (provider) {
    case "groq":
      return callGroq(model, msgs);
    case "openrouter":
      return callOpenRouter(model, msgs);
    case "gemini":
      return callGemini(model, msgs);
    case "ollama":
      return callOllama(model, msgs);
  }
}

export type FallbackResult = { content: string; providerUsed: ProviderId };

export async function chatWithFallback(
  requested: ProviderId,
  model: string,
  msgs: ChatMsg[]
): Promise<FallbackResult> {
  const order: ProviderId[] = [
    requested,
    ...CLOUD_ORDER.filter((p) => p !== requested),
  ];
  const errors: string[] = [];
  for (const p of order) {
    try {
      const content = await chat(p, modelFor(p, model, requested), msgs);
      return { content, providerUsed: p };
    } catch (e) {
      errors.push(`${p}: ${e instanceof Error ? e.message : String(e)}`);
    }
  }
  throw new Error(`All providers failed:\n${errors.join("\n")}`);
}

function modelFor(target: ProviderId, model: string, requested: ProviderId): string {
  if (target === requested) return model;
  return PROVIDERS[target].models[0];
}
