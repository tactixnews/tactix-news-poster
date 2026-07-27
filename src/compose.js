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

/**
 * Wraps a headline into tspans. Previous version capped chars-per-line too
 * conservatively for Archivo Black's actual width, which caused long
 * headlines to need a 4th line that then got silently dropped (e.g.
 * "...Edition of Necromunda" lost "Necromunda" entirely). Now sizes the
 * wrap to the real available width and never drops words — if it still
 * doesn't fit in 4 lines, it shrinks the font size instead of cutting text.
 */
function wrapHeadline(text, maxCharsPerLine) {
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
  return lines;
}

/** Picks a font size + line wrap that fits ALL words within 4 lines — never drops text. */
function fitHeadline(text) {
  const candidates = [
    { fontSize: 56, lineHeight: 68, maxCharsPerLine: 22 },
    { fontSize: 48, lineHeight: 58, maxCharsPerLine: 26 },
    { fontSize: 40, lineHeight: 48, maxCharsPerLine: 32 }
  ];
  for (const c of candidates) {
    const lines = wrapHeadline(text, c.maxCharsPerLine);
    if (lines.length <= 4) return { ...c, lines };
  }
  // Fallback: smallest size, however many lines it takes.
  const last = candidates[candidates.length - 1];
  return { ...last, lines: wrapHeadline(text, last.maxCharsPerLine) };
}

/**
 * Composites the branded SOCIAL MEDIA graphic (headline text baked in as
 * pixels): base illustration -> dark gradient scrim (legibility) ->
 * category tag -> headline -> TX corner mark. Used for Bluesky/Mastodon,
 * where the image needs to stand alone as a shareable graphic.
 *
 * `logoPngPath` should point to assets/logo/tx-mark.png (the real exported
 * logo mark from the brand guide).
 */
export async function composeSocialImage(imageBuffer, story, logoPngPath = "./assets/logo/tx-mark.png") {
  const { fontSize, lineHeight, lines } = fitHeadline(story.headline);
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
  <text font-family="Archivo Black, Arial Black, sans-serif" font-size="${fontSize}" fill="${COLORS.pureWhite}"
        style="line-height:1.05">
    ${tspans}
  </text>
</svg>`.trim();

  const base = await sharp(imageBuffer).resize(SIZE, SIZE, { fit: "cover" }).toBuffer();
  const composites = [{ input: Buffer.from(overlay), top: 0, left: 0 }, ...(await logoComposite(logoPngPath))];

  return sharp(base).composite(composites).jpeg({ quality: 85, mozjpeg: true }).toBuffer();
}

/**
 * Prepares the WEBSITE image: clean illustration, no headline/category text
 * baked in (the site already shows the headline as real HTML text right
 * next to the image, so baking it in again would be redundant/duplicated).
 * Keeps the TX logo mark for brand consistency, no dark scrim either since
 * the site's own hero section applies its own CSS gradient on top.
 */
export async function composeSiteImage(imageBuffer, logoPngPath = "./assets/logo/tx-mark.png") {
  const base = await sharp(imageBuffer).resize(SIZE, SIZE, { fit: "cover" }).toBuffer();
  const composites = await logoComposite(logoPngPath);
  return sharp(base).composite(composites).jpeg({ quality: 85, mozjpeg: true }).toBuffer();
}

async function logoComposite(logoPngPath) {
  if (!fs.existsSync(logoPngPath)) return [];
  const logoSize = 88;
  const logoBuffer = await sharp(logoPngPath).resize(logoSize, logoSize).toBuffer();
  return [{ input: logoBuffer, top: SIZE - logoSize - 40, left: SIZE - logoSize - 40 }];
}
