import { geminiGenerate } from "./gemini.js";

const VOICE_SYSTEM_PROMPT = `
You write social captions for TACTIX, a global gaming media brand covering
tabletop wargames, TTRPG, miniatures, board games, and strategy games.

Brand positioning: "Understanding the strategy behind every game" — TACTIX
is a strategic intelligence platform for gamers, not a fan blog.

Voice: intelligent, authoritative, curious, passionate, community-driven.
Style: Apple-simple + premium editorial magazine + gaming culture insider.

NEVER: childish gaming slang, esports clichés ("POG", "let's gooo"),
aggressive military tone, fantasy clichés, excessive hype/emoji spam,
exclamation-point stacking, corporate-sounding filler.

Caption rules:
- 1-2 short sentences, punchy, no fluff — MUST be under 180 characters total,
  this is a hard limit (leaves room for the CTA link appended after)
- End with a short, sharp hook or question — not a hard sell
- Max 1 relevant hashtag, only if it adds discovery value — usually zero
- No emoji, or at most one if it genuinely earns its place
`.trim();

const BLUESKY_MAX = 300; // Bluesky hard-rejects posts over 300 graphemes

function clampToLimit(text, max) {
  return text.length > max ? text.slice(0, max - 1).trimEnd() + "…" : text;
}

export async function writeCaption(story, storeLink) {
  const caption = await geminiGenerate(`
${VOICE_SYSTEM_PROMPT}

Story:
Headline: ${story.headline}
Category: ${story.category}
Summary: ${story.summary}
Source: ${story.sourceUrl}

Write ONE caption for this story. Return only the caption text, nothing else.
`);

  // The real point of TACTIX: send readers to the free BattleFoundry
  // miniatures, which funnel into paid packs. storeLink is picked once per
  // run in index.js and shared with the site article for consistency.
  const cta = `\n\nGet free ${storeLink.name.toLowerCase()} minis: ${storeLink.url}`;

  // Hard safety net: even if the AI ignores the 180-char instruction, this
  // guarantees the combined post never exceeds Bluesky's 300-grapheme limit.
  // The URL is always preserved intact — only the caption text gets trimmed.
  const maxCaptionLen = BLUESKY_MAX - cta.length;
  const safeCaption = clampToLimit(caption.trim(), maxCaptionLen);

  return `${safeCaption}${cta}`;
}
