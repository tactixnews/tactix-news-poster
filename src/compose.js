import sharp from "sharp";
import fs from "fs";

const COLORS = {
  signalRed: "#F96968",
  pureWhite: "#FFFFFF",
  deepBlack: "#050505",
  offWhite: "#F5F3EE"
};

const SIZE = 1080; // square, Instagram/Bluesky/Mastodon-safe

function escapeXml(str) {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/** Wraps a headline into up to 3 lines of tspans, roughly by character count. */
function wrapHeadline(text, maxCharsPerLine = 16) {
  const words = text.toUpperCase().split(" ");
  const lines = [];
  let current = "";
  for (const word of words) {
    if ((current + " " + word).trim().length > maxCharsPerLine && current) {
      lines.push(current.trim());
      current = word;
    } else {
      current = (current + " " + word).trim();
    }
  }
  if (current) lines.push(current);
  return lines.slice(0, 3);
}

/**
 * Composites the branded TACTIX post graphic:
 * base illustration -> dark gradient scrim (legibility) -> category tag ->
 * headline -> TX corner mark.
 *
 * `logoSvgPath` should point to assets/logo/tx-mark.svg (swap in the real
 * exported logo mark from the brand guide — a placeholder ships in this repo).
 */
export async function composePost(imageBuffer, story, logoPngPath = "./assets/logo/tx-mark.png") {
  const lines = wrapHeadline(story.headline);
  const lineHeight = 68;
  const startY = SIZE - 120 - lines.length * lineHeight;

  const tspans = lines
    .map((line, i) => `<tspan x="64" y="${startY + i * lineHeight}">${escapeXml(line)}</tspan>`)
    .join("");

  const overlay = `
<svg width="${SIZE}" height="${SIZE}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="scrim" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="${COLORS.deepBlack}" stop-opacity="0"/>
      <stop offset="55%" stop-color="${COLORS.deepBlack}" stop-opacity="0.15"/>
      <stop offset="100%" stop-color="${COLORS.deepBlack}" stop-opacity="0.92"/>
    </linearGradient>
  </defs>

  <rect x="0" y="0" width="${SIZE}" height="${SIZE}" fill="url(#scrim)"/>

  <!-- category tag -->
  <rect x="64" y="64" width="${story.category.length * 12 + 40}" height="44" fill="${COLORS.signalRed}"/>
  <text x="${64 + (story.category.length * 12 + 40) / 2}" y="92" font-family="Inter, Arial, sans-serif"
        font-size="18" font-weight="700" fill="${COLORS.deepBlack}" text-anchor="middle"
        letter-spacing="1">${escapeXml(story.category.toUpperCase())}</text>

  <!-- headline -->
  <text font-family="Archivo Black, Arial Black, sans-serif" font-size="56" fill="${COLORS.pureWhite}"
        style="line-height:1.05">
    ${tspans}
  </text>
</svg>`.trim();

  const base = await sharp(imageBuffer).resize(SIZE, SIZE, { fit: "cover" }).toBuffer();

  const composites = [{ input: Buffer.from(overlay), top: 0, left: 0 }];

  // TX corner mark, bottom right — a real raster PNG logo, resized down.
  if (fs.existsSync(logoPngPath)) {
    const logoSize = 88;
    const logoBuffer = await sharp(logoPngPath).resize(logoSize, logoSize).toBuffer();
    composites.push({
      input: logoBuffer,
      top: SIZE - logoSize - 40,
      left: SIZE - logoSize - 40
    });
  }

  return sharp(base).composite(composites).png().toBuffer();
}
