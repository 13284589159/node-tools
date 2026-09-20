/**
 * 复算瀑布流分列结果：确认每列高度是否均衡、图片比例是否被改动。
 * 算法与 assets/js/main.js 中的 renderGallery() 保持一致。
 * 用法：node tools/check-grid.mjs
 */
import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
// CSS: .gallery gap = clamp(0.75rem, 1.6vw, 1.35rem)
const gapFor = (vw) => Math.min(Math.max(12, 0.016 * vw), 21.6);

const data = JSON.parse(await readFile(resolve(ROOT, "assets/photos/photos.json"), "utf8"));
const photos = data.photos;

/** 与前端 cardRatio() 一致 */
function cardRatio(photo) {
  const raw = photo.height / photo.width;
  if (raw > 1.55) return { ratio: 1.55, cls: "ar-wide" };
  if (raw < 0.62) return { ratio: 0.62, cls: "ar-tall" };
  return { ratio: raw, cls: "" };
}

function layout(width) {
  const gap = gapFor(width);
  const cols = width <= 640 ? 1 : width <= 1024 ? 2 : 3;
  const buckets = Array.from({ length: cols }, () => []);
  const heights = new Array(cols).fill(0);
  const cropped = [];

  const items = photos.map((p, index) => {
    const { ratio, cls } = cardRatio(p);
    if (cls) cropped.push(`${p.slug} ${p.width}x${p.height}(${(p.height / p.width).toFixed(2)}) → ${ratio}`);
    return { photo: p, index, ratio };
  });

  // LPT：先放高图，放进最矮的一列，避免竖构图扎堆
  [...items]
    .sort((a, b) => b.ratio - a.ratio || a.index - b.index)
    .forEach((item) => {
      const col = heights.indexOf(Math.min(...heights));
      buckets[col].push(item);
      heights[col] += item.ratio + 0.06;
    });

  // 列内恢复原顺序，视觉上仍是按时间/主题排列
  buckets.forEach((b) => b.sort((a, z) => a.index - z.index));

  const colWidth = width <= 640 ? width : (width - gap * (cols - 1)) / cols;
  const px = heights.map((h) => h * colWidth);
  return { cols, gap, buckets, heights, px, cropped };
}

let worst = 0;

for (const width of [1440, 1240, 1000, 768, 480, 390]) {
  const { cols, gap, buckets, px } = layout(width);
  const min = Math.min(...px);
  const max = Math.max(...px);
  const drift = ((max - min) / max) * 100;
  worst = Math.max(worst, drift);
  console.log(
    `视口 ${String(width).padStart(4)}px → ${cols} 列 · 间距 ${gap.toFixed(1)}px · ` +
      `每列 ${buckets.map((b) => b.length).join("/")} 张 · ` +
      `列高 ${px.map((h) => h.toFixed(0)).join(" / ")}px · 均衡偏差 ${drift.toFixed(1)}%`
  );
  if (width === 1440) {
    console.log(`   第 2 列顺序：${buckets[1]?.map((b) => b.photo.slug).join(" → ")}`);
  }
}

const { cropped } = layout(1440);
console.log(
  cropped.length
    ? `\n被比例上限裁剪的图片（${cropped.length} 张，object-fit: cover 裁掉少量边缘）：\n  ` +
        cropped.join("\n  ")
    : "\n✓ 所有图片均按原始比例显示，无裁剪"
);
console.log(`\n各视口最大列高偏差：${worst.toFixed(1)}%（瀑布流本身允许列尾不齐，<25% 视为正常）`);
