# 🚀 Ormap 原味藍圖｜系統規格書 v3.8

> **文件狀態**：Phase 9 + Phase 9.1 完成後的現況同步版
> **最後更新**：2026-07-16
> **撰寫方式**：由 Claude 逐檔閱讀實際程式碼（非僅依 PRD）盤點產出，作為 PRD v3.7（docx）的現況校正companion
> **GitHub**：https://github.com/tim010003-cyber/Ormap-Career-Assessment-System
> **線上網址**：https://careervalue-ormap.web.app
> **Firebase 專案**：careervalue-ormap

---

## 📌 本版與 PRD v3.7 的差異（為什麼要有這份文件）

PRD v3.7（docx）記錄到 **Phase 8**，把 **Phase 9（抽共用模組）標記為「規劃中」**。但實際 git 歷史顯示 Phase 9 與 Phase 9.1 都已完成並上線。本文件校正以下落差：

| 項目 | PRD v3.7 記載 | 程式碼實況（本文件） |
|---|---|---|
| Phase 9（抽共用模組 M1/M3/M4） | 🟠 規劃中 | ✅ 已完成，全站 9 個 HTML 已改 import 共用模組 |
| 共用模組 | 尚未存在 | ✅ `firebase-init.js` / `auth-utils.js` / `config.js` 存在且被引用（`gas-mailer.js` 已於 2026-07-16 隨發信功能整體移除） |
| Phase 9.1 諮詢師管理安全機制 | 完全未提及 | ✅ 已實作（降級兩步驟 + 自我保護 + 最後一個 SA 保護），見第七章 |
| GAS 發信系統 | 四種信件運作中 | ❌ **已於 2026-07-16 整體移除**（後端 `gas_mailer.gs` 停用，PO 拍板），所有邀請改複製連結手動傳送 |

---

## 🏛 一、系統架構

### 技術棧

| 層次 | 技術 |
|---|---|
| 前端 | 純 HTML5 + 原生 JavaScript（ES6 Modules），無框架、無 build step、無 bundler、無 package.json |
| 樣式 | Tailwind CSS（CDN `cdn.tailwindcss.com`，每頁 inline `tailwind.config`） |
| 圖表 | Chart.js（CDN） |
| 圖示 | Lucide Icons（CDN，鎖定 `@1.8.0`），全站統一，不混用 FontAwesome |
| 字體 | Noto Sans TC |
| 後端 | Firebase v10.8.1（Authentication + Cloud Firestore），SDK 由 gstatic CDN 載入 |
| 代管 | Firebase Hosting（serves repo root as-is） |
| 版控 | GitHub（Public Repo） |
| 發信 | ❌ 無（GAS 發信已於 2026-07-16 整體移除；邀請一律複製連結手動傳送） |
| 文案管理 | xlsx 主檔 → Python sync 腳本 → JSON |

### 全域規範

- **身分驗證**：Firebase `onAuthStateChanged` 為全站唯一身分判定標準；Google 帳號一鍵登入
- **自動存檔**：測驗進度雙重備份 → localStorage + Firestore `user_progress` 集合
- **CDN 版本鎖定**：全站鎖定具體版本號，禁用 `@latest`（避免上游 release 造成全站故障）
- **權限判斷統一原則**：諮詢師 / Super Admin 一律以 Firestore `counselors/{uid}` 為單一事實來源，禁止硬編碼 email 白名單或 UID
- **品牌色**：TWA 主色 teal-600 `#0d9488`（`primary`）；HTI 強調色 orange-500 `#f97316`；`secondary` = `#0f172a`
- **Emoji 使用規範**：Landing 卡片可用 emoji，容器漸層色系必須匹配 emoji 本色（避免互補色衝突）
- **落差語意設計**：全站不使用加減號（+/-）。缺口用「缺 X 分」（橘）、盈餘用「X 分／盈餘 X 分」（teal 綠）、持平用「0 分」（灰），由顏色承擔情緒語意
- **Renderer 撰寫規則**：新增 renderer 用字串 `+` 拼接，**不用 template literal**（`type="module"` script 遇某些編碼器會對 `` ` `` 與 `${}` 做怪 escape 導致整個 module 靜默失效）

---

## 📂 二、檔案目錄與職責

```
/ (根目錄)
├── index.html            登入頁；onAuth 後跳 dashboard
├── dashboard.html        登入者個人樞紐（歷史紀錄 / 工具入口 / 授權開關 / 重測）
├── report.html           TWA/HTI 學員報告引擎（最大檔 ~92KB / ~1550 行）
├── admin.html            諮詢師後台（看綁定學員；Super Admin 看全部）
├── counselors.html       Super Admin 專用諮詢師 CRM（含 Phase 9.1 安全機制）
├── timeline.html         TWA 縱向成長軌跡（僅 TWA、需 ≥2 筆）
├── whiteboard.html       諮詢師即時白板控制台 + 學員歡迎頁
├── firebase-init.js  ⭐  共用：Firebase 初始化（唯一 init 點）
├── auth-utils.js     ⭐  共用：角色權限判定
├── config.js         ⭐  共用：站台常數（目前無消費者，保留作未來常數的家）
├── firestore.rules       Firestore 安全規則（已進版控）
├── firebase.json         Hosting + Firestore 設定
├── sync_landing_sheet.py     04 sheet → twa-landing.json
├── sync_indicators_sheet.py  02 sheet → twa-matrix.json
├── ormap-logo.png
├── data/
│   ├── twa-matrix.json       20 項需求 + 環境指標（~112KB）
│   ├── twa-landing.json      TWA Landing 文案
│   ├── twa-config.json       決策狀態文案
│   ├── hti-activities.json   HTI 活動題庫 + module2A/2B（~70KB）
│   ├── hti-landing.json      HTI Landing 文案
│   ├── hti-reports.json      HTI 報告字典（blockA/B/C）
│   ├── TWA_完整資料庫_主檔.xlsx
│   ├── HTI_完整資料庫_主檔.xlsx
│   └── SYNC_GUIDE.md
└── PRD/
    └── (本規格書 + PRD docx)
```

### 頁面守衛與權限規範

| 頁面 | Super Admin | 一般諮詢師 | 學員 |
|---|---|---|---|
| index.html | 自動跳 dashboard | 自動跳 dashboard | 正常顯示 |
| dashboard.html | ✓ | ✓ | ✓ |
| admin.html | 看所有學員 | 只看綁定學員 | ✗ 拒絕 |
| counselors.html | ✓ 完整管理 | ✗ 拒絕 | ✗ 拒絕 |
| whiteboard.html | ✓ | ✓ | 學員歡迎頁（`?session=`） |
| report.html | 看所有報告（繞過 counselorAccess） | 只看綁定且 `counselorAccess !== false` | 只看自己 |
| timeline.html | ✓ | ✓ | ✓ |

---

## 🧩 三、共用模組層（Phase 9 產出）

> **設計原則**：跨頁邏輯的單一事實來源。任何頁面都應 import 這四個模組，而非重新實作。`tools/` 子目錄用 `../` 路徑。

### `firebase-init.js`
- 全站**唯一**初始化 Firebase 的地方，`firebaseConfig` 只在此出現一次（解決 M4：原本 8 檔 inline 重複）
- 只 `export { auth, db }`，不 export `app`（避免多重 init）
- 其他 SDK 動詞（`onAuthStateChanged` / `getDoc` / `setDoc` …）仍由各頁自行從 gstatic CDN import
- ⚠️ `firebaseConfig.apiKey` 公開於此檔屬設計（client-side key），真正的存取控制在 `firestore.rules`

### `auth-utils.js`
角色判定，唯一事實來源為 `counselors/{uid}`，全部 **fail-safe（任何錯誤回 `false`）**：
- `isCounselor(db, uid)` — `snap.exists() && data.isActive === true`
- `isSuperAdmin(db, uid)` — `data.isActive === true && data.isSuperAdmin === true`
- `migratePendingCounselor(db, uid, email)` — 受邀諮詢師首次登入時，把 email 命名的 pending 文件搬到 uid 命名文件。找到有效 pending 立刻 `return true` 放行，`setDoc`+`deleteDoc` 在背景執行（fire-and-forget，失敗下次登入重試）
- pendingKey 規則：email 的 `. # $ / [ ]` → `_`

**使用狀況**：dashboard / admin / whiteboard 用 `isCounselor`；admin 另用 `migratePendingCounselor` + `isSuperAdmin`；counselors 用 `isSuperAdmin`。
⚠️ **`report.html` 仍是 inline 自查**（未 import 本模組，且語意略有分歧，見第十七章 D4）。

### ~~`gas-mailer.js`~~（已刪除，2026-07-16）
- GAS 發信功能整體移除（後端 `gas_mailer.gs` 停用，PO 拍板），本模組與全部 `callGasMailer` 呼叫端一併刪除
- 歷史備考：當年用 `new Image().src` 觸發 GET 是為了跟隨 GAS 302 redirect、繞開 CORS（`fetch`+`no-cors` 會靜默失敗）——若未來重新引入 email，請改用正式後端（如 Cloud Functions），勿復刻此 workaround

### `config.js`
- 目前僅 `export const CONFIG_COUNSELOR_NAME = "何昆陽"`（顯示名稱 fallback）
- 新的全站常數放這裡，**永不放密鑰**

---

## 🔐 四、身分驗證與權限架構

### 4.1 三種角色

| 角色 | 定義 | 取得方式 |
|---|---|---|
| 學員 Student | 完成過任一評測的人 | Google 登入即為學員 |
| 諮詢師 Counselor | `counselors/{uid}` 存在且 `isActive: true` | Super Admin 在 counselors.html 新增 |
| Super Admin | 上述再加 `isSuperAdmin: true` | 初次部署需手動於 Firebase Console 建立第一份文件（bootstrap） |

### 4.2 `counselors/{uid}` 文件 Schema

```
{
  uid, email, name,
  isActive:     Boolean,   // 停用時失去諮詢師權限
  isSuperAdmin: Boolean,
  isDeleted:    Boolean,   // 軟刪除（垃圾桶）
  pending:      Boolean,   // pending 文件 = true；migration 後 = false
  addedAt, addedBy,        // bootstrap 文件 addedBy 可為 null
  deletedAt, lastLoginAt   // 生命週期時間戳
}
```
- 目前 PO 的 Super Admin UID：`jhEQJvOIrKgHiGGNqmjOciEGFY52`
- 受邀諮詢師先以 **email 命名的 pending 文件**存在，首次登入 admin.html 時由 `migratePendingCounselor` 搬到 `{uid}` 文件

### 4.3 counselorAccess vs assignedCounselorUid（授權設計｜方向 A + Super Admin 例外）

| 欄位 | 寫入時機 | 寫入者 | 用途 |
|---|---|---|---|
| `assignedCounselorUid` | 白板結束時 | 系統自動 | 標記「這份報告是哪位諮詢師陪做的」 |
| `counselorAccess` | 評測完成寫入 / 學員手動切換 | 系統 + 學員 | 可見性控制 |

**初始值**：`counselorAccess = !!window._wbSessionId`。
- 白板邀請流程做的評測 → `true`（接受邀請隱含同意查看）
- 學員自行測驗 → `false`（除本人與 Super Admin 外沒人看得到）

**諮詢師可見性（前端判定）**：`assignedCounselorUid === me && counselorAccess !== false`。
Super Admin **不受 counselorAccess 影響**（維運與審計需要）。
⚠️ **此判定目前僅在前端生效，Firestore 規則未落實**，見第十章與第十七章 A2。

---

## 🛡 五、Phase 9.1 諮詢師管理安全機制（本文件新增文件化｜PRD 未記載）

> 全部實作於 `counselors.html` 的 `loadCounselors()` 渲染邏輯（約 line 288–362），目的是**防止誤操作把系統搞到 0 個管理員或自廢武功**。

**三道防線：**

1. **降級兩步驟流程**
   `isSuperAdmin === true` 的卡片**只顯示「降級」按鈕**，刻意不給停用 / 升管理員 / 刪除。要停用或刪除一位 Super Admin，必須先 `upgradeAdmin(id, true)` 把他降為一般諮詢師（`isSuperAdmin: false`），下一次 re-render 才會出現停用 / 升管理員 / 移至垃圾桶按鈕。這是防手滑的二次確認機制。

2. **自我保護**
   `const isMe = d.id === currentUid`。若卡片是登入者本人，`if (isMe || isLastActiveSuperAdmin) return ''` 隱藏該列**所有**操作按鈕——你無法降級、停用或刪除自己。`currentUid` 於 `onAuthStateChanged` 擷取。

3. **最後一個 Super Admin 保護**
   `activeSuperAdminCount = activeDocs.filter(d => d.isSuperAdmin && d.isActive !== false).length`。
   當 `d.isSuperAdmin && isActive && activeSuperAdminCount <= 1` 時隱藏該卡片所有按鈕——不能把唯一的活躍管理員降到 0。
   不變式：N≥2 時可降級他人但永遠不能降自己（規則 2），故 UI 永遠無法把系統帶到 0 管理員。

⚠️ **重要限制（必須文件化）**：三道防線都是**前端 render-time gating**。`firestore.rules`（line 60–69）允許任何 Super Admin `create/update/delete` 任何 `counselors` 文件，因此有心的管理員可從 console 繞過。**這些防線防的是意外，不是蓄意繞過。**

---

## 🔄 六、核心使用者動線

### 一般學員
```
index（Google 登入）→ dashboard（歷史 / 選工具 / 「以此重測」）
  → tools/twa.html（Landing + Gated-lite 三階段）
  或 tools/hti.html（Landing + 活動點擊式）
  → 完成寫入 assessments
  → alert 成功 → 回 dashboard → 點「查看報告」→ report.html?id={docId}
```

### 即時白板諮詢
```
諮詢師 whiteboard.html → 建立 whiteboard_sessions/{sid}（status: waiting）→ 拿 ?session= 邀請連結
學員點連結 → whiteboard.html?session={sid}（歡迎頁）→ 登入 → 點「開始評測」
  → 寫 session studentUid + whiteboard_active/{uid} → redirect tools/twa.html?wb=1&sid={sid}
  → 進入即同步（立刻寫初始 liveData）→ 拖滑桿 500ms debounce 寫 liveData
諮詢師端 iframe 載入 tools/twa.html?mirror=1&sid={sid} → onSnapshot 訂閱 liveData → 唯讀渲染
諮詢結束 → 諮詢師按「結束」→ 批次寫 assignedCounselorUid + counselorAccess:true 到學員 assessments
```

### 諮詢師邀請
```
Super Admin counselors.html → 新增（email + name）→ 寫 pending 文件（email 命名）→ 複製邀請連結手動傳送（連結指向 /admin.html）
新諮詢師點連結登入 admin.html → migratePendingCounselor 搬遷 pending → uid 文件 → 完成綁定
```

---

## 🗄 七、Firestore 資料庫結構

### `assessments/{docId}`（測驗總庫）
```
{
  uid, toolType: "TWA"|"HTI", createdAt,
  clientInfo: { name, email, job, goal },
  summary: { text, status },
  assignedCounselorUid, assignedCounselorName,   // 白板結束時寫入
  counselorAccess: Boolean,                        // 授權狀態
  // TWA 專屬（注意在 rawData 層）
  rawData: { scores, currentScores, selectedItems, notes, radarScores, insight, top5, focusType },
  // HTI 專屬（注意在頂層，不在 rawData）
  scores: { R, I, A, S, E, C },
  topTraits: ["R","I","A"]
}
```
- `create` 規則為開放（匿名學員可提交）
- ⚠️ TWA 與 HTI 資料形狀不同（`rawData` 巢狀 vs 頂層），任何跨工具邏輯必須先分辨 `toolType`
- ⚠️ 兩者寫入時**都不記錄**產生它的 `sessionId`；白板來源只靠 `counselorAccess` 布林 + 事後的 `assignedCounselorUid`

### `user_progress/{uid}_{toolType}`（草稿暫存）
`{ uid, toolType, data, updatedAt }`；跨裝置同步未完成進度，約 30 秒 auto-sync。

### `counselor_notes/{uid}`（諮詢師筆記）
`{ uid, notes: Array<{text, counselorUid, counselorName, createdAt}> }`；**array 不是 sub-collection**，最多 10 筆前端 trim。
⚠️ whiteboard.html 的「儲存備忘」按鈕**沒有實際寫入此集合**（見第十七章 A5）；筆記寫入實際發生在 admin.html 詳情頁。

### `counselors/{uid}`
見 4.2。

### `whiteboard_sessions/{sid}`
```
{ counselorUid, counselorName, counselorEmail, studentUid, studentEmail,
  toolType, status: "waiting"|"active"|"ended", createdAt, endedAt,
  liveData: { scores, currentScores, selected, insight, focusType, activeId },  // TWA
  //          { stage, selectedIds, userMotives, finalScores, activeId }          // HTI
  liveAt }
```
- liveData 放在 session（而非學員 user_progress），因為 session 雙方都能讀寫

### `whiteboard_active/{uid}`
`{ sessionId, counselorName, toolType, status, createdAt }`；dashboard 用 `getDoc` 快速判斷是否顯示「白板進行中」橫幅。學員完成評測或諮詢結束時 delete。

---

## 🔒 八、Firestore Security Rules（現況）

Helper：`isSuperAdmin()`（查 `isSuperAdmin==true`）、`isCounselor()`（`isActive != false && isDeleted != true`）。

| Collection | Read | Write |
|---|---|---|
| assessments | **任何登入者**（⚠️ 見下） | create 全開；update 本人或諮詢師；delete 本人或 Super Admin |
| user_progress | 任何登入者 | docId 前綴須為本人 uid |
| counselor_notes | 諮詢師 | 諮詢師 |
| whiteboard_sessions（+ 子集合） | 任何登入者 | 任何登入者 |
| whiteboard_active | 任何登入者 | 任何登入者 |
| counselors | 任何登入者（isCounselor 查詢需要） | Super Admin 或本人（含 email pending 刪除） |

⚠️ **已知落差**：
- `assessments` 讀取為 `allow read: if request.auth != null` — **任何登入者可讀任何評測**。`counselorAccess` 撤銷與學員隱私**只在前端生效，DB 層未擋**。（A2）
- `counselors` 寫入未落實 Phase 9.1 的自我保護 / 最後管理員保護（A2 caveat）。
- `whiteboard_*` 為任何登入者可讀寫，範圍偏寬（延續現有設計）。

---

## 💻 九、TWA 評測模組（tools/twa.html）

### URL 參數
| 參數 | 行為 |
|---|---|
| `?wb=1&sid=` | 白板學員模式：設 `_wbSessionId`、寫 `whiteboard_active`、立即寫初始 liveData、拖滑桿 500ms debounce 同步 |
| `?mirror=1&sid=` | 鏡像模式：`body.mirror-mode`、所有 stage 強制展開、唯讀、禁用目錄與 IntersectionObserver |
| `?loadId=` | **真實載回**：從 `assessments/{docId}.rawData` 寫入 localStorage，去參數後 reload，微調另存 |

### Landing 區塊順序（由 twa-landing.json render 順序決定）
Hero → valueIntro（方向 A 純文字居中）→ Motivation（emoji 交錯卡）→ SOP → Identity 背景 → 開始儀式 CTA → 評測區 → Reflection → Final Report

### 評測區 Gated-lite 三階段揭示
- 階段 1 現況滿意度（0-10，預設 0）→ 拖離 0 揭示階段 2
- 階段 2 理想期待值（0-10，預設 0）→ 拖離 0 揭示階段 3；兩階段有差距顯示「落差 X 分」
- 階段 3 環境指標（由 twa-matrix.json indicators 產生）；預算限制 = ideal 分數總和，每指標依 `BUDGET_MAP` 消耗點數；hover 於右側 context panel 顯示職場場景
- **視覺 Gated**：未揭示階段 `opacity: 0.32 + grayscale 0.65 + pointer-events:none`；沒有「下一步」按鈕（拖動自動揭示）
- **重訪友善**：`applyStageStates()` 依 localStorage 分數自動展開到對應階段
- 頂部 sticky bar（`top:64px`）：`🔭 需求評測中 · 當前需求名 · 步驟 N/3` + `[☰ 目錄]` + `1/20` 進度條；當前需求名由 IntersectionObserver 追蹤視窗中央 `.need-title`
- localStorage key：`LPK_TWA_V2026_ULTIMATE_FINAL`

### 完成寫入
`saveToFirestore()` → `addDoc(assessments, {...rawData...})`，`counselorAccess = !!window._wbSessionId`；清 localStorage + 刪 `user_progress` + 刪 `whiteboard_active`。（原完成後的 GAS 通知信已於 2026-07-16 移除）

---

## 🩻 十、HTI 何倫特質模組（tools/hti.html）

### 評測模型
何倫六型 RIASEC。**活動點擊式**（非滑桿）：
- 階段 1 `renderMarket`：從 hti-activities.json 選 8–10 個活動（cap 10）
- 階段 2 `renderMotives`：每活動選 1–6 個動機（cap 6，動機標註 R/I/A/S/E/C）
- `processFinalScores` 計 R/I/A/S/E/C；近似平手時 `tie-modal` → `resolveTie` +0.5
- `generateReport` 取 Top1–3 + Chart.js 雷達
- localStorage key：`hti_progress_v4`；state = `{ stage, selectedIds, userMotives }`

### URL 參數
- `?wb=1&sid=`：已實作完整 + **每 3 秒強制同步**（比 TWA 積極）；liveData = `{stage, selectedIds, userMotives, finalScores, activeId}`
- `?mirror=1&sid=`：`body.hti-mirror-mode`，`applyMirrorLiveData` 重繪對應階段
- `?loadId=`：**重做 + banner 設計**（非載回）。因 HTI 儲存時只留最終 `scores`+`topTraits`，`selectedIds`/`userMotives` 已遺失，無法反推填答歷程。故清草稿後只顯示參考 banner「以前次紀錄（日期・核心特質）為基礎重測，完成後另存」

### 完成寫入
`addDoc(assessments, { toolType:'HTI', clientInfo{name,email}, scores, topTraits, summary, uid, counselorAccess, createdAt })`；清草稿 + 刪 `whiteboard_active` → 導回 dashboard。（原完成後的 GAS 通知信已於 2026-07-16 移除）

⚠️ **HTI 尚未做 TWA 等級的 Landing 模組化與雙段式報告**（列 backlog）。

---

## 📊 十一、TWA 報告引擎（report.html）

雙段式分析報告，渲染順序：Hero → Part 1 職涯輪廓摘要 → 六大價值觀雷達圖 → 九宮格逐格解讀 → 20 項需求明細 → 環境指標彙整（含複製）→ 個人體悟 → CTA。

**核心設計原則**：報告呈現客觀結構，諮詢師負責主觀詮釋（不過度解讀）。

### 兩套獨立分類維度
- **三態**（靠差距）：`渴望`（ideal−current ≥ 2）/ `盈餘`（current−ideal ≥ 2）/ `平衡`（差距 ≤ 1）；`ideal==0 && current==0` 為未評
- **九宮格**（靠絕對 band）：低 1-4 / 中 5-7 / 高 8-10，key = `{idealBand}-{currentBand}`，9 格各有 emoji + 短說明，點擊展開只列需求清單（不做長篇文案，保留諮詢空間）

### 其他
- Part 1：決策狀態 + 三態三卡 + 內嵌散點圖（jitter 分離重疊點、九格淡色背景、4.5/7.5 分隔）+ Top5
- 雷達圖：桌機 460px；雙層解讀（類別落差 > 10% 前 2 名 + 具體缺口前 3 名，**盈餘項排除**）
- 明細表：按六大類分組、類別 header 小計、5 欄、同類排序（缺口大→小 → 持平 → 盈餘 → 未評）
- 環境指標彙整：「複製全部」+ 分區「複製此區」，純文字存 `window.__indicatorsCopyText` / `__indicatorSectionTexts`，`navigator.clipboard` 優先 + textarea fallback
- 資料載入：`Promise.all` 並行 fetch `assessments/{id}` + `data/twa-matrix.json`，失敗用 `TWA_FALLBACK_MATRIX`（20 項，不白屏）
- **所有使用者輸入字串經 `escHtml()` 轉義**（安全示範，與 admin.html 形成對比）
- 權限三層：本人 → Super Admin（繞過 counselorAccess）→ 綁定諮詢師且 `counselorAccess !== false`；`!data.uid` 時 fail-safe 拒絕（H4）
- ⚠️ 權限判定為 **inline 自查**，未用 auth-utils（語意分歧，D4）
- HTI 報告 `renderHTIReport()` 維持早期規格，尚未升級雙段式

---

## ✉️ 十二、GAS 發信系統 — ❌ 已於 2026-07-16 整體移除

**PO 拍板停用後端 `gas_mailer.gs`，前端相關程式全數刪除。** 具體變動：

| 項目 | 移除內容 | 現行替代 |
|---|---|---|
| `gas-mailer.js` | 整檔刪除 | — |
| counselors.html | 「同時寄送邀請信」勾選、`invite_counselor` 呼叫、「重寄邀請」按鈕 | 新增後複製 `/admin.html` 邀請連結手動傳送 |
| whiteboard.html | 學員 Email 欄 + 寄信按鈕（`invite_student`）、結束時寄報告（`report_ready`）、`CONFIG_COUNSELOR_NAME` import | 複製 `?session=` 邀請連結手動傳送 |
| tools/twa.html / hti.html | 完成評測後的 `assessment_done` 通知 | 無（諮詢師由後台自行查看） |

歷史備考：舊系統用 `new Image().src` GET 觸發 GAS（為跟隨 302 redirect、繞開 CORS）。**若未來重新引入 email，請用正式後端（如 Cloud Functions + 交易信服務），勿復刻 GAS workaround。** 原「`assessment_done` 依 `assignedCounselorUid` 路由」待辦隨功能移除一併作廢。

---

## 📘 十三、xlsx → JSON 同步

| xlsx sheet | → JSON | 腳本 |
|---|---|---|
| 04_Landing_Page文案 | twa-landing.json | `sync_landing_sheet.py` |
| 02_環境指標清單 | twa-matrix.json 的 indicators[] | `sync_indicators_sheet.py` |
| 01_心理需求總覽 | twa-matrix.json 頂層 v/d/n | ❌ 尚未納入（手動編輯） |
| 03_決策狀態文案 | twa-config.json | ❌ 尚未納入 |

工作流：改 xlsx → 跑對應 sync（`--dry-run` 可預覽）→ `firebase deploy --only hosting` → **commit + push**（JSON 也是版控物件）。
細節與「一次性事項」（valueIntro、emoji、eyebrow、責任擔當 label）見 `data/SYNC_GUIDE.md`。
⚠️ sync 會覆蓋未納管欄位，編輯 data JSON 前必讀 SYNC_GUIDE.md。

---

## 🗺 十四、開發路線圖

### 已完成
- **Phase 1**（~2026/01）MVP：Firebase 基礎 + TWA/HTI 第一版 + index/dashboard
- **Phase 2**（02）CRM：admin / counselors / counselors collection / 邀請 migration
- **Phase 3**（03）即時白板：whiteboard + wb/mirror 模式 + liveData 同步 + timeline
- **Phase 3+**（03 末）GAS 四封信 + Security Rules 重寫
- **Phase 4**（04/18–19）TWA Gated-lite UX + 頂部 bar 導航 + 環境指標 sync
- **Phase 5**（04/24–25）TWA 報告引擎雙段式重寫（550→1552 行）
- **Phase 6**（04/25）白板修補 + 系統審計（459 行報告 / 18 項分級）+ Git 工作流診斷
- **Phase 7**（04/26）抽 auth-utils + 清 SUPER_ADMIN_UID / COUNSELOR_WHITELIST + counselorAccess 鏈路 + delete Rules
- **Phase 8**（04/26）18 項清 17 項：刪 invite.html / 重複 logo、HTI 重測 banner、report fail-safe、CDN 鎖版、git 衛生、firestore.rules 進版控
- **Phase 9**（04/27）抽共用模組：`firebase-init.js`（M4）+ `gas-mailer.js`（M1/M3）+ `config.js`，全 9 檔改 import
- **Phase 9.1**（04/27）counselors 降級兩步驟 + 自我保護 + 最後管理員保護（見第五章）

### Backlog（未完成）
- HTI 比照 TWA 做 Landing 模組化 / 報告雙段式（大工程）
- report.html 權限判定改用 auth-utils（D4）
- context panel 階段 1/2 的意義說明用途
- counselors.html 服務學員數統計
- `assessment_done` 改依 `assignedCounselorUid` 路由
- 「聯繫諮詢師」入口（自行測驗學員）
- 白板鏡像深化（L2–L4：hover / 捲動 / UI 狀態）
- xlsx sync 擴充（01 / 03 sheet）
- Pendulum 擺盪決策工具、付費解鎖（v4+）
- Email 通知重新引入評估（若做，用 Cloud Functions 等正式後端；GAS 方案已於 2026-07-16 廢棄）

---

## ⚠️ 十五、已知問題與技術債（2026-07-16 code review 產出）

> 依嚴重度分級。這些是本次逐檔閱讀程式碼**新發現**（PRD v3.7 未涵蓋）。

### 🔴 高
- ~~**A1 admin.html 儲存型 XSS**~~：✅ 2026-07-16 修復並上線（commit `4eded9d`）——admin.html 新增 `esc()`，全部使用者可控欄位（name / email / top5 / focusType / summary.text / 筆記）渲染前轉義。
- ~~**A2 assessments 讀取規則過寬**~~：✅ 2026-07-16 修復並部署（commit `4eded9d`）——Rules 將 `read` 拆為 `get`（鎖：本人 / Super Admin / 綁定且 `counselorAccess != false` 的諮詢師）與 `list`（維持登入可用，因 Firestore「規則非過濾器」，收緊 list 會弄壞 admin 的查詢）。**殘留**：惡意登入者仍可 `list` 列舉整個 collection；要收緊需查詢端 where 對齊 + `counselorAccess` 全面布林化，列 backlog。

### 🟠 中
- ~~**A3 GAS type 名稱不一致**~~：✅ 2026-07-16 以「功能整體移除」解決——PO 拍板停用 GAS 後端，`gas-mailer.js` 與全部呼叫端已刪除（見第十二章）。
- ~~**A4 whiteboard 結束後兩個競爭 redirect**~~：✅ 2026-07-16 修復（PO 拍板統一導向 `admin.html`）——`confirmEnd` 設 `window._endedByMe` 旗標，session 監聽器看到旗標即不再另排跳轉；「他端結束」情境也改導 `admin.html`。
- ~~**A5 whiteboard「儲存備忘」是空操作**~~：✅ 2026-07-16 修復（PO 拍板存進諮詢師筆記）——新增 `saveMemo()`，寫入 `counselor_notes/{學員uid}`，與 admin.html 筆記時間軸共用同一結構（text / counselorName / createdAtStr，最新在前、上限 10 筆）。學員未加入時擋下並提示。
- ~~**A6 HTI「能量聚焦度」(module 2A) 算了卻沒渲染**~~：✅ 2026-07-16 修復——「能量分佈客觀狀態」區塊改雙欄 grid，左 2A 聚焦度、右 2B 協作度；同時修正該區塊原本多一個 `</div>` 的結構錯誤。

### 🟢 低 / 整潔
- **A7 counselors.html onclick 注入面**：諮詢師 `name` 內含 `"` 或 `'` 會截斷 `onclick` 屬性 / JS 字串（`editName`/`permanentDelete`）。雖限 Super Admin 或本人可寫，仍應轉義。
- **A8 whiteboard 重複 `#student-screen` DOM**：未登入學員登入後會疊出第二個同 id 節點，`getElementById('student-err')` 命中隱藏節點。應先移除既有節點。
- **A9 whiteboard 結束綁定非原子**：`Promise.all` 多筆 `updateDoc`（非 `writeBatch`），部分失敗會半綁定。
- **A10 dashboard `checkActiveWhiteboards` 的 onSnapshot 未 unsubscribe**；`userName.innerText = user.displayName` 無 fallback 會顯示字面 `null`。
- **A11 HTI**：報告模板 `<div>` 開合不對稱（innerHTML 容錯，潛在）；`skipToReport()` 為 dead code（debug 殘留）。
- **A12 report.html inline 權限語意分歧（D4）**：用 `isActive !== false`（缺欄視為 active）且不查 `isDeleted`，與 auth-utils（`=== true`）及 rules（查 `isDeleted`）不同。目前因 softDelete 同時設 `isActive:false` 而不出錯，但脆弱。建議改用 auth-utils。
- **A13 admin.html dead code**：`ncCopyInvite`（讀不存在的 `#nc-invite-url`）、`openWhiteboard`（未使用別名）。
- **A14 counselors.html 細節**：重複 email 早退後按鈕標籤被 `finally` 蓋成「新增」；`pendingKey` regex 與 auth-utils 有 `\` 差異（應抽共用 helper）；重複檢查會誤攔垃圾桶內的人。
- **A15 firebase.json**：hosting `ignore` 只排除了 `sync_indicators_sheet.py`，漏 `sync_landing_sheet.py`（會被部署到 hosting）。
- **A16 資料形狀不一致**：TWA 用 `rawData` 巢狀、HTI 用頂層；兩者都不存來源 `sessionId`。屬設計現況，建議文件化。
- **A17 Phase 9.1 三道防線僅前端**：Rules 未落實，Super Admin 可從 console 繞過（防意外非防蓄意）。
- **A18 白板諮詢師註記層（畫筆 / 便利貼）為純本機狀態**：不同步給學員、不持久化、reload 消失。若定位為諮詢師私用暫存則 OK，需文件化。

### 文件 / 流程債
- PRD v3.7（docx）落後程式碼一個 Phase；本規格書為校正版
- 兩個 commit 訊息一字不差（`c534f4e`/`8ac9625`），違反 PRD 第十五章 15.2
- 工作目錄仍在 OneDrive（15.4 中長期風險未解）
- PRD docx、CLAUDE.md、本文件目前**未進版控**（`??`）

---

## 🤖 十六、AI 開發交接指令（精要）

開新對話時貼給 AI：

```
專案：Ormap 原味藍圖職涯評測 SaaS
技術：純 HTML/JS + Tailwind(CDN) + Chart.js + Lucide@1.8.0 + Firebase 10.8.1（Auth+Firestore）；無發信功能（GAS 已於 2026-07-16 移除）
共用模組（必 import，勿重造）：firebase-init.js / auth-utils.js / config.js（tools/ 用 ../）
權限：唯一事實來源 counselors/{uid}，用 isCounselor / isSuperAdmin，禁硬編碼
資料契約：TWA 在 rawData.{scores,currentScores,...}；HTI 在頂層 scores.{R..C}+topTraits
counselorAccess = !!window._wbSessionId；諮詢師可見 = assignedCounselorUid==me && counselorAccess!==false；Super Admin 繞過
白板：學員 ?wb=1&sid= 寫 liveData；諮詢師 iframe ?mirror=1&sid= 訂閱；結束寫 assignedCounselorUid
發信：無。GAS 已於 2026-07-16 整體移除，勿重新引入 gas-mailer.js / callGasMailer；邀請一律複製連結
規則：.gitattributes 標 *.html 為 binary（git 不顯示 HTML diff，用讀檔 review）；renderer 用字串拼接不用 template literal
UI：TWA teal #0d9488 / HTI orange #f97316；落差不用加減號；emoji 容器漸層配 emoji 本色
協作：架構級決定先 propose 讓 PO 選；重大 UX 先做 mockup；精準小步；commit 後記得 push
⚠️ 動手前先看本規格書第十五章「已知問題」（A1/A2/A3 已於 2026-07-16 修復或作廢，其餘見清單）
```

---

*本規格書由 Claude 於 2026-07-16 逐檔閱讀實際程式碼盤點產出。與 PRD v3.7（docx）如有出入，以程式碼實況為準。*
