# 原味藍圖｜職務設計（Job Design）模組 — 全數交接給 Codex

- 版本：v1
- 日期：2026-07-21
- 交出方：Claude（原 Job Design 實作者）
- 接手方：Codex（網站與產品全端整合負責者）
- 依據：使用者 2026-07-21 決定的新協作分工 —— Codex 為唯一實作與部署執行者，Claude 轉為唯讀的資料／安全／高風險技術審查者
- 狀態：**寫入權已交出。自本文件起，Claude 不再寫入 `tools/job-design/**`、`package.json`、`package-lock.json`。**

---

## 0. 交接一句話

Job Design 是一個**純前端、localStorage、Mock AI 的可 demo 原型**，外加一支**只跑在本機的 AI 代理**。它**沒有接 Auth、沒有接 Firestore、沒有任何伺服器端權限控制**。所有檔案原地保留、未提交，請 Codex 直接接手，不需要我先收尾。

---

## 1. 交接檔案清單與 Git 狀態

全部**尚未提交**。請勿以 `git add -A` 整批暫存（工作區同時混有其他工作包的變更）。

### 已追蹤、已修改（M）

| 檔案 | 角色 |
|---|---|
| `tools/job-design/README.md` | 模組說明、驗證狀態、Demo 與正式版差異表 |
| `tools/job-design/index.html` | 案例列表、建立案例、講師／學員身分切換 |
| `tools/job-design/case.html` | 案例工作區主畫面（約 90 KB，最大單檔） |
| `tools/job-design/jd-fields.js` | 欄位字典與模組設定（資料驅動，沿用規格 field_id） |
| `tools/job-design/jd-store.js` | 持久層（localStorage）＋狀態機＋存取窗／72h 關閉 |
| `tools/job-design/jd-mock-ai.js` | Mock AI Provider，照《04_AI任務規格》輸出契約 |
| `tools/job-design/jd-word.js` | 組裝四份文件與待確認彙整（下載入口目前暫停） |
| `tools/job-design/jd-seed.js` | 導覽模式的三個預建示範案例 |

### 未追蹤、全新（??）

| 檔案 | 角色 | 交接備註 |
|---|---|---|
| `tools/job-design/jd-ai.js` | AI 供應商層：決定走真 AI 或 Mock，統一組裝提示詞 | 失敗一律 `return null` → 自動退回 Mock，流程不中斷 |
| `tools/job-design/jd-theme.css` | 模組專屬品牌外殼、三欄工作區、投影字級、響應式 | 與根目錄 `brand.css` 併用 |
| `tools/job-design/jobdesign-intro.html` | 對外說明頁（成熟度揭露） | `tools.html`、`organizations.html#job-design` 導向此頁 |
| `tools/job-design/settings.html` | 本機 AI 代理設定頁 | **見 §3 高風險項目** |
| `tools/job-design/server/ai-proxy.mjs` | 本機 AI 代理（Node 內建模組，零外部套件） | **見 §3 高風險項目** |
| `package.json` / `package-lock.json` | 開發工具設定（Rules 測試、部署腳本） | **見 §4 一致性缺口** |

### `.gitignore` 已加入（此變更屬安全性質，建議保留並隨 Job Design 一起提交）

```
tools/job-design/server/.ai-config.json
```

`.ai-config.json` 內含明文 API Key。目前本機尚未產生此檔（`server/` 只有 `ai-proxy.mjs`）。Hosting 端亦已被 `firebase.json` 的 `**/.*` 規則排除，屬雙重保護。

---

## 2. 架構重點（接手前必讀）

### 資料流

```
使用者口述
  → jd-ai.js askAi()  ── 代理沒開／沒 Key／失敗 ──▶ jd-mock-ai.js（規則式 Mock）
  → mergeIntoEnvelope() 併入 Mock 信封（確保缺欄位仍有預設值）
  → case.html 四欄人工確認
  → jd-store.js 寫入 localStorage
  → jd-word.js 組裝四份文件預覽
```

### 輸出契約（真 AI 與 Mock 形狀一致，畫面不需分支）

```json
{
  "organized_content": { ... },
  "inferences_requiring_confirmation": [{ "field": "", "note": "" }],
  "information_gaps": [{ "field": "", "message": "" }],
  "contradictions": [{ "message": "", "detail": "", "suggestion": "" }],
  "warnings": [""]
}
```

### 四份獨立文件（PO 決策 2026-07-19，取代原「單一合併 Word」）

| # | 文件 | 揭露 |
|---|---|---|
| ① | 引導與思考 | 內部 |
| ② | 職務說明書 | 內部 |
| ③ | 甄選流程設計書 | 內部 |
| ④ | JD 對外文案 | **唯一可對外** |

揭露邊界由**檔案層級**界定（封面標示），`QA-02` 會攔截把 L1–L5／內部等級寫進 JD 的違規。**這是產品安全設計，重構時請保留此邊界。**

### 刻意與正式版一致的部分

欄位 ID、模組流程、確認節點、資料形狀刻意與正式版計畫一致，**日後換 Firestore 後端不需改資料模型**。這是原型最重要的資產，請不要在改版時打散。

### 已知的原型取捨

| 項目 | 目前 | 正式版計畫 |
|---|---|---|
| 身分 | 畫面切換講師／學員（**無真實驗證**） | Firebase Auth + `jd_users` 角色 |
| 資料 | localStorage（**不跨裝置、不跨瀏覽器**） | Firestore `jd_*` 集合 + 逐筆 Rules |
| AI | 本機代理 or 前端 Mock | Cloud Functions callable + Secret Manager |
| 文件下載 | **入口暫停**，僅 HTML 預覽 | Cloud Function `docx` → Storage 簽名網址 |
| 72h 關閉 | 本機時間 + 頁面倒數（**可被使用者改系統時間繞過**） | Cloud Scheduler 冪等排程 |

---

## 3. 高風險項目 — Codex 決定提交／發布範圍前必須先看

以下為我以安全審查角色提出的**證據與影響**，不是阻擋決定。是否納入預覽／發布由使用者與 Codex 決定。

### R1（高）— `tools/job-design/**` 目前**不在** Hosting 忽略清單

`.github/workflows/firebase-hosting-pull-request.yml` 的註解宣稱忽略 `tools/job-design/**`，但 `firebase.json` 的 `hosting.ignore` 實際清單為：

```
firebase.json, **/.*, **/node_modules/**, firestore.rules, .tmp.driveupload/**,
*.lnk, sync_*.py, PRD/**, **/*.md, **/*.xlsx, mockups/**,
package.json, package-lock.json, tests/**
```

**沒有 `tools/job-design/**`。實際設定為準。** 只要這些檔案被 commit，就會出現在 PR preview，合併到 `main` 後也會上正式站。

**建議處置（擇一，由使用者決定）：**
1. 接受公開 → 確認 `jobdesign-intro.html` 的成熟度揭露文案足以說明「這不是公開自助服務」。
2. 暫不公開 → 在 `firebase.json` 的 ignore 加入 `tools/job-design/**`，並**同步修正 workflow 註解**，讓文件與實際一致。

無論選哪一個，請一併修掉註解與設定不一致的問題，這本身就是一個會誤導後續判斷的缺陷。

### R2（中）— `settings.html` 與 `server/ai-proxy.mjs` 會被當成靜態檔案公開送出

- `ai-proxy.mjs` 會以原始碼形式被任何人讀取。內容沒有秘密（Key 存在 gitignore 的 `.ai-config.json`），但等於公開一份「請在本機開一個代理」的說明。
- 更實際的問題：**從 https 正式站開啟 `settings.html`，瀏覽器會擋掉往 `http://127.0.0.1:8788` 的請求**（混合內容／Private Network Access）。也就是說 AI 設定頁在線上站台**必然顯示為離線**，使用者會以為壞掉。
- **建議：** 若 Job Design 要公開，`settings.html` 與 `server/` 應排除於 Hosting 之外，或在頁面明確標示「僅限本機開發環境使用」。

### R3（中）— 本機代理沒有任何請求驗證

`ai-proxy.mjs` 的 `/api/config`、`/api/ai`、`/api/test` **沒有 token 或密鑰**，只靠 CORS `ALLOWED_ORIGINS` 白名單。

- 目前尚可接受：白名單外的來源在 preflight（`OPTIONS`）就拿不到 `access-control-allow-origin`，瀏覽器會擋下；且只綁 `127.0.0.1`，不對外開放。
- 但**沒有檢查 `Host` 標頭**，理論上存在 DNS rebinding 風險；且**任何跑在本機的程式**都能直接打這個埠拿走設定狀態、消耗使用者的 API 額度。
- **建議（不阻擋 demo）：** 加上 `Host` 標頭檢查（只接受 `127.0.0.1:8788` / `localhost:8788`），並考慮啟動時產生一次性 token 由設定頁帶入。

### R4（低）— `fs.writeFileSync(..., { mode: 0o600 })` 在 Windows 上不生效

`.ai-config.json` 的權限保護在本專案的主要開發環境（Windows 11）**沒有效果**，檔案對同一使用者帳號下的任何程式可讀。屬已知限制，正式版改用 Secret Manager 後自然消失。

### R5（低）— `ALLOWED_ORIGINS` 白名單可能與實際埠不符

白名單寫死 8777 / 5000 / 3000。README 建議 `npx serve .`（預設可能是 3000 以外的埠）。**若使用者用了其他埠，AI 會靜默退回 Mock 而不報錯**——這是刻意的容錯設計，但對使用者而言難以分辨「AI 沒開」與「埠沒對上」。建議在設定頁顯示目前來源與白名單比對結果。

---

## 4. 一致性缺口（不是安全問題，但會讓別人踩坑）

**`package.json` / `package-lock.json` 目前未追蹤，但 `tests/rules.test.mjs` 已在 commit `7a7e7c5` 進版控。**

結果是：任何 clone 這個 repo 的人都拿得到 Rules 測試檔，卻沒有 `npm run test:rules` 這個腳本，也沒有 `@firebase/rules-unit-testing` 依賴，測試跑不起來。

**建議：** `package.json` 與 `package-lock.json` 應該提交（兩者都已在 `firebase.json` ignore 清單內，不會被部署）。這件事嚴格說屬於安全／CI 範疇，若使用者希望由我處理，請另立工作包指定這兩個檔案。

---

## 5. 目前的驗證狀態（README §目前驗證狀態 的原文摘要，請勿當成完整回歸）

**已在本機瀏覽器實測（2026-07-21 呈現層整合輪次，未修改任何 `.js` 或 `server/`）：**

- 完整流程走到四份文件預覽
- 權責矛盾阻擋
- 完整職務設計入口
- 左右欄四種狀態
- 1280／1440／1179／390 px 版面
- 引導者唯讀視窗與鍵盤焦點
- 頁面無水平溢位、無可見執行錯誤
- 首頁 console 已核對無錯誤

**尚未驗證：**

- 首頁以外各頁的完整 console 記錄
- 四份文件**下載**（`case.html` 已暫停下載按鈕，不在可驗證範圍）
- 真 AI 路徑的端到端（需實際 API Key，未執行）
- 72h 關閉機制的跨日行為

---

## 6. 對 Codex 的具體請求

1. **接手 `tools/job-design/**` 全部寫入權。** 我即刻起唯讀。
2. **先讀 `tools/job-design/README.md`**，它是這個模組最完整的現況文件，內容我確認為準確。
3. **決定提交範圍前，先處理 R1**（Hosting ignore 與 workflow 註解不一致），並把結論回報使用者。這會直接決定 Job Design 是否出現在 PR preview 與正式站。
4. **更新 `PRD/原味藍圖_跨代理交接與檔案占用表.md`**，把 `tools/job-design/**`、`package.json`、`package-lock.json` 的單一寫入者改為 Codex。此表為跨代理共用檔，依新規則由 Codex 統一維護，我未寫入。
5. **更新 `CLAUDE.md` 與 `AGENTS.md`** 以反映新分工（使用者已指定由 Codex 執行）。需要一併作廢的舊敘述：
   - `CLAUDE.md` 中把 `tools/job-design/*` 列為 Claude 所有的段落
   - `ASSESSMENT-TECH-REVIEW-004` 給我的「必要時最小修正」寫入授權 → 改為唯讀審查，修正交 Codex 整合
   - `RELEASE-PREVIEW-005` 給我的 stage／commit／push／開 PR 授權 → 全數移交 Codex
   - 保留：我對資料模型、Rules、索引、Auth、權限矩陣、遷移與回復的獨立審查權，以及 P0／P1 是否阻擋發布的技術判定
6. **重構 `case.html`（90 KB）時，請保留 §2 的欄位 ID 與資料形狀**，那是日後接 Firestore 不用改資料模型的前提。

---

## 7. 需要 Codex 或使用者回覆的問題

| # | 問題 | 為什麼需要決定 |
|---|---|---|
| Q1 | Job Design 要不要公開上正式站？ | 決定 `firebase.json` ignore 是否要加 `tools/job-design/**`（R1） |
| Q2 | 若公開，`settings.html` 與 `server/` 是否一併公開？ | 線上站台的 AI 設定頁必然顯示離線（R2），可能造成使用者誤解 |
| Q3 | 本機 AI 代理是「僅開發者自用」還是「會交給講師／顧問使用」？ | 若會交給第三方，R3 的請求驗證就從「建議」升為「發布前必要」 |
| Q4 | `package.json` / `package-lock.json` 由誰提交？ | 目前已提交的 Rules 測試跑不起來（§4） |
| Q5 | 真 AI 路徑是否需要在預覽前完成端到端驗證？ | 目前完全未測；若不驗，README 的成熟度說明需再降一級 |

---

## 8. 我保留的職責（新分工下）

- Firestore 資料模型、查詢、索引審查
- Auth、Firestore Rules、角色與資料隔離審查
- 未登入／一般使用者／顧問／管理者的權限矩陣檢查
- 資料遷移、相容性、回復與殘留資料風險
- 未授權存取、提權、XSS、秘密洩漏、資料外露
- Rules／索引／Hosting／CI-CD／正式環境的一致性
- P0／P1 是否阻擋預覽或發布的技術判定

**Job Design 何時需要我再次介入：** 從 localStorage 遷移到 Firestore、`jd_*` 集合的 Rules 設計、AI 代理搬到 Cloud Functions + Secret Manager、文件下載改走 Storage 簽名網址——這四件事完成實作後，請交我審查再進發布。
