import fetch from "node-fetch";

/**
 * Generates the background illustration for a story using Pollinations.ai —
 * a free, no-API-key image generation service. Gemini's image model has
 * ZERO quota on the free tier (confirmed via a live run — 429
 * RESOURCE_EXHAUSTED with limit: 0), so this avoids requiring billing.
 *
 * No headline/logo text is requested on purpose — AI image models still
 * render text unreliably. Text gets composited precisely in compose.js.
 */
export async function generateStoryImage(story) {
  const prompt = `
Editorial illustration for a premium gaming media outlet, square format.
Scene: ${story.imagePromptSeed}
Style: modern tech-editorial, cinematic lighting, dramatic red and deep black
color grading, high detail, premium magazine quality.
No text, no words, no logos, no watermarks anywhere in the image.
`.trim();

  const url = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}` +
    `?width=1080&height=1080&nologo=true&seed=${Math.floor(Math.random() * 1e9)}`;

  const res = await fetch(url);
  if (!res.ok) throw new Error(`Pollinations image gen failed: ${res.status} ${await res.text()}`);
  return Buffer.from(await res.arrayBuffer());
}
