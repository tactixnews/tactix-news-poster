import fs from "fs";

// Weighted rotation: 2 News for every 1 Tutorial and 1 Tips & Trick.
// News comes from real RSS/search research; Tutorial and Tips & Trick are
// evergreen AI-generated content not tied to a specific news event.
// Adjust this sequence directly if you want a different mix.
const SEQUENCE = ["News", "News", "Tutorial", "Tips & Trick"];

const ROTATION_FILE = "./data/content-type-rotation.json";

export function nextContentType() {
  let index = 0;
  if (fs.existsSync(ROTATION_FILE)) {
    index = JSON.parse(fs.readFileSync(ROTATION_FILE, "utf-8")).index || 0;
  }
  const type = SEQUENCE[index % SEQUENCE.length];
  fs.mkdirSync("./data", { recursive: true });
  fs.writeFileSync(ROTATION_FILE, JSON.stringify({ index: index + 1 }));
  return type;
}
