# 📚 SYNC_GUIDE：xlsx → JSON 同步備忘

這份文件說明如何把 `data/TWA_完整資料庫_主檔.xlsx` 的內容同步回專案使用的 JSON 檔。
共有兩支腳本，各自負責不同 sheet。

---

## 🗂️ 對應關係

| xlsx sheet | → JSON 檔 | 用哪支腳本 |
|---|---|---|
| `04_Landing_Page文案` | `data/twa-landing.json` | `sync_landing_sheet.py`（上一輪已建立） |
| `02_環境指標清單` | `data/twa-matrix.json` | `sync_indicators_sheet.py`（本輪新增） |
| `01_心理需求總覽` | `data/twa-matrix.json`（頂層 `v` / `d` / `n`） | ❌ 尚未納入 sync |
| `03_決策狀態文案` | `data/twa-config.json` 或其他 | ❌ 尚未納入 sync |

---

## 🚀 日常工作流程

### 情境 A：只改了 Landing 文案（04 sheet）

```bash
python sync_landing_sheet.py
firebase deploy --only hosting
```

### 情境 B：只改了環境指標（02 sheet）

```bash
python sync_indicators_sheet.py
firebase deploy --only hosting
```

### 情境 C：兩邊都改了

```bash
python sync_landing_sheet.py
python sync_indicators_sheet.py
firebase deploy --only hosting
```

### 改完想先確認會變什麼、不寫檔（dry-run）

```bash
python sync_indicators_sheet.py --dry-run
```

會列出每個 need 有幾筆 indicator 變動，不會動 JSON。

---

## 🔧 `sync_indicators_sheet.py` 細節

### 它做什麼

讀 xlsx 02_環境指標清單 → 覆蓋 `data/twa-matrix.json` 的 `indicators` 陣列。

### 它**不**動的欄位（以 JSON 現有值為準）

- 頂層 `v`（價值分類：成就/舒適/地位/利他/安全/自主）
- 頂層 `d`（需求描述，每個 need 的長段落）
- 頂層 `n`（需求名稱）

xlsx 02 沒有這三個欄位的資料，所以腳本保留現有 JSON 不覆蓋。如果你要改 `v` / `d` / `n`，要**手動編輯** `data/twa-matrix.json`（或未來把這三欄加進 xlsx 某個 sheet 並擴充 sync 腳本）。

### xlsx 欄位對應

| xlsx 欄位 | → JSON 欄位 |
|---|---|
| Col 1 `need_id` | 對應 matrix 的 `id`（決定歸屬到哪個 need） |
| Col 2 `need` | 僅警告用（參考用，不寫回 JSON） |
| Col 3 `indicator_index` | `indicators[].idx` |
| Col 4 `權重分數` | `indicators[].weight` |
| Col 5 `Hover 說明文案` | `indicators[].hover` |
| Col 6 `indicator` | `indicators[].text` |
| Col 7 `UI 顯示標籤` | `indicators[].label` |

### 警告訊息

腳本會對這些情況印出警告（不阻斷寫檔）：
- xlsx 的 need 名稱與 JSON 的 `n` 不一致
- xlsx 找不到某個 need_id 的任何指標（該 need 的 indicators 會保留舊資料）
- weight 欄位不是整數（預設為 1）

---

## ⚠️ 一次性事項（2026/04/19）

### valueIntro 已啟用 + HTML 採方向 A 設計

- `data/twa-landing.json` 的 `valueIntro.enabled` 已手動改為 `true`
- `tools/twa.html` 的 `value-intro-section` 已採用「方向 A」設計：純文字、頁面水平居中 narrow column、左側 teal 細引線，非卡片容器
- 如果想暫時關閉此區塊，**直接在 JSON 改 `enabled: false`** 即可（HTML 的 render 邏輯會自動隱藏）
- ⚠️ 注意：xlsx 04 sheet 的 `valueIntro.enabled` 仍是 `false`。下次跑 `sync_landing_sheet.py` 前記得先把 xlsx 該欄改 `true`，否則會被 sync 蓋回 `false`

### Motivation / Reflection 卡片改用 emoji + 色系匹配漸層

`data/twa-landing.json` 的 `motivation.cards` 和 `reflection.cards` 各自新增了 `emoji` 欄位：

| 卡片 | emoji | 容器漸層 |
|---|---|---|
| Motivation 1 | 🧭 | amber → yellow → orange（金黃系） |
| Motivation 2 | 🌳 | emerald → green → lime（深綠系） |
| Motivation 3 | 🧩 | sky → blue → indigo（清涼藍） |
| Reflection 1 | 🍃 | lime → green → emerald（黃綠） |
| Reflection 2 | 🌱 | green → emerald → teal（鮮綠） |

**配色原則**：容器漸層色系必須匹配 emoji 本色（避免互補色衝突）。

**xlsx 對應**：目前 xlsx 04 sheet 還沒有 `emoji` 欄位。未來如果 PO 想在 xlsx 管理 emoji，需要：
1. 在 xlsx motivation/reflection 的卡片區塊新增 `emoji` 這個 key
2. 擴充 `sync_landing_sheet.py` 讓它能讀取 emoji 欄位
（或保持現狀：emoji 直接在 JSON 手改，反正很少動）

---

## ⚠️ 一次性事項（2026/04/18）

### valueIntro.eyebrow 手動修正

`data/twa-landing.json` 的 `valueIntro.eyebrow` 已手動修正為 `"WHY YOU NEED TO KNOW WORK VALUES"`（原 xlsx 是 `"WHY YOU NEED  KNOW  WORK  VALUES"`，多了空格且漏了 TO）。

**⚠️ 下次編輯 xlsx 04 sheet 前記得同步更新這個欄位**，否則跑 `sync_landing_sheet.py` 會把舊的覆蓋回來。

位置：xlsx `04_Landing_Page文案` sheet，section=`valueIntro` / item=`-` / key=`eyebrow` 那一列。

### 責任擔當 14 筆 label 修正

原本 `data/twa-matrix.json` 的 id=19「責任擔當」14 筆 `label` 欄位是被截斷的 text 前 10 字元（例如 `"遇到專案出包時，能根"`），推測是上一版生成時 fallback 用了 `text.slice(0, 10)`。本次 sync 會自動修正為 xlsx 正確的短標籤（例如 `"事實釐清拒絕揹鍋"`）。

UI 影響：responsibility 的卡片標題會從被截斷的句子變成正確的短詞。**是好事**。

### 全指標 hover 去前綴

xlsx 已經把所有「基礎：」「進階：」「進階（xxx）：」前綴和開頭空格清掉了，sync 後 hover 文案會是純淨內容。

---

## 🆘 疑難排解

### Q: `sync_landing_sheet.py` 跑完，Landing 頁面顯示空白或錯亂？

HTML 端有 `LANDING_FALLBACK` 常數擋底，不會白屏。先打開瀏覽器 F12 看 console：
- 如果是 JSON 解析錯誤 → 檢查 xlsx 04 sheet 有沒有奇怪字元
- 如果是 schema 對不上 → 確認 xlsx 的 section / item / key 欄位沒動到

### Q: `sync_indicators_sheet.py` 跑完，評測頁指標不見？

先確認 `data/twa-matrix.json` 長度還是 20 筆（`id=0` 到 `id=19`）。如果少了某個 need，可能是 xlsx 裡那個 need_id 全空 → 腳本會警告並保留舊資料，但如果舊 JSON 本來就沒那筆，就會真的缺。

### Q: Git diff 看到 JSON 裡幾乎所有 hover 都變了？

這次（2026/04/18）是預期的 — 因為你一次性清掉了所有「基礎：」「進階：」前綴和開頭空格。之後日常改 xlsx 只動個別幾筆的話，diff 應該只會有那幾筆變。

---

## 📌 未來待辦（避免忘記）

- [ ] `01_心理需求總覽` sheet 納入 sync（讓 `v` / `d` / `n` 也能版控）
- [ ] `03_決策狀態文案` sheet 納入 sync
- [ ] 考慮把兩支 sync 腳本合併成 `sync_all.py`（現在分開是為了單一職責、好 debug）
- [ ] HTI 比照 TWA 建立 xlsx 主檔與 sync 流程
