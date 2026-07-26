// The actual point of TACTIX: send readers to the free miniatures, which
// funnel into the paid BattleFoundry packs. Rotates through all four stores
// so no single one gets spammed every post.
export const STORE_LINKS = [
  { name: "Fantasy", url: "https://cults3d.com/@BattleFoundry" },
  { name: "Scifi", url: "https://cults3d.com/@BATTLEFOUNDRYSCIFI" },
  { name: "Grimdark", url: "https://cults3d.com/@DREADWORKS" },
  { name: "Resin Statue", url: "https://cults3d.com/@BlacksiteSyndicate" }
];

import fs from "fs";
const ROTATION_FILE = "./data/link-rotation.json";

export function nextStoreLink() {
  let index = 0;
  if (fs.existsSync(ROTATION_FILE)) {
    index = JSON.parse(fs.readFileSync(ROTATION_FILE, "utf-8")).index || 0;
  }
  const link = STORE_LINKS[index % STORE_LINKS.length];
  fs.mkdirSync("./data", { recursive: true });
  fs.writeFileSync(ROTATION_FILE, JSON.stringify({ index: index + 1 }));
  return link;
}
