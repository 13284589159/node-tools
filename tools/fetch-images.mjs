/**
 * 下载占位摄影作品到 assets/photos/
 *
 * 说明：当前使用 Lorem Picsum (https://picsum.photos) 的免费占位图填充版式，
 *      图片版权归原作者所有，仅作演示用途。
 *      换成自己的作品时：把同名 jpg 覆盖进去，或修改 assets/photos/photos.json。
 *
 * 用法：node tools/fetch-images.mjs
 */
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const OUT = resolve(ROOT, "assets/photos");

// w/h 为下载尺寸（3:2 或 2:3），网页按需缩放；long = 长边像素
const LONG_EDGE = 1600;
const HEADERS = { "User-Agent": "Mozilla/5.0 (personal-photography-site-builder)" };

const PHOTOS = [
  { slug: "misty-valley", id: 1015, ratio: "landscape" },
  { slug: "morning-lake", id: 1018, ratio: "landscape" },
  { slug: "golden-ridge", id: 1036, ratio: "landscape" },
  { slug: "snow-field", id: 1039, ratio: "landscape" },
  { slug: "fjord-light", id: 1050, ratio: "landscape" },
  { slug: "desert-dunes", id: 1062, ratio: "landscape" },
  { slug: "coastline", id: 1069, ratio: "landscape" },
  { slug: "north-road", id: 110, ratio: "landscape" },
  { slug: "valley-fog", id: 268, ratio: "landscape" },
  { slug: "city-night", id: 1031, ratio: "landscape" },
  { slug: "neon-street", id: 1011, ratio: "landscape" },
  { slug: "bridge-lines", id: 1044, ratio: "landscape" },
  { slug: "tower-glass", id: 122, ratio: "portrait" },
  { slug: "old-town", id: 164, ratio: "landscape" },
  { slug: "long-exposure", id: 235, ratio: "landscape" },
  { slug: "quiet-street", id: 195, ratio: "portrait" },
  { slug: "market-morning", id: 253, ratio: "portrait" },
  { slug: "portrait-window", id: 260, ratio: "portrait" },
  { slug: "hands-craft", id: 263, ratio: "portrait" },
  { slug: "forest-path", id: 1025, ratio: "landscape" },
  { slug: "autumn-woods", id: 1074, ratio: "landscape" },
  { slug: "wild-horse", id: 1073, ratio: "landscape" },
  { slug: "bloom-close", id: 152, ratio: "portrait" },
  { slug: "stone-arch", id: 1040, ratio: "landscape" },
];

function sizeFor(ratio) {
  return ratio === "portrait"
    ? { w: Math.round(LONG_EDGE * 0.6667), h: LONG_EDGE }
    : { w: LONG_EDGE, h: Math.round(LONG_EDGE * 0.6667) };
}

async function fetchBuffer(url) {
  let lastErr;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const res = await fetch(url, { headers: HEADERS, redirect: "follow" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const buf = Buffer.from(await res.arrayBuffer());
      if (buf.length < 2000) throw new Error(`响应过小 (${buf.length}B)`);
      return buf;
    } catch (err) {
      lastErr = err;
      await new Promise((r) => setTimeout(r, 800 * attempt));
    }
  }
  throw new Error(`${url} -> ${lastErr.message}`);
}

await mkdir(OUT, { recursive: true });

const manifest = [];
let bytes = 0;

for (const photo of PHOTOS) {
  const { w, h } = sizeFor(photo.ratio);
  const name = `${photo.slug}.jpg`;
  const buf = await fetchBuffer(`https://picsum.photos/id/${photo.id}/${w}/${h}`);
  await writeFile(resolve(OUT, name), buf);
  bytes += buf.length;

  let author = "";
  let source = "";
  try {
    const res = await fetch(`https://picsum.photos/id/${photo.id}/info`, { headers: HEADERS });
    if (res.ok) {
      const info = await res.json();
      author = info.author ?? "";
      source = info.url ?? "";
    }
  } catch {
    /* 元信息失败不影响图片下载 */
  }

  manifest.push({ slug: photo.slug, file: name, width: w, height: h, author, source, picsumId: photo.id });
  console.log(`✓ ${name.padEnd(26)} ${(buf.length / 1024).toFixed(0).padStart(4)} KB  ${w}x${h}  ${author}`);
}

// 只输出下载结果，不覆盖手工整理的 assets/photos/photos.json
await writeFile(resolve(OUT, "_download-report.json"), JSON.stringify(manifest, null, 2) + "\n", "utf8");
console.log(`\n完成：${PHOTOS.length} 张占位图，共 ${(bytes / 1024 / 1024).toFixed(2)} MB`);
console.log(`下载记录：assets/photos/_download-report.json（站点使用的是 photos.json）`);
