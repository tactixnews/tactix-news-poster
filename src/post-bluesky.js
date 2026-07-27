import fetch from "node-fetch";

const PDS_URL = "https://bsky.social";

async function login() {
  const res = await fetch(`${PDS_URL}/xrpc/com.atproto.server.createSession`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      identifier: process.env.BLUESKY_HANDLE,
      password: process.env.BLUESKY_APP_PASSWORD
    })
  });
  if (!res.ok) throw new Error(`Bluesky login failed: ${res.status} ${await res.text()}`);
  return res.json();
}

async function uploadImage(accessJwt, imageBuffer) {
  const res = await fetch(`${PDS_URL}/xrpc/com.atproto.repo.uploadBlob`, {
    method: "POST",
    headers: { "Content-Type": "image/jpeg", Authorization: `Bearer ${accessJwt}` },
    body: imageBuffer
  });
  if (!res.ok) throw new Error(`Bluesky image upload failed: ${res.status} ${await res.text()}`);
  const data = await res.json();
  return data.blob;
}

export async function postToBluesky(caption, imageBuffer, story) {
  const session = await login();
  const blob = await uploadImage(session.accessJwt, imageBuffer);

  const record = {
    $type: "app.bsky.feed.post",
    text: caption,
    createdAt: new Date().toISOString(),
    embed: {
      $type: "app.bsky.embed.images",
      images: [{ image: blob, alt: story.headline }]
    }
  };

  const res = await fetch(`${PDS_URL}/xrpc/com.atproto.repo.createRecord`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.accessJwt}` },
    body: JSON.stringify({ repo: session.did, collection: "app.bsky.feed.post", record })
  });
  if (!res.ok) throw new Error(`Bluesky post failed: ${res.status} ${await res.text()}`);
  console.log("Posted to Bluesky.");
}
