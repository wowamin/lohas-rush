# 未處理事項整理

本文件彙整目前文件紀錄中的未結事項，以及使用者提供截圖中的遊戲改善建議。使用者已授權完成需求明確的介面項目，並補充橫向遊玩需求；文字不完整與需要外部資料的項目繼續待辦。2026-11-20 已依本機驗證與既有驗收報告更新下列完成狀態，未提交、推送或部署。

2026-11-26 接續核對：開始時工作樹乾淨，112 項單元測試與正式建置通過；已完成下列大型 JS chunk 拆分。其他需求不完整、外部素材與實體裝置項目維持待辦。

## 驗收與紀錄待收尾

- [x] **確認接送交接回歸結果**：已核對 `.test-artifacts/ground-handoff-acceptance/results.json`，2026-11-06 的接送／鏡頭／街景三筆均為 passed。本輪另通過壓縮 GLB／手機備援完整接送、RTX 4060 硬體鏡頭回歸及桌機／手機街景回歸；2026-11-20 的核對紀錄另存同目錄，保留原報告。
- [x] **完成新版地圖五站路測**：已找到並核對 2026-11-19 的 `.test-artifacts/campuses/routes-validation.json`：硬體 RTX 4060、646.3 秒、五站依序完成，龍山／義合接送、過橋及重置保留探索皆通過，errors 為空。本輪確認既有報告，沒有將其描述為今日重跑長程。
- [x] **對齊 PWA 驗收紀錄**：README 已統一實測結果；正式版根目錄／子目錄離線重開、Draco／WebP、新版等待／啟用與下載失敗重試通過。
- [x] **修正並保留步行街失敗紀錄**：先重現並保留 `.84` 與 `>= .9` 的既有失敗。依模組 README 與材質工廠明訂的「霧面」規格，把獨立預覽的瀝青／鋪面恢復為 `.95` 的無金屬霧面材質，維持原測試門檻；4/4 單元測試與桌機／手機預覽、碰撞疊圖通過。失敗原始輸出保留在 `.test-artifacts/quality/pedestrian-unit-final.log`。

## 遊戲改善建議（來自使用者截圖）

- [x] **小地圖縮放**：預設角落縮圖，整張點擊／輕觸放大，支援鍵盤、縮回與重載預設。桌機、390px 手機、320px 小螢幕與橫向驗證通過，結果位於 `.test-artifacts/minimap/validation.json`。
- [x] **直向螢幕提示**：使用者補充完整需求後，已加入「請旋轉手機」、自動收起及可繼續直向的選擇，橫向左側搖桿／右側踏板；旋轉會釋放按住的輸入。Chrome 390×844、844×390、568×320 與既有多尺寸排版回歸通過。
- [x] **提示文字樣式與顯示時機**：操作短提示有底色／陰影，首次可閱讀時記錄、約八秒後收起，重載不重播；駕駛與輪椅分別記錄。目的地、接送狀態與可重開的操作說明持續可用。
- [x] **據點標籤依距離顯示**：一般據點在有效範圍內僅顯示最近兩個，手機／窄螢幕最多一個，其餘隱藏；金色當前任務標記保留。距離、穩定排序、數量限制與無效座標有單元測試。
- [ ] **增加輔助駕駛模式**：例如自動前進，讓玩家只需轉向，或按單一按鈕沿路線前往下一站。截圖中此項目的結尾被截斷，完整需求待確認。
- [x] **替代轉向操作與觸覺回饋**：評估後沿用可拖曳搖桿，觸控按下時請求 8ms 震動，不支援則繼續正常操作。API 呼叫、雙指操作與無 API 備援通過；實體震動待真機驗收。傾斜感應涉及部分瀏覽器額外權限，未納入目前操作模式。

## 道路俯視圖參考圖（待生成）

用途：生成含偏心左轉道、綠底斑馬線、行人庇護島及標線型人行道的台南道路俯視參考，可作地圖材質參考或裁切為貼圖。

以下提示詞是視覺生成規格，不代表已驗證台南現行道路設計或工程規範；若要作為真實道路依據，仍需另行查證。

### 路口

```text
Top-down orthographic drone view of a modern Taiwanese urban road intersection in Tainan, asphalt road texture, newly painted road markings, offset left-turn lane with white chevron hatch markings, green anti-skid pedestrian crosswalks, concrete pedestrian refuge island in the median, green painted sidewalk lane along the curb with white pedestrian symbols, Traditional Chinese road text markings, crisp realistic lighting, game texture asset, 8k resolution --ar 1:1
```

### 渦輪環形交叉口

```text
Top-down aerial orthographic view of a modern multi-lane turbo roundabout in Tainan Taiwan, freshly painted white spiral lane guide lines, yield triangle markings at entries, white hatched channelization islands, green pedestrian crosswalks set back from the circle, clean dark asphalt texture, game level design reference, top view, flat lighting --ar 1:1
```

## 啟用前阻擋與外部資料

- [ ] **解決義合與中環道路衝突**：保留指定座標；規劃資料提出將 R650 中環局部外繞至至少 R675。完成道路淨空、建築 AABB 與路網連通驗證前，不啟用該規劃。
- [ ] **補齊建築實景素材與尺寸**：待可使用的正面、側面、入口照片、來源／授權及必要尺寸；義合另缺完整正立面／屋頂參考。
- [ ] **確認正式機構資料**：地址、服務範圍、聯絡資訊、教育情境及供餐／服務內容需由可靠來源確認，不以推測補寫。
- [ ] **補齊五中心及其他服務建築資料**：龍山／義合已保留明確的簡化遊戲量體與待確認來源，其他服務建築仍以幾何示意與暫定外觀呈現；需逐棟補齊正面、側面、入口、尺寸、授權及來源。
- [ ] **補齊公務車實景與尺寸參考**：目前缺少同一車的正背面、另一側、車頂照片、實際尺寸、清晰包膜／標誌原稿及可重用授權紀錄；未據此宣稱忠實還原，輪胎與懸吊亦維持靜態示意。

## 尚未納入目前範圍的遊戲與資料事件

- [x] **大和門口的室內入口連結**：2026-11-26 已在城市大和建築門前加入「進入室內」，靠近園區顯示，可用鍵盤與手機點擊進入奶奶的室內預覽；返回城市保留車位、五站進度與探索日記。
- [x] **五館共用室內進出方式**：大和、安南、龍山、義合、新營均接上室外「進入室內」與室內門口「返回戶外」。沿用同一套人物、場景及控制元件，各館名稱／進度分開；其餘四館為共用示意室內，非實景重建。無縫下車步行仍屬下列待辦。
- [x] **五館室內自由環景**：2026-11-27 完成滑鼠左右鍵／單指拖曳 360°、滾輪／雙指縮放與重設視角，並修正雙指放手距離回退。沿用城市環繞運算與鏡頭避障；119 項單元、五館環景、Chrome 模擬觸控、完整五區探索／四種尺寸排版及正式建置通過，報告位於 `.test-artifacts/interior-orbit/`、`.test-artifacts/dahe/`。
- [ ] **大和室內與城市的完整模式切換**：已有 `?scene=dahe` 奶奶獨立預覽與門口頁面連結；停車下車步行、穿過門口及無縫回車仍未實作。整合前須依已盤點方案確認實作範圍。
- [ ] **製作完整劇情與新增 NPC／多人系統**：目前不在既定版本範圍內；開發前須另行確認章節、角色、劇情資料及是否需要帳號／後端／多人連線。
- [ ] **補齊教育情境與真實服務內容**：只有標示清楚的暫定文案；須確認可靠來源後再製作教育情境、供餐或其他服務資訊。
- [ ] **替換老屋或其他實景三維素材**：目前沒有可用的 `tainan_building.glb` 或經授權老屋模型；既有商店與街道仍使用遊戲量體，需先取得來源、授權及尺寸。
- [ ] **驗證遠區陰影與地形細節**：目前場景是有限範圍低多邊形原型，遠區陰影、真實地形高程、橋面坡度與樹木／燈桿碰撞尚未全面完成或驗收。

## 後續驗收與技術限制

- [ ] **安排實體裝置驗收**：目前尚未驗證實體手機、Safari／iOS、一般 GPU 效能與長時間遊玩穩定性；Chrome SwiftShader 模擬不代表真機效能。
- [x] **處理大型 JS chunk 警告**：2026-11-26 依 Three.js 的 core／WebGL 邊界、addons 及共用 runtime 分包，主程式由約 1,470 kB 改為 372.14 kB，所有 JS chunk 均低於原有 500 kB 門檻，正式建置無大小警告。PWA 根／子目錄離線重開、更新與失敗重試通過；正式版 Bloom／展示／PNG 及兩個延遲頁面載入通過，報告在 `.test-artifacts/chunk-splitting/validation.json`。全部 JS 合計約 1,503.45 kB（gzip 414.53 kB）；本項只完成分包，不代表總下載量、FPS 或真機效能已最佳化。

## 工作樹狀態

- [ ] **後續確認本輪修改的提交方式**：2026-11-26 開始時 `git status --short` 為空，先前「有多項未提交修改」的狀態已過時。本輪保留分包設定與文件修改，另有大和獨立預覽、載入入口、測試腳本／指令與說明；尚未提交、推送或部署。

## 參考紀錄

- [README.md](../README.md)
- [DEVELOPMENT_LOG.md](../DEVELOPMENT_LOG.md)
- [園區地圖配置說明](./campus-map-layout.md)
