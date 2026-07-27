import Parser from "rss-parser";
import fs from "fs";
import { RSS_SOURCES } from "./rss-sources.js";
import { geminiSearchGrounded, geminiGenerate } from "./gemini.js";
import { GENRES } from "./store-links.js";

const parser = new Parser({
  timeout: 15000, // per-feed timeout (ms) — a single slow/unresponsive feed
                  // was previously able to stall the whole sequential loop
  headers: {
    "User-Agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36"
  }
});
const HISTORY_FILE = "./data/posted-history.json";

function loadHistory() {
  if (!fs.existsSync(HISTORY_FILE)) return [];
  return JSON.parse(fs.readFileSync(HISTORY_FILE, "utf-8"));
}

function saveHistory(history) {
  fs.mkdirSync("./data", { recursive: true });
  fs.writeFileSync(HISTORY_FILE, JSON.stringify(history.slice(-200), null, 2));
}

/**
 * Fetches all RSS sources IN PARALLEL (not one-at-a-time) with a 15s
 * timeout each. A live run once took 10+ minutes total because feeds were
 * fetched sequentially with no per-feed timeout — one slow source could
 * stall everything behind it.
 */
async function fetchRssItems() {
  const results = await Promise.allSettled(
    RSS_SOURCES.map(source => parser.parseURL(source.url).then(feed => ({ source, feed })))
  );

  const items = [];
  results.forEach((result, i) => {
    const source = RSS_SOURCES[i];
    if (result.status === "rejected") {
      console.warn(`RSS fetch failed for ${source.name}: ${result.reason.message}`);
      return;
    }
    for (const item of result.value.feed.items.slice(0, 5)) {
      items.push({
        source: source.name,
        title: item.title,
        link: item.link,
        summary: item.contentSnippet || item.content || "",
        pubDate: item.pubDate
      });
    }
  });
  return items;
}

/**
 * Main research entry point. Returns a single structured story object:
 * { headline, category, genre, summary, sourceUrl, imagePromptSeed }
 */
export async function research() {
  const history = loadHistory();
  const rssItems = await fetchRssItems();

  // Filter out anything we've already covered (by link).
  const fresh = rssItems.filter(i => !history.includes(i.link));

  let candidateText;
  if (fresh.length > 0) {
    candidateText = fresh
      .map(i => `[${i.source}] ${i.title} — ${i.summary} (${i.link})`)
      .join("\n");
  } else {
    // RSS gave us nothing new — fall back to AI web search for gossip/leaks/
    // breaking news RSS wouldn't catch yet.
    console.log("No fresh RSS items — falling back to AI web search.");
    candidateText = await geminiSearchGrounded(
      `Search for the most interesting recent news, rumor, leak, or launch ` +
      `announcement in the tabletop wargaming and TTRPG industry (Warhammer, ` +
      `D&D, Kickstarter tabletop campaigns, miniature releases, Adepticon-` +
      `adjacent events). List 5 candidates with a one-line summary and source ` +
      `URL each, from the last 48 hours only.`
    );
  }

  const picked = await geminiGenerate(`
You are the news editor for TACTIX, a strategic-intelligence gaming media
brand covering tabletop wargames, TTRPG, miniatures, board games, and
industry news. Voice: intelligent, authoritative, curious — never childish,
never esports-cliché, never over-the-top military or neon-cyberpunk.

From the candidates below, pick the ONE most interesting/newsworthy story.
Respond ONLY with valid JSON, no markdown fences, in this exact shape:
{
  "headline": "short punchy headline, max 8 words",
  "genre": "one of exactly: ${GENRES.join(", ")} — pick whichever best matches the story's setting/army/faction/theme",
  "summary": "2-3 sentence factual summary",
  "sourceUrl": "the source link",
  "imagePromptSeed": "a short visual description of a scene/illustration that captures this story, no text/logos/words in it"
}

Candidates:
${candidateText}
`);

  const parsed = JSON.parse(picked.replace(/^```json|```$/g, "").trim());
  const story = { ...parsed, category: "News" };

  history.push(story.sourceUrl);
  saveHistory(history);

  return story;
}
