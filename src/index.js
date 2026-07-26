import "dotenv/config";
import { research } from "./research.js";
import { generateStoryImage } from "./image-gen.js";
import { composePost } from "./compose.js";
import { writeCaption } from "./copywrite.js";
import { writeArticle } from "./write-article.js";
import { publishArticle } from "./site-generator.js";
import { nextStoreLink } from "./store-links.js";
import { postToBluesky } from "./post-bluesky.js";
import { postToMastodon } from "./post-mastodon.js";

async function run() {
  console.log("1/6 — researching...");
  const story = await research();
  console.log(`Picked story: ${story.headline} [${story.category}]`);

  console.log("2/6 — generating illustration...");
  const rawImage = await generateStoryImage(story);

  console.log("3/6 — compositing branded graphic...");
  const finalImage = await composePost(rawImage, story);

  // Picked once, shared by the social caption and the site article so both
  // point to the same store on this run.
  const storeLink = nextStoreLink();

  console.log("4/6 — writing caption + article...");
  const [caption, articleBody] = await Promise.all([
    writeCaption(story, storeLink),
    writeArticle(story)
  ]);

  console.log("5/6 — publishing to site...");
  const article = publishArticle(story, finalImage, articleBody, storeLink);
  console.log(`Published: docs/articles/${article.slug}.html`);

  console.log("6/6 — posting to social...");
  await Promise.all([
    postToBluesky(caption, finalImage, story),
    postToMastodon(caption, finalImage, story)
  ]);

  console.log("Done.");
}

run().catch(err => {
  console.error("Pipeline failed:", err);
  process.exit(1);
});
