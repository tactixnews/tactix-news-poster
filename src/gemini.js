import fetch from "node-fetch";

const API_KEY = process.env.GEMINI_API_KEY;
const BASE = "https://generativelanguage.googleapis.com/v1beta/models";

/**
 * Text generation with Google Search grounding enabled — lets Gemini pull
 * in live web results before answering, instead of relying on stale
 * training data. Used to fill gaps the RSS feeds don't cover (rumors,
 * leaks, forum chatter, breaking news).
 */
export async function geminiSearchGrounded(prompt, model = "gemini-flash-latest") {
  const res = await fetch(`${BASE}/${model}:generateContent?key=${API_KEY}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      tools: [{ google_search: {} }]
    })
  });
  if (!res.ok) throw new Error(`Gemini search-grounded call failed: ${res.status} ${await res.text()}`);
  const data = await res.json();
  return extractText(data);
}

/** Plain text generation, no grounding (used for copywriting). */
export async function geminiGenerate(prompt, model = "gemini-flash-latest") {
  const res = await fetch(`${BASE}/${model}:generateContent?key=${API_KEY}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ contents: [{ role: "user", parts: [{ text: prompt }] }] })
  });
  if (!res.ok) throw new Error(`Gemini generate call failed: ${res.status} ${await res.text()}`);
  const data = await res.json();
  return extractText(data);
}

/**
 * Image generation. Returns base64 PNG bytes. IMPORTANT: prompt should
 * describe an illustration/scene only — never ask the model to render the
 * headline or logo as text-in-image. That gets composited on top in
 * compose.js instead, so it's always crisp and on-brand.
 */
export async function geminiGenerateImage(prompt, model = "gemini-2.5-flash-image") {
  const res = await fetch(`${BASE}/${model}:generateContent?key=${API_KEY}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ contents: [{ role: "user", parts: [{ text: prompt }] }] })
  });
  if (!res.ok) throw new Error(`Gemini image call failed: ${res.status} ${await res.text()}`);
  const data = await res.json();
  const part = data.candidates?.[0]?.content?.parts?.find(p => p.inlineData);
  if (!part) throw new Error("No image returned from Gemini");
  return Buffer.from(part.inlineData.data, "base64");
}

function extractText(data) {
  return (data.candidates?.[0]?.content?.parts || [])
    .map(p => p.text || "")
    .join("\n")
    .trim();
}
