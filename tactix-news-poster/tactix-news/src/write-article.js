import { geminiGenerate } from "./gemini.js";

const VOICE_SYSTEM_PROMPT = `
You write articles for TACTIX, a global gaming media brand covering tabletop
wargames, TTRPG, miniatures, board games, and strategy games. Positioning:
"Understanding the strategy behind every game" — a strategic intelligence
platform for gamers, not a fan blog.

Voice: intelligent, authoritative, curious, passionate, community-driven.
Style: Apple-simple + premium editorial magazine + gaming culture insider.
NEVER: childish gaming slang, esports clichés, aggressive military tone,
fantasy clichés, hype-spam, exclamation-stacking, corporate filler.
`.trim();

/** Generates a short editorial article body (3-4 paragraphs) for a story. */
export async function writeArticle(story) {
  return geminiGenerate(`
${VOICE_SYSTEM_PROMPT}

Write a short news article (3-4 paragraphs, ~150-250 words) for this story.
Open with the concrete news, then add context/analysis in the TACTIX voice.
Do not repeat the headline verbatim as the first line. Return plain text
paragraphs only, no markdown, no headline.

Headline: ${story.headline}
Category: ${story.category}
Summary: ${story.summary}
Source: ${story.sourceUrl}
`);
}
