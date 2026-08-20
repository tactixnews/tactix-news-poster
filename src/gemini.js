import fetch from "node-fetch";

const API_KEY = process.env.GEMINI_API_KEY;
const BASE = "https://generativelanguage.googleapis.com/v1beta/models";
const TIMEOUT_MS = 60_000;

// Retried automatically — these are transient server-side conditions, not
// problems with the key/request. 503 "high demand" happened twice in a row
// on a live run with no code fix possible; retrying with backoff is the
// correct handling for it.
const RETRYABLE_STATUS = new Set([429, 500, 502, 503, 504]);
const MAX_ATTEMPTS = 4;
const BACKOFF_MS = [5_000, 15_000, 30_000]; // delay before attempts 2, 3, 4

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Auth header for the request. Google's newer service-account-BOUND API
 * keys (the ones that look like "AQ.xxxx" instead of the classic
 * "AIzaSyxxxx" format) must be sent as the x-goog-api-key HEADER — sending
 * them as the old ?key=... URL param gets rejected. Classic AIzaSy... keys
 * accept either method, so using the header for both is safe and works
 * for both key formats.
 */
function authHeaders() {
  return { "Content-Type": "application/json", "x-goog-api-key": API_KEY };
}

/** fetch wrapper with a hard timeout. */
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

/**
 * fetchWithTimeout + automatic retry with backoff on transient errors
 * (429 rate limit, 5xx server errors — including the "high demand" 503
 * that's hit this project more than once). Non-retryable errors (e.g. a
 * genuine 403 permission problem, or a malformed request) fail immediately
 * — retrying those would just waste time on something a retry can't fix.
 */
async function fetchWithRetry(url, options) {
  let lastErr;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      const res = await fetchWithTimeout(url, options);
      if (res.ok) return res;

      if (!RETRYABLE_STATUS.has(res.status) || attempt === MAX_ATTEMPTS) {
        return res; // let the caller's own error handling take it from here
      }

      const bodyText = await res.text();
      console.warn(`Gemini call got ${res.status} (attempt ${attempt}/${MAX_ATTEMPTS}) — retrying: ${bodyText.slice(0, 200)}`);
      lastErr = new Error(`${res.status}: ${bodyText}`);
    } catch (err) {
      if (attempt === MAX_ATTEMPTS) throw err;
      console.warn(`Gemini call failed (attempt ${attempt}/${MAX_ATTEMPTS}) — retrying: ${err.message}`);
      lastErr = err;
    }
    await sleep(BACKOFF_MS[attempt - 1]);
  }
  throw lastErr;
}

/**
 * Text generation with Google Search grounding enabled — lets Gemini pull
 * in live web results before answering. Used to fill gaps the RSS feeds
 * don't cover (rumors, leaks, forum chatter, breaking news).
 */
export async function geminiSearchGrounded(prompt, model = "gemini-flash-latest") {
  const res = await fetchWithRetry(`${BASE}/${model}:generateContent`, {
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

/** Plain text generation, no grounding. */
export async function geminiGenerate(prompt, model = "gemini-flash-latest") {
  const res = await fetchWithRetry(`${BASE}/${model}:generateContent`, {
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
