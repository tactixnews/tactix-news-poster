import { geminiGenerate } from "./gemini.js";
import { GENRES } from "./store-links.js";

const TOPIC_HINTS = {
  Tutorial:
    "a short how-to (e.g. a painting technique, basing/terrain method, list-building approach, or a core rules mechanic explained clearly)",
  "Tips & Trick":
    "a single sharp, specific tip or trick (e.g. a painting shortcut, a tactical gameplay tip, a campaign-running tip, or a hobby workflow trick)"
};

/**
 * Generates evergreen content (not tied to a real news event) for the
 * Tutorial / Tips & Trick content types. Picks a random genre from the
 * store list so every post still maps to a real CTA link.
 */
export async function generateEvergreenContent(contentType) {
  const genre = GENRES[Math.floor(Math.random() * GENRES.length)];

  const picked = await geminiGenerate(`
You are the content editor for TACTIX, a strategic-intelligence gaming media
brand covering tabletop wargames, TTRPG, miniatures, board games, and
industry news. Voice: intelligent, authoritative, curious — never childish,
never esports-cliché, never over-the-top military or neon-cyberpunk.

Write ${TOPIC_HINTS[contentType]}, specifically flavored for the "${genre}"
genre/setting (miniatures, armies, or campaigns in that style).

Respond ONLY with valid JSON, no markdown fences, in this exact shape:
{
  "headline": "short punchy headline, max 8 words",
  "summary": "2-3 sentence summary of the tip/tutorial content",
  "imagePromptSeed": "a short visual description of a scene/illustration that captures this, no text/logos/words in it"
}
`);

  const parsed = JSON.parse(picked.replace(/^```json|```$/g, "").trim());

  return {
    headline: parsed.headline,
    category: contentType, // shown as the tag on the graphic/site
    genre,
    summary: parsed.summary,
    sourceUrl: null, // evergreen content has no external source
    imagePromptSeed: parsed.imagePromptSeed
  };
}
