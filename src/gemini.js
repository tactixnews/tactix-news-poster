import fetch from "node-fetch";

const API_KEY = process.env.GEMINI_API_KEY;
const BASE = "https://generativelanguage.googleapis.com/v1beta/models";
const TIMEOUT_MS = 60_000;

// Retried automatically — these are transient server-side conditions, not
// problems with the key/request.
const RETRYABLE_STATUS = new Set([429, 500, 502, 503, 504]);
const MAX_ATTEMPTS = 4;
const BACKOFF_MS = [5_000, 15_000, 30_000]; // delay before attempts 2, 3, 4

// If the primary model is stuck in a sustained high-demand window (all 4
// retries still 503), try one specific pinned model as a fallback instead
// of just giving up — "gemini-flash-latest" is an alias that may route to
// a currently-overloaded tier; a pinned version can have separate capacity.
const PRIMARY_MODEL = "gemini-flash-latest";
const FALLBACK_MODEL = "gemini-2.0-flash";

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
 * (429 rate limit, 5xx server errors). Non-retryable errors (e.g. a
 * genuine 403 permission problem) fail immediately.
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
 * Calls the given model with full retry; if it exhausts retries on a
 * retryable error AND we're on the primary model, tries the fallback model
 * once (fresh set of retries) before finally giving up.
 */
async function callWithModelFallback(buildBody, model) {
  const res = await fetchWithRetry(`${BASE}/${model}:generateContent`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify(buildBody)
  });

  if (res.ok) return res;

  if (model === PRIMARY_MODEL && RETRYABLE_STATUS.has(res.status)) {
    console.warn(`Primary model (${PRIMARY_MODEL}) still failing after retries — trying fallback model ${FALLBACK_MODEL}`);
    return callWithModelFallback(buildBody, FALLBACK_MODEL);
  }

  return res;
}

/**
 * Text generation with Google Search grounding enabled — lets Gemini pull
 * in live web results before answering.
 */
export async function geminiSearchGrounded(prompt, model = PRIMARY_MODEL) {
  const res = await callWithModelFallback(
    {
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      tools: [{ google_search: {} }]
    },
    model
  );
  if (!res.ok) throw new Error(`Gemini search-grounded call failed: ${res.status} ${await res.text()}`);
  const data = await res.json();
  return extractText(data);
}

/** Plain text generation, no grounding. */
export async function geminiGenerate(prompt, model = PRIMARY_MODEL) {
  const res = await callWithModelFallback(
    { contents: [{ role: "user", parts: [{ text: prompt }] }] },
    model
  );
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
