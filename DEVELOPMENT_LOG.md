# 《樂活狂飆》V0.1 開發紀錄

紀錄日期：2026-11-02（Asia/Taipei）  
專案位置：`D:\lohas-rush`  
版本：V0.1，樂活虛構城市駕駛原型

## 一、開發目標與範圍

建立獨立、單人、桌機優先的 3D 城市駕駛遊戲。先完成可駕駛的遊戲，再逐步擴充樂活集團據點與長照任務。

本次僅在 `lohas-rush` 內開發，未修改原專案 `lohas_islands`。檢查時此資料夾已有 Git repository 與初步程式，因此本次是在既有雛形上補齊 V0.1，並非重新建立空白專案。

本次未開發多人連線、真實台南地圖、交通 AI、100 格棋盤、長照知識題庫或複雜車輛物理。

## 二、完成的功能

### 車輛與操作

- 一輛以幾何模型組成的樂活服務車，具車窗、輪胎、燈具與綠色服務標記。
- WASD／方向鍵控制前進、倒車與轉向。
- Space 煞車；R 或「重新開始」按鈕重置車輛與完整行程。
- 街機式加速、減速、阻力與速度上限；前進最高 18 m/s，倒車最高 8 m/s。
- 平滑第三人稱跟隨鏡頭。
- 視窗失焦或頁面隱藏時清除按鍵，避免恢復畫面後持續加速。
- 按下重新開始按鈕後，可直接以鍵盤繼續駕駛。

### 城市與碰撞

- 柔和色彩、低多邊形的虛構城市街區。
- 道路、路口、路面標線、人行道、16 棟建築、樹木與街燈。
- 建築與城市邊界碰撞；所有服務據點建築也納入碰撞資料。
- 服務據點建築置於街區內，抵達區設於道路上，避免目的地被建築阻擋。

### 任務與介面

- 三個資料化示範據點，依序造訪：樂活日照中心、樂活全齡診所、樂活團膳工廠。
- 金色圓環、上方標記與服務據點標籤。
- 駛入半徑 4 公尺的抵達區後，自動推進任務。
- 顯示車速、目的地直線距離、行程進度、駕駛提示與完成訊息。
- 三站完成後可自由探索或重新開始。
- WebGL 2 不支援、初始化失敗或 context lost 時提供友善提示與重新載入按鈕。

## 三、技術與架構決策

| 項目 | 本次實作 |
| --- | --- |
| 網頁入口與建置 | React、TypeScript、Vite |
| 3D 場景 | Three.js、React Three Fiber、drei |
| 遊戲狀態 | Zustand，管理行程、完成狀態、重置與低頻 HUD 資料 |
| 高頻運算 | 車輛與鏡頭使用 refs、`useFrame`，不逐幀寫入 Zustand |
| 物理步進 | 固定 120 Hz，每幀最多 12 次子步進，時間差最多 0.1 秒 |
| 碰撞 | 以車身包覆半徑擴張建築 AABB，再配合小步進判定 |
| HUD 更新 | 每秒約 10 次，顯示速度與距離 |
| 城市資料 | 道路、建築、據點位置、抵達區與顏色集中定義 |
| 資產 | 程式生成幾何模型，無外部模型或字型下載依賴 |

## 四、主要異動檔案

| 檔案 | 用途 |
| --- | --- |
| `src/App.tsx` | WebGL 檢查、錯誤邊界、遊戲入口與 HUD |
| `src/game/Car.tsx` | 服務車模型、步進迴圈、跟隨鏡頭與低頻資料更新 |
| `src/game/City.tsx` | 城市幾何、道路標線、樹木、街燈與目的地標記 |
| `src/game/vehicle/drivingPhysics.ts` | 可獨立測試的駕駛運算 |
| `src/game/vehicle/useDrivingInput.ts` | 鍵盤、失焦、頁面隱藏與重置處理 |
| `src/game/collision/collisionSystem.ts` | 建築與城市邊界碰撞判定 |
| `src/game/missions/missionSystem.ts` | 據點抵達範圍判定 |
| `src/data/city.ts` | 城市建築、道路、碰撞與三個據點資料 |
| `src/stores/game.ts` | 任務順序、完成狀態、遙測資料與重置 |
| `src/style.css` | 城市遊戲介面、標籤與畫面尺寸適配 |
| `tests/game.test.mjs` | 駕駛、碰撞、可達性及任務邏輯測試 |
| `tests/browser.mjs` | Chrome 渲染、鍵盤與 WebGL fallback 整合測試 |
| `package.json`、`package-lock.json` | 套件、鎖定版本與測試指令 |
| `.gitignore` | 忽略套件、建置、快取與測試產物 |
| `README.md` | 啟動方式、操作說明、架構、驗證紀錄與限制 |

原有本地 `SKILL.md` 保留，未修改。

## 五、開發過程中的問題與處理

| 問題 | 處理結果 |
| --- | --- |
| 初次讀取中文出現亂碼 | 確認是終端讀取編碼，改用 UTF-8；原始程式中文正常 |
| PowerShell 阻擋 `npm.ps1` | 使用 `npm.cmd` 執行，不變更系統執行原則 |
| npm 離線快取缺少套件 | 取得執行許可後下載套件，使用專案內 `.npm-cache` |
| Vite／Node 測試子程序遇到 `spawn EPERM` | 建置與瀏覽器測試使用獲准的執行方式；邏輯測試使用 `--test-isolation=none` |
| 原據點位於道路且未納入建築碰撞 | 分離建築位置與抵達位置，建築幾何與碰撞共用資料 |
| 重置按鈕取得焦點後影響駕駛按鍵 | 保留按鈕 Space 操作，同時允許方向鍵與駕駛按鍵繼續使用 |
| 初版不支援 WebGL 測試停用所有 Canvas context | 改為只停用 WebGL context，保留 2D context，重新測試通過 |

## 六、驗證結果

以下為本次開發已執行的結果，文件整理時未重新執行全部測試。

驗證環境：Windows、Node.js 24.21.0、本機無視窗 Google Chrome；3D 瀏覽器測試使用軟體 WebGL。

| 指令／檢查 | 結果 |
| --- | --- |
| `npm.cmd install` | 完成套件安裝並產生 lockfile；安裝時稽核回報 0 個漏洞 |
| `npm.cmd test` | 5 項邏輯測試全部通過 |
| `npm.cmd run build` | TypeScript 檢查與 Vite 正式建置通過 |
| `npm.cmd run dev -- --host 127.0.0.1` | Vite 成功啟動，提供 `http://127.0.0.1:5173/` |
| `npm.cmd run test:browser` | Chrome 整合測試通過 |
| `git diff --check` | 通過；僅出現 Git 換行格式提示 |
| 桌機畫面檢查 | 已檢視瀏覽器截圖，城市、服務車與介面正常呈現 |

### 五項邏輯測試

1. 前進、倒車、左轉與倒車轉向方向。
2. 煞車、滑行阻力，以及同時加速與煞車時的低速行為。
3. 最高預期速度下的建築、轉角、倒車與城市邊界碰撞。
4. 三個抵達區均無碰撞，且道路取樣路線可連通。
5. 任務依序推進、最終完成不重複推進，以及完整重置。

### 瀏覽器測試範圍

- 3D Canvas 與目的地標記成功載入，操作過程無頁面執行錯誤。
- W 前進、S 倒車、方向鍵前進、Space 煞車。
- R 重置、按鈕重置，以及按鈕重置後直接使用方向鍵。
- 失焦後清除持續按住的加速輸入。
- 模擬 context lost 與 WebGL 不支援時，顯示友善提示。

畫面截圖：`.test-artifacts/city-desktop.png`。此目錄已加入 Git 忽略規則，需執行瀏覽器測試重新產生。

最終建置主程式約 992 kB，gzip 約 276 kB；Vite 顯示超過 500 kB chunk 的提示，建置仍成功。

## 七、已知限制與待驗收事項

- 尚未人工連續駕駛完整三站；三站順序、抵達範圍及重置目前由邏輯測試驗證。
- 尚未驗收不同顯示卡、一般 GPU 效能與長時間遊玩穩定性；軟體 WebGL 測試不代表實機效能。
- 碰撞僅包含建築與城市邊界，樹木、街燈為裝飾。
- 保守碰撞區會讓車輛靠近建築轉角時提早停車。
- 跟隨鏡頭尚未加入建築遮擋避讓。
- 主程式建置體積仍有拆分與載入最佳化空間。
- 本次未建立新的 GitHub 遠端、提交或發布網站；僅完成本地實作與驗證。

後續維持 V0.1 穩定化範圍：完整路線人工試駕、轉角與鏡頭手感調整，以及不同硬體驗收。V0.2 功能待另行確認。

## 八、本機啟動與重跑驗證

```powershell
cd D:\lohas-rush
npm.cmd install
npm.cmd test
npm.cmd run build
npm.cmd run dev
```

開啟終端機顯示的網址。執行瀏覽器測試時，保持開發伺服器在 `127.0.0.1:5173` 運作，並在另一個終端執行：

```powershell
npm.cmd run test:browser
```

瀏覽器測試需要本機已安裝 Google Chrome。更多操作與專案說明見 [README.md](README.md)。

## 九、GitHub Pages 部署排查（2026-11-02）

### 查到的現況

- 本機遠端已設定為 `https://github.com/wowamin/lohas-rush.git`，目前分支為 `main`。
- GitHub repository 中已存在遊戲原始碼、套件 lockfile 與開發紀錄，確認程式碼有上傳。
- GitHub Actions API 回傳 `total_count: 0`，沒有任何 workflow 執行紀錄。
- GitHub repository 沒有 `.github` 目錄，本機也沒有部署 workflow。
- 公開遊戲網址 `https://wowamin.github.io/lohas-rush/` 回傳 HTTP 404。
- 未登入的 GitHub Pages API 查詢也回傳 404；無法僅據此判定管理後台的確切 Source 設定，仍需從 Settings → Pages 確認。

### 原因與本次修正

專案只有原始碼上傳，缺少 Vite 建置與 GitHub Pages 發布流程。Vite 必須先產生 `dist` 再發布，直接上傳原始碼不會自動完成這些步驟。

新增 `.github/workflows/deploy.yml`：使用 Node.js 24、`npm ci`、`npm test`、`npm run build`、Pages artifact 上傳與部署。推送至 `main` 或手動執行 workflow 時觸發，部署工作具 Pages 寫入及 OIDC 權限。

保留 Vite 的 `base: './'`，建置資產採相對路徑，可由 `/lohas-rush/` 子路徑載入。README 已補上首次啟用 Pages、推送 workflow 與檢查 Actions 的步驟。

### 驗證與尚待執行

- 修正後 `npm.cmd test`：5 項通過。
- 修正後 `npm.cmd run build`：成功產生 `dist`；仍有主程式 chunk 大小提示。
- 本次僅準備本地部署檔案與說明，尚未提交、推送、變更 GitHub Pages 設定或觸發遠端部署。
- 下一步：在 repository 的 Settings → Pages 將 Source 設為 GitHub Actions，再提交並推送 workflow，確認遠端 `build`／`deploy` 都通過後驗收公開網址。

參考：[Vite 靜態網站與 GitHub Pages 部署說明](https://vite.dev/guide/static-deploy#github-pages)。
