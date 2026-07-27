import "dotenv/config";
import { research } from "./research.js";
import { generateEvergreenContent } from "./evergreen-content.js";
import { nextContentType } from "./content-type-rotation.js";
import { generateStoryImage } from "./image-gen.js";
import { composeSocialImage, composeSiteImage } from "./compose.js";
import { writeContentBundle } from "./copywrite.js";
import { publishArticle } from "./site-generator.js";
import { getStoreLinkForGenre } from "./store-links.js";
import { postToBluesky } from "./post-bluesky.js";
import { postToMastodon } from "./post-mastodon.js";

async function run() {
  const contentType = nextContentType();
  console.log(`1/5 — content type: ${contentType} — researching/generating...`);
  const story = contentType === "News" ? await research() : await generateEvergreenContent(contentType);
  console.log(`Picked story: ${story.headline} [${story.category} / ${story.genre}]`);

  console.log("2/5 — generating illustration...");
  const rawImage = await generateStoryImage(story);

  console.log("3/5 — compositing branded graphics (social + site versions)...");
  // Social gets the headline baked in as a standalone shareable graphic.
  // Site gets the clean illustration only — the headline already shows as
  // real HTML text right next to it, so baking it in again would duplicate.
  const [socialImage, siteImage] = await Promise.all([
    composeSocialImage(rawImage, story),
    composeSiteImage(rawImage)
  ]);

  // Store link is chosen by the story's genre, so the CTA always matches
  // what the post is actually about — not a blind rotation.
  const storeLink = getStoreLinkForGenre(story.genre);

  console.log("4/5 — writing caption + article (single Gemini call)...");
  const { caption, articleBody } = await writeContentBundle(story, storeLink);

  console.log("5/5 — publishing to site and posting to social...");
  const article = publishArticle(story, siteImage, articleBody, storeLink);
  console.log(`Published: docs/articles/${article.slug}.html`);

  await Promise.all([
    postToBluesky(caption, socialImage, story),
    postToMastodon(caption, socialImage, story)
  ]);

  console.log("Done.");
}

run().catch(err => {
  console.error("Pipeline failed:", err);
  process.exit(1);
});
