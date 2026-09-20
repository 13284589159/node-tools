/**
 * 校验 assets/photos/photos.json 与实际图片文件是否一致。
 * 用法：node tools/verify.mjs
 */
import { readFile, stat } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const DIR = resolve(ROOT, "assets/photos");

/** 读取 JPEG 的宽高（解析 SOF 段） */
function jpegSize(buf) {
  if (buf[0] !== 0xff || buf[1] !== 0xd8) return null;
  let i = 2;
  while (i < buf.length) {
    if (buf[i] !== 0xff) { i++; continue; }
    const marker = buf[i + 1];
    if (marker === 0xd8 || marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) { i += 2; continue; }
    const len = buf.readUInt16BE(i + 2);
    if (marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc) {
      return { height: buf.readUInt16BE(i + 5), width: buf.readUInt16BE(i + 7) };
    }
    i += 2 + len;
  }
  return null;
}

const data = JSON.parse(await readFile(resolve(DIR, "photos.json"), "utf8"));
const problems = [];
const slugs = new Set();

for (const p of data.photos) {
  if (slugs.has(p.slug)) problems.push(`重复 slug：${p.slug}`);
  slugs.add(p.slug);

  const file = resolve(DIR, p.file);
  const info = await stat(file).catch(() => null);
  if (!info) { problems.push(`缺少图片文件：${p.file}`); continue; }

  const size = jpegSize(await readFile(file));
  if (!size) { problems.push(`无法解析 JPEG：${p.file}`); continue; }
  if (size.width !== p.width || size.height !== p.height) {
    problems.push(`尺寸不一致：${p.file} 实际 ${size.width}x${size.height}，json 写的是 ${p.width}x${p.height}`);
  }

  if (p.thumb) {
    const thumbOk = await stat(resolve(DIR, p.thumb)).then(() => true).catch(() => false);
    if (!thumbOk) problems.push(`缺少骨架图：${p.thumb}`);
  }

  const catOk = data.categories.some((c) => c.id === p.category && c.id !== "all");
  if (!catOk) problems.push(`分类未在 categories 中定义：${p.slug} -> ${p.category}`);
}

for (const c of data.categories) {
  if (c.id === "all") continue;
  const n = data.photos.filter((p) => p.category === c.id).length;
  if (n === 0) problems.push(`分类 ${c.id} 下没有任何作品`);
}

const heroFile = data.site.heroImage?.split("/").pop();
const heroOk = heroFile ? await stat(resolve(DIR, heroFile)).then(() => true).catch(() => false) : false;
if (!heroOk) problems.push(`首屏大图不存在：${data.site.heroImage}`);

console.log(`作品数：${data.photos.length}，分类数：${data.categories.length - 1}`);
if (problems.length) {
  console.log(`\n发现 ${problems.length} 个问题：`);
  problems.forEach((p) => console.log("  ✗ " + p));
  process.exitCode = 1;
} else {
  console.log("✓ 数据与图片文件完全一致");
}
