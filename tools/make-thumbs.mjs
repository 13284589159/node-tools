/**
 * 生成与每张照片同名的 SVG 占位缩略图（assets/photos/thumbs/*.svg）
 * 作用：图片懒加载完成前先显示同色系、同比例的骨架图，避免瀑布流跳动。
 * 用法：node tools/make-thumbs.mjs
 */
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const OUT = resolve(ROOT, "assets/photos/thumbs");

const PHOTOS = [
  ["misty-valley", "landscape"], ["morning-lake", "landscape"], ["golden-ridge", "landscape"],
  ["snow-field", "landscape"], ["fjord-light", "landscape"], ["desert-dunes", "landscape"],
  ["coastline", "landscape"], ["north-road", "landscape"], ["valley-fog", "landscape"],
  ["city-night", "landscape"], ["neon-street", "landscape"], ["bridge-lines", "landscape"],
  ["tower-glass", "portrait"], ["old-town", "landscape"], ["long-exposure", "landscape"],
  ["quiet-street", "portrait"], ["market-morning", "portrait"], ["portrait-window", "portrait"],
  ["hands-craft", "portrait"], ["forest-path", "landscape"], ["autumn-woods", "landscape"],
  ["wild-horse", "landscape"], ["bloom-close", "portrait"], ["stone-arch", "landscape"],
];

function hash(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) >>> 0;
  return h;
}

await mkdir(OUT, { recursive: true });

for (const [slug, ratio] of PHOTOS) {
  const [w, h] = ratio === "portrait" ? [480, 720] : [720, 480];
  const hue = hash(slug) % 360;
  const hue2 = (hue + 24) % 360;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="hsl(${hue} 12% 18%)"/>
      <stop offset="1" stop-color="hsl(${hue2} 14% 9%)"/>
    </linearGradient>
  </defs>
  <rect width="${w}" height="${h}" fill="url(#g)"/>
</svg>
`;
  await writeFile(resolve(OUT, `${slug}.svg`), svg, "utf8");
}

console.log(`已生成 ${PHOTOS.length} 个骨架占位图 -> assets/photos/thumbs/`);
