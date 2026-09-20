/* ==========================================================================
   林澈 · 摄影作品集  —  交互脚本（原生 JS，无依赖）
   功能：读取作品数据 → 渲染筛选与瀑布流 → 大图查看（键盘/滑动/深链接）
        + 滚动动效、头部状态、滚动进度、移动端菜单
   想换成自己的作品：编辑 assets/photos/photos.json 即可，无需改这里。
   ========================================================================== */

const DATA_URL = "assets/photos/photos.json";
const BASE = "assets/photos/";
const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

const state = {
  photos: [],
  categories: [],
  filter: "all",
  visible: [],
  cols: 3,
};

/* ---------------------------------------------------------------- 数据加载 */
async function loadData() {
  const res = await fetch(DATA_URL, { cache: "no-cache" });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();

  state.photos = data.photos.map((p) => ({
    ...p,
    src: BASE + p.file,
    thumbSrc: p.thumb ? BASE + p.thumb : "",
    label: data.categories.find((c) => c.id === p.category)?.label ?? p.category,
  }));
  state.categories = data.categories;
  return data;
}

/* 把 photos.json 里的站点信息（姓名、简介、邮箱、社交链接）填进页面 -------- */
function applySiteCopy(site) {
  $$("[data-site]").forEach((el) => {
    const value = site[el.dataset.site];
    if (value) el.textContent = value;
  });
  if (site.email) {
    const mail = $("#contactMail");
    if (mail) mail.href = `mailto:${site.email}`;
  }
  if (site.heroImage) {
    const hero = $("#heroImage");
    if (hero) hero.src = site.heroImage;
  }
  const socials = $("#socials");
  if (socials) {
    const links = [
      ["Instagram", site.instagram],
      ["小红书", site.xiaohongshu],
      ["微博", site.weibo],
    ].filter(([, url]) => Boolean(url));
    socials.innerHTML = links
      .map(
        ([label, url]) =>
          `<li><a href="${url}" target="_blank" rel="noopener noreferrer">${label}<span aria-hidden="true">↗</span></a></li>`
      )
      .join("");
  }
}

/* -------------------------------------------------------------- 筛选按钮 */
function renderFilters() {
  const wrap = $("#filters");
  const counts = state.photos.reduce((acc, p) => {
    acc[p.category] = (acc[p.category] ?? 0) + 1;
    return acc;
  }, {});

  wrap.innerHTML = state.categories
    .map((cat) => {
      const n = cat.id === "all" ? state.photos.length : counts[cat.id] ?? 0;
      const active = cat.id === state.filter;
      return `<button class="chip" role="tab" data-cat="${cat.id}"
        aria-selected="${active}">${cat.label}<span class="chip-count">${n}</span></button>`;
    })
    .join("");

  wrap.addEventListener("click", (e) => {
    const chip = e.target.closest(".chip");
    if (!chip) return;
    setFilter(chip.dataset.cat);
  });
}

function setFilter(cat) {
  state.filter = cat;
  $$("#filters .chip").forEach((chip) =>
    chip.setAttribute("aria-selected", String(chip.dataset.cat === cat))
  );
  applyFilter();
}

/* ------------------------------------------------------------ 瀑布流渲染 */
/* 图片实际显示比例（限制在 0.62 ~ 1.55 之间，避免极端长图） */
function cardRatio(photo) {
  const raw = photo.height / photo.width;
  if (raw > 1.55) return { ratio: 1.55, cls: "ar-wide" };  // 图很宽
  if (raw < 0.62) return { ratio: 0.62, cls: "ar-tall" };  // 图很高
  return { ratio: raw, cls: "" };
}

/* 把当前筛选结果分列：先放高图、放进最矮的一列，列内保持原顺序 */
function renderGallery() {
  const grid = $("#photoGrid");
  const cols = state.cols;
  const buckets = Array.from({ length: cols }, () => []);
  const heights = new Array(cols).fill(0);

  const items = state.visible.map((photo, index) => ({ photo, index, ...cardRatio(photo) }));

  [...items]
    .sort((a, b) => b.ratio - a.ratio || a.index - b.index)
    .forEach((item) => {
      const col = heights.indexOf(Math.min(...heights));
      buckets[col].push(item);
      heights[col] += item.ratio + 0.06;
    });

  grid.innerHTML = buckets
    .map((bucket) => {
      const cards = bucket
        .sort((a, b) => a.index - b.index)
        .map(({ photo: p, cls }, i) => `
      <figure class="card ${cls}" data-slug="${p.slug}" data-cat="${p.category}" tabindex="0"
              role="button" aria-label="查看《${p.title}》大图"
              style="background-image:url('${p.thumbSrc}');transition-delay:${(i % 6) * 55}ms">
        <img data-src="${p.src}" alt="${p.title} · ${p.location}" loading="lazy" decoding="async"
             width="${p.width}" height="${p.height}">
        <span class="card-cat">${p.label}</span>
        <figcaption class="card-veil">
          <span class="card-place">${p.location} · ${p.year}</span>
          <span class="card-title">${p.title}</span>
        </figcaption>
      </figure>`);
      return `<div class="gallery-col">${cards.join("")}</div>`;
    })
    .join("");

  $("#galleryEmpty").hidden = state.visible.length > 0;
  observeCards();
  lazyLoadImages();
}

/* 列数：手机 1 列、平板 2 列、桌面 3 列 */
function currentCols() {
  const width = window.innerWidth;
  return width <= 640 ? 1 : width <= 1024 ? 2 : 3;
}

/* 筛选：切换分类并重新分列 */
function applyFilter(rebuild = true) {
  state.visible = state.photos.filter((p) => state.filter === "all" || p.category === state.filter);
  state.cols = currentCols();

  if (rebuild) {
    renderGallery();
    return;
  }
  // 仅窗口尺寸变化时：列数没变的话不重建 DOM，避免图片重新加载
  const card = $("#photoGrid .card");
  if (card?.closest(".gallery-col") && $$(".gallery-col").length === state.cols) return;
  renderGallery();
}

/* 卡片进入视口时淡入（替代 CSS 里统一的 .reveal，让瀑布流有错落感） */
let cardObserver = null;
function observeCards() {
  const cards = $$("#photoGrid .card");
  if (!("IntersectionObserver" in window) || reducedMotion) {
    cards.forEach((c) => c.classList.add("is-visible"));
    return;
  }
  if (!cardObserver) {
    cardObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add("is-visible");
          cardObserver.unobserve(entry.target);
        });
      },
      { rootMargin: "0px 0px -6% 0px", threshold: 0.06 }
    );
  }
  cards.forEach((card) => cardObserver.observe(card));
}

/* 懒加载：卡片进入视口前 400px 再真正请求图片 */
let imageObserver = null;
function lazyLoadImages() {
  const images = $$("#photoGrid img[data-src]");
  if (!images.length) return;

  const load = (img) => {
    const src = img.dataset.src;
    if (!src) return;
    delete img.dataset.src;
    img.src = src;
    const done = () => img.closest(".card")?.classList.add("is-loaded");
    if (img.complete && img.naturalWidth) done();
    else {
      img.addEventListener("load", done, { once: true });
      img.addEventListener("error", done, { once: true });
    }
  };

  if (!("IntersectionObserver" in window)) {
    images.forEach(load);
    return;
  }

  if (!imageObserver) {
    imageObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          load(entry.target);
          imageObserver.unobserve(entry.target);
        });
      },
      { rootMargin: "400px 0px" }
    );
  }
  images.forEach((img) => imageObserver.observe(img));
}

/* ------------------------------------------------------- 大图查看（灯箱） */
const lb = {
  index: 0,
  lastFocus: null,
  touchStart: null,
};

function openLightbox(slug) {
  const list = state.visible.length ? state.visible : state.photos;
  const index = list.findIndex((p) => p.slug === slug);
  if (index < 0) return;

  const box = $("#lightbox");
  if (box.hidden) {
    box.hidden = false;
    lb.lastFocus = document.activeElement;
  }
  document.body.classList.add("is-locked");
  requestAnimationFrame(() => box.classList.add("is-open"));

  showPhoto(index, 0);
  history.replaceState(null, "", `#${slug}`);
}

function closeLightbox() {
  const box = $("#lightbox");
  if (!box || box.hidden) return;
  box.classList.remove("is-open");
  document.body.classList.remove("is-locked");
  const finish = () => {
    box.hidden = true;
    $("#lbImage").removeAttribute("src");
  };
  reducedMotion ? finish() : window.setTimeout(finish, 280);
  if (location.hash) history.replaceState(null, "", location.pathname + location.search);
  lb.lastFocus?.focus?.();
}

function photoList() {
  return state.visible.length ? state.visible : state.photos;
}

function showPhoto(index, direction = 1) {
  const list = photoList();
  if (!list.length) return;
  lb.index = (index + list.length) % list.length;
  const photo = list[lb.index];

  const img = $("#lbImage");
  const loader = $("#lbLoader");
  img.classList.remove("is-ready");
  loader.classList.add("is-active");

  const pre = new Image();
  pre.src = photo.src;
  pre.onload = () => {
    // 快速连按时丢弃过期请求的结果
    if (list[lb.index] !== photo) return;
    img.src = photo.src;
    img.alt = `${photo.title} · ${photo.location}`;
    requestAnimationFrame(() => img.classList.add("is-ready"));
    loader.classList.remove("is-active");
  };
  pre.onerror = () => loader.classList.remove("is-active");

  $("#lbCounter").textContent = `${lb.index + 1} / ${list.length}`;
  $("#lbTitle").textContent = photo.title;
  $("#lbPlace").textContent = `${photo.label} · ${photo.location}`;
  $("#lbYear").textContent = `${photo.year}`;
  $("#lbCamera").textContent = photo.camera ?? "—";
  $("#lbExif").textContent = photo.exif ?? "—";
  history.replaceState(null, "", `#${photo.slug}`);

  // 预加载前后各一张
  [list[(lb.index + 1) % list.length], list[(lb.index - 1 + list.length) % list.length]].forEach(
    (p) => p && (new Image().src = p.src)
  );
}

function step(direction) {
  showPhoto(lb.index + direction, direction);
}

function bindLightbox() {
  const box = $("#lightbox");

  box.addEventListener("click", (e) => {
    if (e.target.closest("[data-lb-close]")) closeLightbox();
  });

  $("#lbPrev").addEventListener("click", (e) => {
    e.stopPropagation();
    step(-1);
  });
  $("#lbNext").addEventListener("click", (e) => {
    e.stopPropagation();
    step(1);
  });

  $("#lbInfo").addEventListener("click", (e) => {
    const btn = e.currentTarget;
    const collapsed = $("#lbMeta").classList.toggle("is-collapsed");
    btn.setAttribute("aria-pressed", String(!collapsed));
  });

  document.addEventListener("keydown", (e) => {
    if (box.hidden) return;
    switch (e.key) {
      case "Escape": closeLightbox(); break;
      case "ArrowRight": step(1); break;
      case "ArrowLeft": step(-1); break;
      case "Tab": trapFocus(e, box); break;
      default: break;
    }
  });

  // 移动端左右滑动切换
  const stage = $("#lbStage");
  stage.addEventListener("touchstart", (e) => {
    lb.touchStart = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  }, { passive: true });
  stage.addEventListener("touchend", (e) => {
    if (!lb.touchStart) return;
    const dx = e.changedTouches[0].clientX - lb.touchStart.x;
    const dy = e.changedTouches[0].clientY - lb.touchStart.y;
    if (Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(dy)) step(dx < 0 ? 1 : -1);
    lb.touchStart = null;
  }, { passive: true });
}

/* 键盘焦点锁在弹层内 */
function trapFocus(e, container) {
  const focusable = $$(
    'button, a[href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
    container
  ).filter((el) => el.offsetParent !== null);
  if (!focusable.length) return;
  const first = focusable[0];
  const last = focusable[focusable.length - 1];
  if (e.shiftKey && document.activeElement === first) {
    e.preventDefault();
    last.focus();
  } else if (!e.shiftKey && document.activeElement === last) {
    e.preventDefault();
    first.focus();
  }
}

/* ---------------------------------------------------------- 页面其它交互 */
function bindHeader() {
  const header = $("#siteHeader");
  const progress = $("#scrollProgress");
  let ticking = false;

  const update = () => {
    const y = window.scrollY;
    header.classList.toggle("is-stuck", y > 24);
    const max = document.documentElement.scrollHeight - window.innerHeight;
    progress.style.width = `${max > 0 ? Math.min(100, (y / max) * 100) : 0}%`;
    ticking = false;
  };

  window.addEventListener(
    "scroll",
    () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(update);
    },
    { passive: true }
  );
  update();
}

function bindNav() {
  const toggle = $("#navToggle");
  const nav = $("#nav");

  toggle.addEventListener("click", () => {
    const open = nav.classList.toggle("is-open");
    toggle.setAttribute("aria-expanded", String(open));
    toggle.setAttribute("aria-label", open ? "关闭菜单" : "打开菜单");
  });

  nav.addEventListener("click", (e) => {
    if (!e.target.closest("a")) return;
    nav.classList.remove("is-open");
    toggle.setAttribute("aria-expanded", "false");
  });
}

function bindReveal() {
  const items = $$(".reveal");
  if (!("IntersectionObserver" in window) || reducedMotion) {
    items.forEach((el) => el.classList.add("is-visible"));
    return;
  }
  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-visible");
        io.unobserve(entry.target);
      });
    },
    { rootMargin: "0px 0px -8% 0px", threshold: 0.08 }
  );
  items.forEach((el) => io.observe(el));
}

function bindResize() {
  let timer;
  window.addEventListener("resize", () => {
    clearTimeout(timer);
    timer = window.setTimeout(() => applyFilter(false), 150);
  });
}

function syncStats() {
  const el = $("#statPhotos");
  if (el) el.textContent = String(state.photos.length).padStart(2, "0");
  const year = $("#year");
  if (year) year.textContent = String(new Date().getFullYear());
}

/* 支持直接访问 #slug 打开某张作品 */
function openFromHash() {
  const slug = decodeURIComponent(location.hash.replace(/^#/, ""));
  if (!slug) return;
  if (state.photos.some((p) => p.slug === slug)) {
    state.filter = "all";
    setFilter("all");
    openLightbox(slug);
  }
}

/* ------------------------------------------------------------------ 启动 */
async function init() {
  bindHeader();
  bindNav();
  bindLightbox();
  bindResize();

  try {
    const data = await loadData();
    applySiteCopy(data.site ?? {});
    renderFilters();
    applyFilter();
    syncStats();
    openFromHash();
  } catch (err) {
    console.error("[作品集] 数据加载失败：", err);
    $("#photoGrid").innerHTML = `
      <p class="notice">
        作品数据加载失败（${err.message}）。<br>
        请通过本地服务器打开本站，例如在项目目录执行
        <code>node tools/serve.mjs</code>，然后访问
        <code>http://127.0.0.1:5173/</code>。
      </p>`;
  }

  bindReveal();
}

init();
