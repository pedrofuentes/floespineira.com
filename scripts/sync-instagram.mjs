import { writeFile, mkdir } from "fs/promises";
import { existsSync } from "fs";
import { createWriteStream } from "fs";
import { pipeline } from "stream/promises";
import path from "path";

const DATA_FILE = new URL("../src/_data/instagram.json", import.meta.url).pathname;
const IMG_DIR = new URL("../src/assets/images/ig/", import.meta.url).pathname;

async function apiFetch(url) {
  const res = await fetch(url);
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Instagram API error ${res.status}: ${body}`);
  }
  return res.json();
}

async function downloadImage(url, dest) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to download image ${res.status}: ${url}`);
  const dir = path.dirname(dest);
  await mkdir(dir, { recursive: true });
  const ws = createWriteStream(dest);
  await pipeline(res.body, ws);
}

async function ensureDataFile() {
  if (!existsSync(DATA_FILE)) {
    await writeFile(DATA_FILE, "[]\n", "utf8");
  }
}

async function refreshToken(token) {
  try {
    const res = await fetch(
      `https://graph.instagram.com/refresh_access_token?grant_type=ig_refresh_token&access_token=${token}`
    );
    const data = await res.json();
    if (!res.ok) {
      console.warn("Warning: token refresh failed:", JSON.stringify(data));
      return;
    }
    const expiresIn = data.expires_in;
    const expiresAt = expiresIn
      ? new Date(Date.now() + expiresIn * 1000).toISOString()
      : "unknown";
    console.log(`Token refreshed. expires_in=${expiresIn}s, expires_at=${expiresAt}`);
  } catch (err) {
    console.warn("Warning: token refresh error:", err.message);
  }
}

async function main() {
  const token = process.env.IG_ACCESS_TOKEN;

  if (!token) {
    console.log("No IG_ACCESS_TOKEN; keeping existing snapshot.");
    await ensureDataFile();
    process.exit(0);
  }

  // Refresh token (non-fatal)
  await refreshToken(token);

  // Step 1: Fetch media
  const data = await apiFetch(
    `https://graph.instagram.com/me/media?fields=id,caption,media_type,media_url,permalink,thumbnail_url,timestamp&limit=12&access_token=${token}`
  );

  await mkdir(IMG_DIR, { recursive: true });

  // Step 2: Map items and download images
  const posts = (
    await Promise.all(
      (data.data || []).map(async (item) => {
        const imageUrl =
          item.media_type === "VIDEO" ? item.thumbnail_url : item.media_url;

        if (!imageUrl) {
          console.warn(`Skipping ${item.id}: no image URL available.`);
          return null;
        }

        const localPath = `/assets/images/ig/${item.id}.jpg`;
        const destPath = path.join(IMG_DIR, `${item.id}.jpg`);

        try {
          await downloadImage(imageUrl, destPath);
        } catch (err) {
          console.warn(`Warning: could not download image for ${item.id}: ${err.message}`);
        }

        return {
          id: item.id,
          caption: (item.caption || "").slice(0, 140),
          url: item.permalink,
          type: item.media_type,
          thumbnail: localPath,
          timestamp: item.timestamp,
        };
      })
    )
  ).filter(Boolean);

  // Step 3: Write JSON
  await writeFile(DATA_FILE, JSON.stringify(posts, null, 2) + "\n", "utf8");
  console.log(`Wrote ${posts.length} posts to src/_data/instagram.json`);
}

main().catch((err) => {
  console.error("sync-instagram failed:", err.message);
  process.exit(1);
});
