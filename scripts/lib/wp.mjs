import { mkdir, writeFile, access } from "fs/promises";
import { join, basename } from "path";

const BASE = "https://floespineira.com/wp-json/wp/v2";
const IMAGES_DIR = "src/assets/images";

/**
 * Paginate a WP REST endpoint, stopping on 400 or short page.
 * @param {string} type e.g. "posts" or "pages"
 * @returns {Promise<any[]>}
 */
export async function getAll(type) {
  const results = [];
  let page = 1;
  while (true) {
    const url = `${BASE}/${type}?per_page=100&page=${page}&_embed`;
    const res = await fetch(url);
    if (res.status === 400) break;
    if (!res.ok) throw new Error(`WP API ${type} page ${page}: ${res.status} ${res.statusText}`);
    const items = await res.json();
    results.push(...items);
    if (items.length < 100) break;
    page++;
  }
  return results;
}

/**
 * Download a remote image to destDir, skip if already exists.
 * Returns the web path e.g. /assets/images/filename.jpg
 * @param {string} url
 * @param {string} destDir filesystem path
 * @returns {Promise<string>}
 */
export async function downloadImage(url, destDir = IMAGES_DIR) {
  const urlObj = new URL(url);
  urlObj.search = "";
  const name = basename(urlObj.pathname);
  const dest = join(destDir, name);

  try {
    await access(dest);
    return `/assets/images/${name}`;
  } catch {
    // file doesn't exist, download it
  }

  await mkdir(destDir, { recursive: true });
  const res = await fetch(urlObj.toString());
  if (!res.ok) throw new Error(`Failed to download ${url}: ${res.status} ${res.statusText}`);
  const buf = Buffer.from(await res.arrayBuffer());
  await writeFile(dest, buf);
  return `/assets/images/${name}`;
}
