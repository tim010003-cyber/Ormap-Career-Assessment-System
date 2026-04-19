# 🔄 TWA 評測區 Gated-lite 交接指令

---

## 📦 當前狀態（2026-04-19）

### 本輪完成

**TWA 評測區（`tools/twa.html`）從「一坨 UI」重構為 Gated-lite 階層式揭示**

本輪實際連續推進了四輪討論，動到頁面三個大區塊：

1. **Landing 層**
   - valueIntro 區塊啟用（原本 `enabled: false`）、HTML 採方向 A 設計：純文字 + 左 teal 細引線 + 頁面水平居中，非卡片容器
   - eyebrow 修正：`"WHY YOU NEED  KNOW  WORK  VALUES"`（多空格、漏 TO）→ `"WHY YOU NEED TO KNOW WORK VALUES"`
   - Motivation/Reflection 五張卡片改用 emoji（🧭🌳🧩🍃🌱）+ 依 emoji 本色衍生的漸層容器（詳 `SYNC_GUIDE.md`）

2. **評測區 UX 核心重構**
   - 三階段 Gated-lite：現況滿意度 → 理想期待值 → 環境指標
   - 揭示機制：滑桿拖離 0 → 下階段 slide-down + fade（0.6 秒動畫）
   - 佔位灰階：未揭示階段仍顯示在 DOM、opacity 0.32 + grayscale 0.65，`pointer-events: none`
   - per-need 三階段步驟點（○ → ● active → ✓ done）+ global 進度條 1/20
   - 每階段加入完整操作介紹：「你目前在這項需求上有多滿意？」等主問句 + 分數意義說明 + 滑桿兩端文字標示（非常不滿意 / 非常滿意、不期待 / 非常期待）
   - 下一個需求完成時 teal 脈動提示（`highlightNextNeed`）

3. **頂部 bar 導航升級**
   - sticky 於 navbar 下方（`top: 64px`），模糊玻璃背景
   - 左側：`🔭 需求評測中 · [當前需求名] · 步驟 N/3`
   - 右側：`[☰ 目錄]` 按鈕 + `第 X/20 個需求`
   - IntersectionObserver 追蹤視窗中央的 `.need-title`，自動切換當前需求名（180ms fade）
   - 目錄面板：list 形式、狀態點（done 綠 / progress 半色 / pending 空心）、meta 標籤、點面板外 / X / Esc 關閉
   - 點目錄任一需求 → 自動展開對應 accordion → smooth scroll → 1.3 秒 teal 閃光（`jump-flash` 動畫）

4. **需求間緩衝 + sticky 修正**
   - `.need-wrap + .need-wrap { border-top: 8px solid #f8fafc }` — 同分類內需求之間 8px 灰分隔條
   - 原本的 `divide-y divide-slate-100` 已移除
   - 階段 3 padding 從 `py-5` 拉到 `py-6 lg:py-8`
   - `context-panel` sticky top 從 `5.5rem` 調整為 `calc(64px + 72px + 16px)` = 152px，避開新 global-bar
   - `scroll-mt-20` → `scroll-mt-40` 確保跳轉時不被頂部 bar 遮住

### 尚未處理

- **context panel 在階段 1/2 的新用途**：當使用者在現況滿意度/理想期待值階段時，右欄仍是 empty state（Hover 指標才有內容）。PO 上輪提到「可以讓右欄變成當前步驟的意義說明」，但這輪沒做，保留給下輪決定。
- **白板模式下目錄按鈕**：已設 `body.mirror-mode #catalog-toggle { display: none }`。但「當前需求名」追蹤在 mirror 模式下會受諮詢師自己捲動影響（已用 `if (window._isMirrorMode) return` 禁止啟動 observer），需要在白板實測確認。
- **SUPER_ADMIN_UID 硬編碼**（Phase 4 原有）仍未處理。
- **`counselors.html` 服務學員數統計**、**`assessment_done` 郵件路由**（Phase 4 原有）仍未處理。

---

## 🗂️ 本輪產出的檔案

放在 `/mnt/user-data/outputs/`（已全部打包）：

| 檔案 | 部署到 | 動作 |
|---|---|---|
| `twa.html` | `tools/twa.html` | 覆蓋 |
| `twa-landing.json` | `data/twa-landing.json` | 覆蓋（加 emoji 欄位、valueIntro 啟用） |
| `twa-matrix.json` | `data/twa-matrix.json` | 覆蓋（hover 去前綴、責任擔當 label 修好） |
| `sync_indicators_sheet.py` | 專案根目錄 | 新增 |
| `SYNC_GUIDE.md` | 專案根目錄 | 覆蓋（加 2026/04/19 一次性事項） |

---

## 🧠 重要技術決策紀錄（避免下輪重踩）

### 1. 為什麼用 Gated-lite 而非完全 Gated？

PO 原話：「我傾向用 Gated，但有沒有更輕鬆的設計，我的期待只是階層式的揭示資訊，並非真的要設計一個按鈕讓整體設計變複雜。」

Gated-lite 的精髓：
- **視覺上 Gated**（灰階 + 不可互動）→ 專注感
- **結構上不強制 commit**（沒有「下一步」按鈕）→ 不增加時間成本
- **自動揭示**（拖分數 > 0）→ 無摩擦
- **已填過的自動展開**（重訪友善）

### 2. 為什麼揭示門檻是「分數 > 0」而非「任何拖動」或「debounce」？

選項比較（當時提了 A/B/C 三案）：
- A. 任何拖動 → 誤觸會推進，體驗不好
- B. 分數 > 0 ⭐ **選這個**（滑桿預設就是 0，只有「刻意動了」才推進，符合「向內覺察」語氣）
- C. debounce 停止拖動 N 秒 → 改來改去反覆揭示/收起，煩躁

### 3. 為什麼雙層進度（global + per-need）？

單一層不夠：
- 只有 global 1/20：使用者知道整體進度，但不知道「這個需求我做到哪」
- 只有 per-need：不知道「這整件事還要多久」
- 雙層最清晰，放在不同位置（global 在頂部 sticky bar、per-need 在需求卡標題下）

### 4. 為什麼 IntersectionObserver 而非 scroll event？

- scroll event 每次觸發、效能差、要自己 debounce
- IntersectionObserver 由瀏覽器管理、效能好
- 用 `rootMargin: '-30% 0px -50% 0px'` 讓「視窗中央偏上 20%」的需求標題被偵測到（模仿閱讀的視線焦點）

### 5. 為什麼目錄放在頂部 bar 而非右側？

PO 原話：「這個跳轉功能是否有機會直接放在上方的『需求評測進行中』那邊？既然上面已經設計好了，我們就善加利用現有的設計去做進一步的調整。」

- 右側放目錄會與 context panel 爭版面
- 頂部 bar 本來就是「全站資訊樞紐」，加目錄語意一致
- 下拉面板形式最不擋內容（滿版 modal 會打斷心流）

### 6. 為什麼目錄用 list 而非 pill chip？

PO 偏好 list。原因合理：
- 每項有狀態標籤（已完成/進行中/未開始）→ list 放 meta 比 pill 自然
- 垂直列表對眼睛掃描更友善（中文閱讀偏好縱向）
- 面板寬度從 640px 縮到 420px，更緊湊

### 7. 為什麼 emoji 的漸層容器要匹配 emoji 本色？

**最大的設計陷阱**。第一版我用了「多色差異化」策略（teal / violet / amber 三張卡三種色系），結果 🧭（金+紅）配 teal-emerald-sky → **互補色對撞**。

PO 反饋：「我們的 emoji 跟你的 icon 渲染色其實是對比色，我覺得那個對比顏色太衝突了。你要不要直接找這個 emoji 裡面有的顏色去做設計就好了？」

新原則：**每個容器漸層必須在 emoji 主色的同色系**。
- 🧭 金黃 → amber/yellow/orange 漸層
- 🌳 綠 → emerald/green/lime 漸層
- 🧩 藍 → sky/blue/indigo 漸層
- 🍃 黃綠 → lime/green/emerald 漸層
- 🌱 鮮綠 → green/emerald/teal 漸層

### 8. 為什麼 class 用 `.need-wrap` 外殼 + `.need-wrap + .need-wrap` 緩衝？

原本每個需求卡直接放在 `<div class="divide-y">` 內，兄弟元素間只有一條細線。需要視覺緩衝，但不想打破 accordion 架構（避免變成 Phase 5 重構）。

解法：每個需求包一層 `.need-wrap`、用 `+` 相鄰選擇器讓第二個以後的需求在頂部加 8px 灰分隔條。第一個需求不受影響（上面是 accordion 標題 border）。

### 9. 為什麼不把 emoji 欄位塞進 xlsx 04 sheet？

兩個考量：
- emoji 這種東西很少動，手改 JSON 比走 sync 流程還快
- 塞進 xlsx 要改 sync 腳本，又增加維護負擔
- 保留 JSON 手改的彈性，未來真有需要再擴充

### 10. 字串拼接而非 template literal（延續前輪規則）

`type="module"` script 遇到某些編碼器會把 `\`` 和 `${}` 做怪 escape 導致整個 module 靜默失效。本輪所有新寫的 `renderCatalog`、`buildNeedCard`、`buildIndItem` 等都用字串 `+` 拼接。**新增 renderer 時請延續這個規則**。

---

## 🛠️ 架構相容性檢查（下輪動之前看這裡）

### Firestore schema 沒動
- `assessments` collection 的 `rawData.scores` / `rawData.currentScores` / `rawData.selected` 結構完全不變
- `whiteboard_sessions.liveData` 結構不變
- 報告 `report.html`、諮詢師後台 `admin.html`、白板 `whiteboard.html` 都不受影響

### 白板同步邏輯沒動
- `syncEverything()` 呼叫點沒變
- mirror 模式（`?mirror=1&sid=SID`）應該相容 — 已設 `body.mirror-mode` 讓所有 stage 強制展開、隱藏目錄按鈕、禁用 IntersectionObserver
- **未在真實白板 session 實測**，建議下輪確認

### 重訪/草稿自動存檔
- `localStorage` key 沒改
- `user_progress` 雲端草稿結構沒改
- `applyStageStates()` 會根據 `scores[id]` 和 `currentScores[id]` 自動決定進來時該顯示到哪個階段
- 驗證：使用者填了 10 題中途離開 → 再回來應該看到前 10 題全部展開到階段 3、剩餘 10 題從階段 1 開始

### 諮詢師後台
- `admin.html` 和 `report.html` 讀取 `rawData` 的邏輯沒變
- `assignedCounselorUid` 綁定機制沒變

---

## 🎨 PO 的設計偏好（持續更新中）

延續前輪：
- 留白重要、視覺一致 > 局部搶眼、儀式感 / 向內覺察、不寫 Python
- 對開發流程熟悉，不需要 deploy 教學
- 架構級決定先 propose 方案讓他選，不擅自實作

本輪新增：
- **專注當下的操作節奏**：使用者每一步應該只處理一件事，不要三件同時攤平
- **自動推進 > 按鈕確認**：增加按鈕 = 增加摩擦 = 壞體驗
- **視覺引導 > 強制規則**：灰階提示比「禁止操作」友善
- **配色要尊重物理**：emoji/圖案的原色決定容器色系，不能為了差異化破壞和諧
- **善用既有設計**：「頂部 bar 既然做了，就把目錄塞進去」— 不為了新功能新增區塊
- **願意做 mockup 再下決定**：這輪做了 2 份互動 mockup（Gated-lite 體驗、導航體驗），他都玩完才說 OK。下輪動 UX 重大調整時延續這個習慣

---

## ⚠️ 下次開啟新對話時的注意事項

1. **先讀 PRD v3.4**（有 Gated-lite 和目錄跳轉的完整規格）
2. **TWA 資料結構在 `rawData` 層**、**HTI 資料 `scores` 在頂層**（不動）
3. **Firestore 不想建複合索引**（前端排序取代）
4. **GAS 發信用 `new Image().src =` 而非 `fetch`**（302 redirect + CORS 問題）
5. **新增 renderer 用字串拼接，不用 template literal**（module script 靜默失效）
6. **emoji 配色原則**：容器漸層 = emoji 本色的同色系
7. **Gated-lite 門檻**：分數 > 0 才揭示下一階段
8. **寫完任何 script 功能都要提供清楚使用說明**

---

## 💬 下一個 Claude 的開場白建議

```
你好，我是 Ormap 職涯 SaaS 平台的產品負責人昆陽。上一輪對話我們把 TWA 評測區
從「一坨攤平的 UI」重構為 Gated-lite 階層式揭示，新增了頂部 bar 當前需求追蹤、
目錄跳轉、每個需求之間的視覺緩衝、以及每階段的操作說明。

【技術棧】純 HTML/JS + Tailwind CSS + Chart.js + Lucide + Firebase v10.8.1
【GitHub】https://github.com/tim010003-cyber/Ormap-Career-Assessment-System

【上一輪產出的檔案已部署】
- tools/twa.html（Gated-lite 三階段 + 頂部 bar 升級 + 目錄跳轉 + 需求緩衝）
- data/twa-landing.json（valueIntro 啟用、emoji 欄位）
- data/twa-matrix.json（hover 去前綴、責任擔當 label 修好）
- sync_indicators_sheet.py（xlsx 02 sheet → twa-matrix.json）
- SYNC_GUIDE.md（含 2026/04/19 一次性事項）

【PRD 請參考】v3.4（本輪後更新）

【本輪想做的】
請在此填入具體需求...
```

---

## 🏁 最後叮嚀

這輪改動的影響面：**純前端 UX**，沒有動到 Firestore schema、Firebase Auth、白板同步邏輯、GAS 發信、諮詢師後台等。如果下輪要做：

- **HTI 比照 TWA 做 Gated-lite**：需要大工程，先對齊架構（HTI 是點擊活動而非拖滑桿，互動邏輯不同）
- **context panel 階段 1/2 用途**：純 CSS/JS 調整，小工程
- **白板 mirror 模式全面驗證**：請拉一個學員 session 實測諮詢師看到的畫面
- **Phase 4 清單**：SUPER_ADMIN_UID 硬編碼、服務學員數統計、郵件路由等，都是小工程型任務

**PO 協作風格**：架構級決定先 propose 方案讓他選 → 玩 mockup 再決定 → 精準小步推進。

辛苦了，交接完成 🫡
