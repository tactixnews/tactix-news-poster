import fs from "fs";

// Each genre maps to the store that actually sells that kind of miniature.
// "Grimdark" has two stores — alternates between them so both get traffic.
export const GENRE_STORE_LINKS = {
  Grimdark: [
    { name: "Grimdark", url: "https://cults3d.com/@BATTLEBLOOD" },
    { name: "Grimdark", url: "https://cults3d.com/@DREADWORKS" }
  ],
  "DnD/Fantasy": { name: "DnD / Fantasy", url: "https://cults3d.com/@BattleFoundry" },
  Scifi: { name: "Scifi", url: "https://cults3d.com/@BATTLEFOUNDRYSCIFI" },
  "Japan Fantasy": { name: "Japan Fantasy", url: "https://cults3d.com/@WarlordSyndicate49" },
  Historical: { name: "Historical", url: "https://cults3d.com/@MiniLootsCollectibles" },
  "Scifi Grimdark": { name: "Scifi Grimdark", url: "https://cults3d.com/@RED-Unit" }
};

export const GENRES = Object.keys(GENRE_STORE_LINKS);

const ROTATION_FILE = "./data/grimdark-rotation.json";

function nextGrimdarkIndex() {
  let index = 0;
  if (fs.existsSync(ROTATION_FILE)) {
    index = JSON.parse(fs.readFileSync(ROTATION_FILE, "utf-8")).index || 0;
  }
  fs.mkdirSync("./data", { recursive: true });
  fs.writeFileSync(ROTATION_FILE, JSON.stringify({ index: index + 1 }));
  return index;
}

/**
 * Picks the store link for a given genre. Falls back to DnD/Fantasy if the
 * genre wasn't recognized (shouldn't normally happen since the AI is given
 * the exact genre list to classify into).
 */
export function getStoreLinkForGenre(genre) {
  const entry = GENRE_STORE_LINKS[genre];
  if (!entry) return GENRE_STORE_LINKS["DnD/Fantasy"];
  if (Array.isArray(entry)) return entry[nextGrimdarkIndex() % entry.length];
  return entry;
}
