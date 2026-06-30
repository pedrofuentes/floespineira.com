import { writeFile, readFile, mkdir } from "fs/promises";
import { existsSync } from "fs";
import { createWriteStream } from "fs";
import { pipeline } from "stream/promises";
import path from "path";

const CHANNEL_ID = "UCETC6T-Xue8UrdlxdXGLACw";
const DATA_FILE = new URL("../src/_data/youtube.json", import.meta.url).pathname;
const IMG_DIR = new URL("../src/assets/images/yt/", import.meta.url).pathname;

async function apiFetch(url) {
  const res = await fetch(url);
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`YouTube API error ${res.status}: ${body}`);
  }
  return res.json();
}

function pickThumbnail(thumbnails) {
  for (const key of ["maxres", "high", "medium", "default"]) {
    if (thumbnails[key]?.url) return thumbnails[key].url;
  }
  return null;
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

async function main() {
  const apiKey = process.env.YOUTUBE_API_KEY;

  if (!apiKey) {
    console.log("No YOUTUBE_API_KEY; keeping existing snapshot.");
    await ensureDataFile();
    process.exit(0);
  }

  // Step 1: Get uploads playlist ID
  const channelData = await apiFetch(
    `https://www.googleapis.com/youtube/v3/channels?part=contentDetails&id=${CHANNEL_ID}&key=${apiKey}`
  );
  const uploadsPlaylistId = channelData.items?.[0]?.contentDetails?.relatedPlaylists?.uploads;
  if (!uploadsPlaylistId) throw new Error("Could not find uploads playlist for channel.");

  // Step 2: Get playlist items
  const playlistData = await apiFetch(
    `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&maxResults=8&playlistId=${uploadsPlaylistId}&key=${apiKey}`
  );

  await mkdir(IMG_DIR, { recursive: true });

  // Step 3: Map items and download thumbnails
  const videos = await Promise.all(
    (playlistData.items || []).map(async (item) => {
      const snippet = item.snippet;
      const videoId = snippet.resourceId.videoId;
      const thumbUrl = pickThumbnail(snippet.thumbnails || {});
      const localPath = `/assets/images/yt/${videoId}.jpg`;
      const destPath = path.join(IMG_DIR, `${videoId}.jpg`);

      if (thumbUrl) {
        try {
          await downloadImage(thumbUrl, destPath);
        } catch (err) {
          console.warn(`Warning: could not download thumbnail for ${videoId}: ${err.message}`);
        }
      }

      return {
        id: videoId,
        title: snippet.title,
        url: `https://www.youtube.com/watch?v=${videoId}`,
        thumbnail: localPath,
        published: snippet.publishedAt,
      };
    })
  );

  // Step 4: Write JSON
  await writeFile(DATA_FILE, JSON.stringify(videos, null, 2) + "\n", "utf8");
  console.log(`Wrote ${videos.length} videos to src/_data/youtube.json`);
}

main().catch((err) => {
  console.error("sync-youtube failed:", err.message);
  process.exit(1);
});
