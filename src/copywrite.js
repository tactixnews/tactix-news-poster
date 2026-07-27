import { geminiGenerate } from "./gemini.js";

const VOICE_SYSTEM_PROMPT = `
You write content for TACTIX, a global gaming media brand covering tabletop
wargames, TTRPG, miniatures, board games, and strategy games.

Brand positioning: "Understanding the strategy behind every game" — TACTIX
is a strategic intelligence platform for gamers, not a fan blog.

Voice: intelligent, authoritative, curious, passionate, community-driven.
Style: Apple-simple + premium editorial magazine + gaming culture insider.

NEVER: childish gaming slang, esports clichés ("POG", "let's gooo"),
aggressive military tone, fantasy clichés, excessive hype/emoji spam,
exclamation-point stacking, corporate-sounding filler.
`.trim();

const BLUESKY_MAX = 300; // Bluesky hard-rejects posts over 300 graphemes

function clampToLimit(text, max) {
  return text.length > max ? text.slice(0, max - 1).trimEnd() + "…" : text;
}

/**
 * Writes the social caption AND the long-form article body in ONE Gemini
 * call instead of two. The free-tier Gemini quota is a hard 20
 * requests/DAY cap — with 3 separate calls per run (pick story, caption,
 * article) that gets burned through fast across 4 scheduled runs + manual
 * testing. Merging these two cuts total calls per run from 3 to 2.
 */
export async function writeContentBundle(story, storeLink) {
  const formatInstruction =
    story.category === "News"
      ? "a short news article (3-4 paragraphs, ~150-250 words). Open with the concrete news, then add context/analysis in the TACTIX voice."
      : `a short ${story.category.toLowerCase()} piece (3-4 paragraphs, ~150-250 words) — practical and specific, not just atmospheric.`;

  const raw = await geminiGenerate(`
${VOICE_SYSTEM_PROMPT}

Story:
Headline: ${story.headline}
Category: ${story.category}
Summary: ${story.summary}${story.sourceUrl ? `\nSource: ${story.sourceUrl}` : ""}

Write TWO things for this story and respond ONLY with valid JSON, no
markdown fences, in this exact shape:
{
  "caption": "a short social caption — 1-2 short punchy sentences, MUST be under 150 characters, ending with a sharp hook or question (not a hard sell), followed by 2-3 relevant hashtags for discoverability (e.g. #Warhammer40k, #DnD, #TTRPG) — not optional. No emoji, or at most one if it genuinely earns its place.",
  "article": "${formatInstruction} Do not repeat the headline verbatim as the first line. Plain text paragraphs only, no markdown, no headline. Use \\n\\n between paragraphs."
}
`);

  const parsed = JSON.parse(raw.replace(/^```json|```$/g, "").trim());

  // The real point of TACTIX: send readers to the free BattleFoundry
  // miniatures, which funnel into paid packs. storeLink is picked once per
  // run in index.js and shared with the site article for consistency.
  const cta = `\n\nGet free ${storeLink.name.toLowerCase()} minis: ${storeLink.url}`;

  // Hard safety net: even if the AI ignores the char-limit instruction,
  // this guarantees the combined post never exceeds Bluesky's 300-grapheme
  // limit. The URL is always preserved intact — only the caption is trimmed.
  const maxCaptionLen = BLUESKY_MAX - cta.length;
  const safeCaption = clampToLimit(parsed.caption.trim(), maxCaptionLen);

  return {
    caption: `${safeCaption}${cta}`,
    articleBody: parsed.article.trim()
  };
}
