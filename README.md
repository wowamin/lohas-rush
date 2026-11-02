# 樂活狂飆 · Lohas Rush V0.1

獨立、單人、桌機優先的 3D 虛構城市駕駛遊戲。以 React、TypeScript、Vite、React Three Fiber、Three.js、drei 與 Zustand 開發，不依賴或修改 `lohas_islands`。

## 開始遊玩

使用 Node.js 24 以上版本與支援 WebGL 2 的桌機瀏覽器。

```sh
npm install
npm run dev
```

開啟終端機顯示的本機網址，預設為 http://localhost:5173/ 。Windows PowerShell 若阻擋 `npm.ps1`，可使用 `npm.cmd install`、`npm.cmd run dev`，無須變更系統執行原則。

| 按鍵 | 功能 |
| --- | --- |
| W / ↑ | 加速前進 |
| S / ↓ | 減速並倒車 |
| A、D / ←、→ | 左右轉向；倒車時轉向相反 |
| Space | 煞車 |
| R / 重新開始按鈕 | 回到起點，清除三站行程與按鍵 |

依序駛入金色圓環：**樂活日照中心 → 樂活全齡診所 → 樂活團膳工廠**。圓環半徑 4 公尺，駛入即判定抵達，不需按鍵。完成後可繼續自由探索或重新開始。三處均為虛構示範據點。

## V0.1 內容與架構

- 一輛幾何模型服務車、完整道路街區、16 棟建築、樹木、街燈、標線與三個服務據點。
- 固定 120 Hz 街機駕駛：加減速、倒車、轉向、速度上限、阻力與煞車。單幀最多 12 次子步進，時間差上限 0.1 秒，避免背景恢復時突然躍進。
- 平滑第三人稱鏡頭；車輛位置、速度、方向及鏡頭由 refs 與 `useFrame` 管理。
- Zustand 管理行程、重置及每秒約 10 次的速度與距離顯示，沒有每幀寫入狀態。
- 建築與邊界採保守 AABB 碰撞，以包住車身的半徑擴張障礙區；在預期最高前進速度 18 m/s、倒車 8 m/s 下以小步進避免穿透。
- 三站名稱、建築座標、抵達座標、半徑與顏色全部資料化。建築幾何與碰撞共用資料，抵達區位於道路上。
- 視窗失焦或隱藏時清除按鍵；初始化失敗、WebGL 不支援或 context lost 時顯示重新載入提示。
- 模型由程式產生，無外部模型、字型下載或後端依賴。

```text
src/
  App.tsx                         WebGL 檢查、錯誤邊界與 HUD
  data/city.ts                    道路、建築、碰撞與據點資料
  game/City.tsx                   低多邊形城市及目的地標記
  game/Car.tsx                    車輛模型、固定步長迴圈與跟隨鏡頭
  game/vehicle/drivingPhysics.ts  可獨立測試的駕駛運算
  game/vehicle/useDrivingInput.ts 鍵盤、失焦與重置處理
  game/collision/                 建築及城市邊界判定
  game/missions/                 抵達區判定
  stores/game.ts                 低頻狀態與行程
tests/
  game.test.mjs                   駕駛、碰撞與任務測試
  browser.mjs                     本機 Chrome 整合測試
```

## 建置與驗證

```sh
npm test
npm run build
# 先在另一個終端啟動 npm run dev，並確認已安裝 Google Chrome
npm run test:browser
```

2026-11-02 在本機 Windows / Node.js 24 實測：

| 檢查 | 結果 |
| --- | --- |
| 套件安裝 | 通過，已產生 package-lock.json |
| TypeScript 與 Vite 正式建置 | 通過 |
| 邏輯測試 | 5 項通過：加速／倒車／轉向、煞車／阻力、建築／轉角／邊界碰撞、三站可達性、依序完成與重置 |
| Vite 開發伺服器 | 可啟動並提供網頁 |
| 無視窗 Chrome / 軟體 WebGL | 城市渲染、W／方向鍵／倒車／Space、R／按鈕重置、失焦清除輸入通過 |
| WebGL fallback | 不支援與 context lost 情境通過 |
| 桌機截圖 | `.test-artifacts/city-desktop.png`，由瀏覽器測試產生 |

瀏覽器測試不會自動駕駛完整三站；三站順序與重置由邏輯測試驗證。實際連續駕駛三站的手感與一般顯示卡效能仍需人工遊玩驗收。軟體 WebGL 測試不能當作 GPU 效能基準。

## 已知限制與後續驗收

- Vite 會提示 3D 主程式約 1 MB 的未壓縮 chunk；目前保留單一場景，後續可視載入需求拆分。
- 碰撞僅處理建築與城市邊界，樹木、街燈為裝飾；採保守碰撞區，靠近轉角會提早停車。鏡頭尚無建築遮擋避讓。
- 街機控制沒有懸吊、翻車、交通 AI、行人或真實城市地圖；無多人、手機觸控、棋盤或長照題庫。
- V0.1 後續以人工完整路線試駕、轉角手感及不同硬體測試為主；不自動擴增 V0.2。
- 專案使用相對 Vite base，支援 GitHub Pages 的 `/lohas-rush/` 子路徑；部署設定與操作見下節。

## GitHub Pages 部署

Repository：`wowamin/lohas-rush`。已加入 `.github/workflows/deploy.yml`，推送至 `main` 後會安裝鎖定版本套件、執行邏輯測試、建置並發布 `dist`。

首次部署步驟：

1. 開啟 [Settings → Pages](https://github.com/wowamin/lohas-rush/settings/pages)。
2. 在 **Build and deployment → Source** 選擇 **GitHub Actions**。
3. 將本次新增的 workflow 提交並推送至 `main`。
4. 在 [Actions](https://github.com/wowamin/lohas-rush/actions) 查看 `Deploy game to GitHub Pages`。若 workflow 已存在，可使用 **Run workflow** 手動啟動。
5. 等 `build` 與 `deploy` 都成功後，開啟 https://wowamin.github.io/lohas-rush/ 。此為預期發布網址，不代表目前已上線。

Vite 網站必須發布建置後的 `dist`，不能只把原始碼當作靜態網站。請勿將 Source 設成直接發布 `main / (root)`；原始 `index.html` 引用的是需由 Vite 編譯的 TypeScript。

若 `Configure Pages` 顯示找不到 Pages，先檢查第 2 步；若 `deploy` 等待核准，查看 `github-pages` environment 的保護設定。`dist` 保持在 Git 忽略規則中，由 Actions 上傳，不需手動提交。
