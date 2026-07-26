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
- 1-3 sentences, punchy, no fluff
- End with a short, sharp hook or question — not a hard sell
- Max 1 relevant hashtag, only if it adds discovery value — usually zero
- No emoji, or at most one if it genuinely earns its place
`.trim();

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
  return `${caption}\n\nGet free ${storeLink.name.toLowerCase()} minis: ${storeLink.url}`;
}
