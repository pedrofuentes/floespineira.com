import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import TurndownService from "turndown";
import { getAll, downloadImage } from "./lib/wp.mjs";

const IMAGES_DIR = "src/assets/images";
const NEWS_DIR = "src/news";
const PAGES_DIR = "src/_data/pages";

const td = new TurndownService({ headingStyle: "atx", codeBlockStyle: "fenced" });

/**
 * Find all WP uploads URLs in html, download each, replace with local path.
 * @param {string} html
 * @returns {Promise<string>}
 */
async function localizeImages(html) {
  const wpUploadsRe = /https:\/\/floespineira\.com\/wp-content\/[^\s"'<>)\\]+/g;
  const urls = [...new Set(html.match(wpUploadsRe) || [])];
  for (const url of urls) {
    try {
      const localPath = await downloadImage(url, IMAGES_DIR);
      html = html.split(url).join(localPath);
    } catch (err) {
      console.warn(`  Warning: could not download ${url}: ${err.message}`);
    }
  }
  return html;
}

/**
 * Strip HTML tags to get plain text.
 * @param {string} html
 * @returns {string}
 */
function stripTags(html) {
  return html.replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim();
}

/**
 * Make a filesystem-safe slug from a WP slug (decode %xx, replace non-alnum-dash with -).
 * @param {string} slug
 * @returns {string}
 */
function safeSlug(slug) {
  return decodeURIComponent(slug).replace(/[^a-z0-9-]/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
}

/**
 * Escape double quotes in a string for YAML frontmatter.
 * @param {string} str
 * @returns {string}
 */
function yamlEscape(str) {
  return str.replace(/"/g, '\\"');
}

async function migratePosts() {
  console.log("Fetching posts...");
  const posts = await getAll("posts");
  console.log(`  Found ${posts.length} posts`);

  await mkdir(NEWS_DIR, { recursive: true });

  for (const post of posts) {
    const slug = safeSlug(post.slug);
    const permalink = new URL(post.link).pathname;
    const title = yamlEscape(stripTags(post.title.rendered));
    const date = post.date; // ISO date
    const excerptRaw = post.excerpt?.rendered || "";
    const excerpt = yamlEscape(stripTags(excerptRaw));

    // Featured image
    let hero = "";
    try {
      const media = post._embedded?.["wp:featuredmedia"]?.[0];
      if (media?.source_url) {
        hero = await downloadImage(media.source_url, IMAGES_DIR);
      }
    } catch (err) {
      console.warn(`  Warning: hero image for ${slug}: ${err.message}`);
    }

    // Body
    const localizedHtml = await localizeImages(post.content.rendered);
    const body = td.turndown(localizedHtml);

    const frontmatter = `---
layout: post.njk
title: "${title}"
date: ${date}
slug: ${post.slug}
permalink: ${permalink}
hero: "${hero}"
excerpt: "${excerpt}"
---
`;

    const mdPath = join(NEWS_DIR, `${slug}.md`);
    await writeFile(mdPath, frontmatter + body + "\n");
    console.log(`  Wrote ${mdPath}`);
  }
}

async function migratePages() {
  console.log("Fetching pages...");
  const pages = await getAll("pages");
  console.log(`  Found ${pages.length} pages`);

  await mkdir(PAGES_DIR, { recursive: true });

  const pageMap = { 9: "home", 13: "contact", 180: "news" };

  for (const page of pages) {
    if (!pageMap[page.id]) continue;
    const key = pageMap[page.id];
    const localizedHtml = await localizeImages(page.content.rendered);
    const data = {
      title: stripTags(page.title.rendered),
      html: localizedHtml,
    };
    const jsonPath = join(PAGES_DIR, `${key}.json`);
    await writeFile(jsonPath, JSON.stringify(data, null, 2) + "\n");
    console.log(`  Wrote ${jsonPath}`);
  }
}

async function main() {
  await migratePosts();
  await migratePages();
  console.log("Migration complete.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
