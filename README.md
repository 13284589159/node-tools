# 林澈 · 个人摄影作品集

一个纯静态的个人摄影网站：**HTML + CSS + 原生 JavaScript**，不需要任何构建工具、框架或依赖。
当前作品位置使用网络下载的免费占位图（[Lorem Picsum](https://picsum.photos)）填充，替换成自己的照片即可直接上线。

---

## 1. 快速预览

必须通过本地服务器打开（作品列表来自 `fetch` 读取的 JSON，`file://` 直接双击会被浏览器拦截）。

```bash
node tools/serve.mjs          # 默认 http://127.0.0.1:5173/
node tools/serve.mjs 8080     # 或指定端口
```

也可以用任何静态服务器，例如 `python -m http.server`、`npx serve`、VS Code 的 Live Server。

## 2. 目录结构

```
my-website/
├── index.html                     # 页面结构（首屏 / 作品集 / 关于 / 联系 / 页脚 / 灯箱）
├── assets/
│   ├── css/style.css              # 全部样式（含响应式与动效）
│   ├── js/main.js                 # 全部交互（渲染、筛选、灯箱、滚动动效）
│   ├── favicon.svg
│   └── photos/
│       ├── photos.json            # ★ 作品与站点信息数据源
│       ├── *.jpg                  # 24 张作品图（占位）
│       └── thumbs/*.svg           # 同比例骨架占位图，避免加载时布局跳动
├── tools/
│   ├── fetch-images.mjs           # 下载占位图到 assets/photos/
│   ├── make-thumbs.mjs            # 生成骨架占位图
│   ├── verify.mjs                 # 校验 photos.json 与实际图片是否一致
│   ├── check-grid.mjs             # 复算瀑布流分列是否均衡
│   └── serve.mjs                  # 零依赖本地预览服务器
├── package.json
└── README.md
```

## 3. 网站包含的功能

- **全屏首屏**：背景大图 + 缓慢推近动画、姓名、标语、简介、数据条、滚动提示
- **作品瀑布流**：先放高图、放进最矮一列的分列算法，各列高度基本齐平；
  图片按原始比例完整显示（不做裁切），手机 1 列 / 平板 2 列 / 桌面 3 列自动切换
- **分类筛选**：全部 / 风光 / 城市 / 人文 / 自然，带数量统计，切换即重新分列
- **大图查看（灯箱）**：左右切换、键盘 `←` `→` `Esc`、移动端左右滑动、上一张/下一张预加载、
  拍摄信息（年份 / 器材 / 参数）面板可折叠，支持 `网址#作品slug` 深链接
- **细节体验**：图片懒加载 + 同比例骨架占位（不跳版）、鼠标悬停浮起标题、滚动进入动画、
  顶部滚动进度条、移动端菜单、键盘焦点锁定、`prefers-reduced-motion` 无障碍降级

## 4. 自检脚本

```bash
node tools/verify.mjs       # 检查每张图是否存在、json 里的宽高与真实 JPEG 是否一致
node tools/check-grid.mjs   # 复算各视口下列高是否均衡、有没有图片被裁掉
```

## 5. 换成自己的照片

1. 把自己的图片放进 `assets/photos/`（建议长边 1600px、JPEG、质量 80 左右，单张 200–500KB）。
2. 编辑 `assets/photos/photos.json` 里的 `photos` 数组，每一项对应一张作品：

```json
{
  "slug": "misty-valley",          // 唯一标识，也用作 #锚点
  "file": "misty-valley.jpg",      // assets/photos/ 下的文件名
  "thumb": "thumbs/misty-valley.svg",  // 骨架占位图，可留空 ""
  "width": 1600,                   // 真实像素尺寸，用于计算瀑布流比例
  "height": 1067,
  "title": "雾中山谷",
  "category": "landscape",         // 必须是 categories 里已有的 id
  "location": "云南 · 怒江",
  "year": 2024,
  "camera": "Sony A7R V · 24-70mm",
  "exif": "f/8 · 1/250s · ISO 100",
  "featured": true                 // 预留字段，可标记首页推荐
}
```

3. 站点的姓名、标语、简介、邮箱、社交链接也都在同一个文件的 `site` 字段里，改完刷新即可。
4. 新增分类：在 `categories` 里加一项（`id` 用英文、`label` 是显示名称），筛选按钮会自动生成。

> 骨架占位图可以省掉：把 `thumb` 设为 `""`，卡片会用深色底显示直到大图加载完成。

## 6. 重新下载占位图（可选）

```bash
node tools/fetch-images.mjs    # 重新下载 24 张占位图，并生成 _download-report.json
node tools/make-thumbs.mjs     # 重新生成骨架占位图
```

## 7. 上线

纯静态站点，`index.html` + `assets/` 直接部署即可，例如：

- GitHub Pages：把仓库根目录设为 Pages 源
- Vercel / Netlify：框架选 “Other / Static”，构建命令留空，输出目录填 `.`
- 任意虚拟主机 / 对象存储：整体上传，注意 `photos.json` 的 `Content-Type` 为 `application/json`

## 8. 图片版权说明

`assets/photos/` 中的图片来自 [Lorem Picsum](https://picsum.photos)（图片源为 Unsplash），
版权归各自摄影师所有，**仅用于版式演示**，请勿直接作为自己的作品对外发布或商用。
页脚已注明来源；替换为自己的作品后可自行删掉该行说明。
