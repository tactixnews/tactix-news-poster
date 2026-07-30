import fetch from "node-fetch";

const API_KEY = process.env.GEMINI_API_KEY;
const BASE = "https://generativelanguage.googleapis.com/v1beta/models";
const TIMEOUT_MS = 60_000;

function authHeaders() {
  return { "Content-Type": "application/json", "x-goog-api-key": API_KEY };
}

async function fetchWithTimeout(url, options) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } catch (err) {
    if (err.name === "AbortError") {
      throw new Error(`Gemini call timed out after ${TIMEOUT_MS / 1000}s`);
    }
    throw err;
  } finally {
    clearTimeout(timeout);
  }
}

export async function geminiSearchGrounded(prompt, model = "gemini-flash-latest") {
  const res = await fetchWithTimeout(`${BASE}/${model}:generateContent`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      tools: [{ google_search: {} }]
    })
  });
  if (!res.ok) throw new Error(`Gemini search-grounded call failed: ${res.status} ${await res.text()}`);
  const data = await res.json();
  return extractText(data);
}

export async function geminiGenerate(prompt, model = "gemini-flash-latest") {
  const res = await fetchWithTimeout(`${BASE}/${model}:generateContent`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({ contents: [{ role: "user", parts: [{ text: prompt }] }] })
  });
  if (!res.ok) throw new Error(`Gemini generate call failed: ${res.status} ${await res.text()}`);
  const data = await res.json();
  return extractText(data);
}

function extractText(data) {
  return (data.candidates?.[0]?.content?.parts || [])
    .map(p => p.text || "")
    .join("\n")
    .trim();
}
