# 原味藍圖｜Claude Code 前端實作交接

## 1. 本次交付

- 視覺與互動原型：`mockups/frontend-prototype.html`
- 首頁吸引子定稿：`mockups/home-attractor.html`
- 原型是純前端示例，不連接 Firebase、不寫入資料、不代表後端功能已完成。

## 2. 原型涵蓋的體驗

1. 品牌首頁與問題導向入口。
2. 工具目錄及「個人職涯／整體生涯／組織與人才」篩選。
3. 已上線工具詳情頁。
4. 三題示範評測流程、進度、選項與前後移動。
5. 結果摘要、分布、洞察與行動驗證。
6. 「我的藍圖」個人中心。
7. 組織與人才服務入口。
8. 1440、768、390 的響應式結構。

## 3. 不可自行改寫的設計基準

- Hero 定稿文案以 `mockups/home-attractor.html` 為唯一來源。
- 吸引子語意是「目標與方向可以清楚，抵達的路不只一條」。不得改成無終點、反計畫、純隨機或宿命論。
- 品牌語氣是支持、清醒、具體，不製造焦慮，不替使用者做決定。
- 首頁第一層採問題導向；專業分類只作第二層標籤。
- 已上線工具必須比開發中工具更醒目。規劃中功能不可呈現為可操作的假按鈕。
- 組織端應在個人探索之後才出現，不與 Hero 競爭。

## 4. 建議正式元件

| 原型區塊 | 建議元件／責任 |
|---|---|
| 全站導覽 | `SiteHeader`、路由、登入狀態 |
| 首頁 Hero | `HomeHero`，文案凍結 |
| 問題入口 | `ProblemEntryGrid` |
| 工具目錄 | `ToolCatalog`、`ToolCard`、狀態與分類篩選 |
| 工具詳情 | `ToolIntroduction` |
| 評測流程 | `AssessmentShell`、`QuestionCard`、`ProgressBar` |
| 結果報告 | `ReportHero`、`ScoreDistribution`、`InsightCard`、`ActionExperiment` |
| 個人中心 | `BlueprintDashboard`、歷程與待辦 |
| 組織服務 | `OrganizationServiceLanding` |

現有專案為靜態 HTML，不要求為了元件名稱導入框架。若維持原架構，以上責任可拆成共用 CSS、共用 ES module 與每頁語意區塊。

## 5. 正式路由映射建議

| 體驗 | 現況／目標 |
|---|---|
| 首頁 | 將核准設計移植到 `index.html`，但保留正式登入行為 |
| 工具目錄 | 可先由新版 `dashboard.html` 承接，或新增公開 `tools.html` 後再決策 |
| 工作價值羅盤 | 保留 `tools/twa.html` 的正式評測與 mirror mode |
| 何倫興趣與行動風格 | 保留 `tools/hti.html` 的正式評測與 mirror mode |
| 報告 | 保留 `report.html` 的 Firestore 讀取與既有參數 |
| 個人中心 | 由 `dashboard.html` 承接 |
| 組織服務 | 首期可為首頁區塊，不需先建立不存在的交易或預約功能 |

## 6. Claude Code 必須保留的技術行為

- Firebase SDK 維持 10.8.1，使用 `firebase-init.js` 與 `auth-utils.js`，不要複製初始化邏輯。
- TWA／HTI 的資料仍由 `data/*.json` 驅動；修改前遵守 `data/SYNC_GUIDE.md`。
- TWA／HTI 必須繼續支援 whiteboard mirror mode。
- 不在前端放 AI API 金鑰、授權碼安全邏輯、EDM 或金流秘密。
- 履歷診斷與職缺分析目前只能呈現規劃說明；實作前需先有後端與資料處理決策。
- 不重新導入已移除的 GAS 寄信流程。

## 7. 建議實作順序

1. 先盤點 `index.html`、`dashboard.html`、`tools/twa.html`、`tools/hti.html`、`report.html` 的既有 DOM 與事件。
2. 抽出色彩、字體、間距、按鈕、卡片與 focus 樣式；不先動功能。
3. 移植首頁視覺，確認登入與導向沒有退化。
4. 建立公開工具目錄或改造 dashboard；先取得產品決策後再選路由。
5. 只替 TWA、HTI 套入評測外殼視覺，保留計分、自動儲存及 mirror mode。
6. 改造報告呈現，保留查詢參數、資料讀取與權限行為。
7. 最後處理個人中心與跨工具歷程；資料模型變更應另列後端任務。
8. 每一階段分別驗證 1440×900、768×1024、390×844。

## 8. 功能與設計邊界

### 可直接依原型實作

- 視覺系統、響應式布局、工具卡、篩選、導覽、評測外殼、報告資訊層級。

### 需接現有功能，不可用原型 JS 取代

- Google 登入、權限、Firestore、評測題目、計分、報告、進度儲存、白板同步。

### 尚需產品／後端決策

- 公開工具目錄是否使用獨立路由。
- 跨工具「我的藍圖」資料模型。
- 履歷／職缺 AI 的隱私、保存、刪除、費用與可追溯設計。
- 課程授權碼、下載、預約、EDM 與金流。

## 9. 驗收標準

- Hero 文案逐字一致，三尺寸斷行沒有孤字或水平捲動。
- 鍵盤可操作主要導覽、CTA、篩選、題目與前後移動。
- 支援 `prefers-reduced-motion`，focus 狀態清楚。
- 工具狀態真實：已上線才有「開始」，開發中只顯示規劃。
- TWA／HTI 正式資料、計分、自動儲存與 mirror mode 測試通過。
- 報告的既有資料讀取、權限與 URL 參數沒有退化。
- Console 無 error；手機沒有水平捲動；Logo、字體及圖像載入正常。

## 10. 明確未修改

本設計階段不修改正式首頁、dashboard、評測工具、報告、Firebase、Firestore Rules、資料檔、同步腳本或 PRD。正式整合由 Claude Code 依上述順序另行執行。
