import fetch from "node-fetch";
import FormData from "form-data";

const INSTANCE = process.env.MASTODON_INSTANCE_URL; // e.g. https://mastodon.social
const TOKEN = process.env.MASTODON_ACCESS_TOKEN;

async function uploadMedia(imageBuffer, altText) {
  const form = new FormData();
  form.append("file", imageBuffer, { filename: "post.jpg", contentType: "image/jpeg" });
  form.append("description", altText);

  const res = await fetch(`${INSTANCE}/api/v2/media`, {
    method: "POST",
    headers: { Authorization: `Bearer ${TOKEN}` },
    body: form
  });
  if (!res.ok) throw new Error(`Mastodon media upload failed: ${res.status} ${await res.text()}`);
  return res.json();
}

export async function postToMastodon(caption, imageBuffer, story) {
  const media = await uploadMedia(imageBuffer, story.headline);

  const res = await fetch(`${INSTANCE}/api/v1/statuses`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ status: caption, media_ids: [media.id] })
  });
  if (!res.ok) throw new Error(`Mastodon post failed: ${res.status} ${await res.text()}`);
  console.log("Posted to Mastodon.");
}
