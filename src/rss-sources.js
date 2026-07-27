// Primary RSS sources. Add/remove freely — research.js treats this as the
// "known good" list and only falls back to AI web search when these don't
// yield a usable fresh story.
export const RSS_SOURCES = [
  { name: "Warhammer Community", url: "https://www.warhammer-community.com/feed/" },
  { name: "Bell of Lost Souls", url: "https://www.belloflostsouls.net/feed" },
  { name: "EN World", url: "https://www.enworld.org/forums/-/index.rss" },
  { name: "Dicebreaker", url: "https://www.dicebreaker.com/feed" },
  { name: "Tabletop Gaming News", url: "https://www.tabletopgamingnews.com/feed/" },
  { name: "ICv2", url: "https://icv2.com/rss" },
  { name: "Wargamer", url: "https://www.wargamer.com/feed" },
  { name: "Polygon", url: "https://www.polygon.com/rss/index.xml" } // general feed, not tabletop-only — research.js's editor step filters for relevance
];
