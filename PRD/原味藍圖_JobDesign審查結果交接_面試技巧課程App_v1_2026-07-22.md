# 原味藍圖｜JOB-DESIGN-POSITIONING-015 審查結果交接

> 文件狀態：**交接用／待接手代理處理**
> 建立日期：2026-07-22
> 來源：Claude 執行 `JOB-DESIGN-POSITIONING-015` 唯讀技術審查後的結果移交
> 接手對象：面試技巧課程 App 開發任務
> 前提：本審查**未修改任何檔案**。以下所有問題目前**仍存在於工作區**，尚未修復、未提交、未部署。

---

## 0. 給接手者的重點摘要

我完成了 `organizations.html`、`tools.html`、`tools/job-design/jobdesign-intro.html`、
`tools/job-design/index.html`、`tools/job-design/jd-theme.css` 的唯讀技術審查。

**底層功能是好的**——三個預建案例、建立案例、四份文件產出全部實測通過，零 JS 錯誤。
問題集中在**公開曝光邊界**與**一個因 UI 移除造成的角色功能死路**。

其中 **P2-1（講師身分無法設定）與課程 App 直接相關**，請優先確認你的設計是否依賴
`getIdentity()`／`isInstructor()`，避免重複踩同一個坑。

---

## 1. 需要接手處理的問題

### P1｜公開頁面把「AI 設定」當一般入口，該頁含 API Key 輸入框

| 項目 | 內容 |
|---|---|
| 檔案 | `tools/job-design/index.html:68`（主要動作列 `#aiChip`）<br>`tools/job-design/case.html:49`（頁尾「AI 設定」連結） |
| 目標頁 | `tools/job-design/settings.html`，`<h1>` 為「讓工具用真的 AI 整理」，含 `<input id="apiKey" type="password">` |
| 重現 | 開 `/tools/job-design/` → 動作列右側「AI 設定 · 模擬整理」→ 進入含金鑰輸入框的頁面 |

**影響**

1. 牴觸 `JOB-DESIGN-POSITIONING-015` 的驗收條件「公開頁面不再把 AI 設定或尚未成熟功能當成一般使用入口」。
2. **憑證引導風險**：`firebase.json` 的 ignore 清單**未包含** `tools/job-design/**`
   （已於預覽站實測 `tools/job-design/index.html` 回應 200），因此該目錄會對公開網際網路提供服務。
   訪客會在公開網址上看到 API Key 輸入框。金鑰雖送往 `127.0.0.1:8788`，但呈現這個輸入框本身就是危險引導。
3. **部署後必然失效且報錯**：HTTPS 頁面 fetch `http://127.0.0.1:8788` 屬 mixed content，會被瀏覽器封鎖。
   `jd-ai.js` 的 try/catch 會接住並退回 Mock（流程不中斷，此降級設計正確），
   但 mixed-content 錯誤**無法被 catch 抑制**，公開站每次載入都會出現 console 錯誤。

**驗證限制**：第 3 點的 HTTPS 封鎖為依瀏覽器規格推論。`settings.html` 與 `jd-ai.js` 目前是
untracked、尚未部署，**無法在預覽站實測**。本機以 http 驗證過退場行為正確。

**建議選項（需使用者裁示公開範圍）**

- 低成本：移除 `index.html` 的 `aiChip` 與 `case.html` 頁尾連結，改為手動輸入網址進入。
- 徹底：把 `settings.html`、`jd-ai.js`、`server/` 加入 `firebase.json` ignore。
  **屬公開範圍決策，不可由代理逕自變更。**

---

### P2-1｜身分切換 UI 被移除，`getIdentity()` 仍在使用 → 「講師重新開放」永久不可達

**⚠️ 此項與課程 App 直接相關，請優先確認。**

| 項目 | 內容 |
|---|---|
| 移除處 | `tools/job-design/index.html`（本次移除 `#identitySwitch` markup、`getIdentity/setIdentity` import 與事件綁定） |
| 受害處 | `tools/job-design/case.html:578`（reopen 分支）、`case.html:579`（`reopenBtn` 事件） |
| 過期註解 | `case.html:92`：「身分（學員／講師）切換**移到案例列表頁**」——但那個頁面的切換已被移除 |

**現象**
全站已無任何 UI 可呼叫 `setIdentity()`。`getIdentity()` 永遠回傳預設值 `'student'`（已實測確認）。

**重現**
案例達 72 小時關閉時間 → 橫幅顯示「需講師重新開放。」→ `isInstructor()` 恆為 false
→ 「講師重新開放 24 小時」按鈕永不出現 → `reopenBtn` 事件綁定成為死碼 → **案例永久無法重開**。

**副作用**
`jd-store.js` 的 `confirmField()` 中 `confirmed_by = getIdentity()`、稽核事件的 `actor`
現在恆為 `'student'`，**稽核軌跡失去講師／學員區別**。

**觸發條件**：需首次下載後經過 72 小時，短期體驗不會遇到，屬**潛伏性**問題。

**建議選項**
- (a) 為講師保留隱藏入口（query param 或設定頁）。
- (b) 若公開版確定不需要講師角色，一併移除 `case.html` 的 reopen 分支與過期註解，避免留下死碼。
- (c) 明確記錄「講師功能僅在課程環境啟用」，並由課程 App 提供身分來源。

**給課程 App 的提醒**：若你打算以 `getIdentity()`／`isInstructor()` 作為講師／學員分流依據，
目前這個機制**沒有任何寫入端**。請先決定身分來源（課程授權碼？獨立設定？），
再決定是否沿用 `jd-store.js` 的 `LS_IDENTITY`（`ormap_jobdesign_identity_v1`）。

---

### P3-1｜`index.html` 依賴尚未納入版控的檔案

`settings.html`、`jd-ai.js`、`jd-transform-rules.js`、`server/` 目前皆為 untracked。

若只提交 `index.html` 而未提交這些：
- `aiChip` 連結 404；
- `import { aiStatus } from './jd-ai.js'` 會使**整個 module script 解析失敗**，
  連帶導致案例列表無法渲染（整頁功能失效，非僅該區塊）。

屬**提交順序風險**，非目前程式錯誤。提交時務必整批一起處理，或先移除相依。

---

### P3-2｜色票改為手工 shim，缺乏防護

本次移除了 `index.html` 的 inline `tailwind.config`，改由 `jd-theme.css` 以 `.jd-app`
作用域**手寫**重現 `bg-navy`、`text-tealdeep`、`bg-tealgreen/10` 等工具類（共 108 條 `.jd-app` 規則）。

**現況良好**：已逐一比對 `index.html` 靜態 `class` 屬性與 JS 注入的全部自訂色 class，
**100% 覆蓋，實測顏色正確**（`.bg-navy` → `rgb(20, 32, 51)`）。

**風險**：今後任何人在 markup 加入未列舉的色階（例如 `bg-navy/45`）會**靜默失效、無錯誤訊息**。
建議在 `jd-theme.css` 標頭加註此限制，或改回 inline `tailwind.config`。

---

### P3-3｜`case.html` 無 `<h1>`

`case.html` 的 `h1` 數為 0（標題由 JS 注入為其他層級）。其餘四頁皆為單一 h1。
a11y 小瑕疵，`case.html` 不在本輪審查範圍，僅記錄。

---

## 2. 已驗證通過，接手者不需重測

以下為本次**實測**結果（本機 `npx serve`，未登入、未連 Firebase）：

**功能**
- 三個預建案例全部正常渲染，**零 JS 錯誤、零 unhandled rejection**：
  - `case_demo_customer`：80 欄位／pending 0
  - `case_demo_contradiction`：10 欄位／pending 16
  - `case_demo_patha`：135 欄位／pending 0
- 四份文件（`guide`／`jobdesc`／`selection`／`jd`）對三個案例**全部成功產生**，
  內容無 `undefined`／`NaN`／`[object Object]` 洩漏。
- 建立本機練習案例實測成功（localStorage 3 → 4 筆，欄位正確寫入）。
- `buildForm()` 移除 multiselect 分支**是正確的**：`CASE_FIELDS` 已改為 3 個 text + 1 個 date，
  新增的 `type="date"` 帶今日預設值，必填驗證可通過。
- `jd-ai.js` 在代理未啟動時正確退回 Mock，不中斷流程（此降級設計正確，請勿改壞）。

**連結與版面**
- 六頁全部 200，**零斷連、零失效錨點**（含 `#experience`、`#cases`、`#blind-spots`）。
- 390／768／1024／1280 四種寬度**全無水平溢位**。
- skip link、行動版選單、頁尾在四頁皆齊備；四頁均為單一 `h1` 與單一 `main`。

**定位陳述**
- `organizations.html`、`tools.html`、`jobdesign-intro.html` 的邊界揭露**紮實且正確**：
  「示範環境使用瀏覽器本機資料，不是正式企業自助系統」「本頁不提供付款」
  「請先不要傳送履歷、員工資料」。
- 「雲端」「帳號」兩處出現時都明確標記為**尚未提供**
  （「不代表正式雲端產品」「後續產品化：帳號、組織資料隔離、多人簽核、正式 AI」）。
- **此部分沒有誤導，不需修改。**

---

## 3. 邊界與注意事項

- 本輪審查**未處理**：Auth、Firestore、組織資料隔離、正式 AI、金流、付費牆、下載權限、
  部署、提交、合併 main。
- `settings.html`、`jd-ai.js`、`server/` 本身的實作品質**不在審查範圍**，
  僅就其「從公開頁可達」提出 P1。
- 修改任何檔案前，請先在 `PRD/原味藍圖_跨代理交接與檔案占用表.md` claim 該路徑。
- `firebase.json` 與 `.github/workflows/*` 屬發布範圍，變更需使用者核准。
- 不可 blanket-stage 工作區；目前工作區同時存在多個工作包的未提交變更。
- `.claude/settings.local.json` 不可提交（已由全域 gitignore 涵蓋）。

---

## 4. 目前倉庫狀態

- 分支：`release/preview-2026-07-21`，最新 commit `e6037e2`，已推送。
- `origin/main` 仍在 `12c8eb0`；正式站不含今日成果。
- 尚未開 PR、未合併、未部署正式站。
- 預覽頻道 `https://careervalue-ormap--release-preview-20260721-j9rrdh9r.web.app`
  含先前批次，**不含**本次 `JOB-DESIGN-POSITIONING-015` 的變更（仍未提交）。
- 工作區未提交檔案包含：本次五個審查標的、`tools/job-design/*` 其餘檔案、
  `settings.html`／`jd-ai.js`／`jd-transform-rules.js`／`server/`（untracked）、多份 PRD 文件。

---

## 5. 需要使用者裁示的決策點

1. **公開範圍**：`tools/job-design/settings.html`、`jd-ai.js`、`server/` 是否要加入
   `firebase.json` ignore？（影響公開曝光，代理不可自行決定）
2. **講師角色**：公開版是否保留講師身分？若保留，身分來源為何？
3. **AI 設定入口**：完全移除公開入口，或改為僅在課程／顧問環境顯示？
