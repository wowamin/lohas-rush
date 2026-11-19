# 五站園區與擴大地圖

日期：2026-11-19（Asia/Taipei）。本檔描述遊戲配置，不代表真實地理位置或道路設計認證。

## 地圖與路線

- 世界邊界 ±720，地圖 1,440×1,440 遊戲公尺，面積約為上一版 1,022×1,022 的 1.99 倍。
- 保留中央雙環、既有街坊、服務點與 ±480 大道，新增 ±640 外環、四個內外環連接方向與中央北向聯絡道。
- 河道保留，橋梁中心 Z = -640、-480、0、260、480、640。新道路在交會與園區出入口都建立圖節點，避免畫面相交但導航不通。
- 五站順序與穩定 ID 不變，建築與抵達點改由 `src/data/centerCampuses.ts` 管理。店家保留固定種子的生成方式；日照改為固定園區，不再因店家種子抽選位置。

| 順序 | ID | 建築 X,Z | 接送抵達點 X,Z | 車位 |
|---|---|---|---|---|
| 1 大和 | daihe | -320,-560 | -320,-600 | 4 |
| 2 安南 | annan | -560,-200 | -600,-200 | 4 |
| 3 七股龍山 | longshan | -280,560 | -280,600 | 6 |
| 4 七股義合 | yihe | 320,560 | 320,600 | 6 |
| 5 新營 | xinying | 560,-280 | 600,-280 | 4 |

按目前最短路網，從中央出生點依序抵達約 5.19 公里。導航只是引導，可自由行駛；園區箭頭不構成強制單行道邏輯。

## 前庭與停車

每個基地包含獨立前庭、停車格、接送框、平坦輪椅接近路徑、植栽、長椅與指示牌。接送點距建築原點 40 公尺；迴車道路寬 12 公尺，左右兩端接回外環。車位 5×10 公尺，接送框約 14×6.6 公尺，均為配合遊戲車體的示意尺寸。

龍山與義合的場地半寬 46，其餘半寬 40。自動街樹及路燈排除園區保留範圍；保留範圍本身不是碰撞牆。植栽、長椅、指示牌另有真正碰撞資料及鏡頭遮擋範圍。建築原有模型、碰撞尺寸與照片參考限制保留。

## 共用來源

- `centerCampuses.ts`：位置、朝向、停車格、保留範圍及設施碰撞。
- `cityExpansion.ts`：外環、連接道路、橋梁及接送迴車道路。
- `buildingLots.ts`：園區基地與店家基地分離，保留據點間至少八個店家基地的生成序列檢查。
- `CenterCampuses.tsx`／`campusModel.ts`：依相同資料繪製場景。
- `RouteMap.tsx`：共用世界邊界、園區範圍、停車標記與五站標籤。
- `spatialBatches.ts`／`StaticScenery.tsx`：依 128 公尺區域與材質分批，讓 Three.js 裁切畫面外區域；所有靜態區域共用一份方盒幾何與八種材質，碰撞仍全圖常駐。

## 重置與存檔

不改駕駛、煞車、固定步長、接送狀態機或任務完成規則。R 回中央出生點並重置五站行程；探索日記沿用原 ID 與儲存 key，不清除、不依舊座標存檔，因此既有探索紀錄仍可讀取。

## 驗證指令

```powershell
npm.cmd test
npm.cmd run build
# 另開乾淨的 dev server；長程測試期間不要修改 src，避免 Vite HMR 狀態實例分離。
npm.cmd run dev -- --host 127.0.0.1 --port 5199 --strictPort
$env:TEST_BASE_URL = 'http://127.0.0.1:5199/?quality=low'
npm.cmd run test:campuses:browser
node tests/street-furniture.browser.mjs
# 預設使用 SwiftShader；只有確認實際 GPU 可用時才選擇 hardware。
$env:TEST_WEBGL_BACKEND = 'hardware'
npm.cmd run test:routes
```

硬體路測會檢查實際 WebGL renderer，拒絕把 SwiftShader 回退誤列為硬體結果。長程路測只送真實鍵盤事件，不傳送車位或直接推進任務；龍山、義合另停車完成上下車。

目前已觀察：94 項主測試、正式建置、園區／桌機手機 GPS 及街景分區瀏覽器驗證通過。完整五站硬體路測執行中，結果另存 `.test-artifacts/campuses/routes-validation.json`，完成後更新本檔。

截圖：`.test-artifacts/campuses/map-overview.png`、`longshan.png`、`yihe.png`、`gps-desktop.png`、`gps-mobile.png`。本次未提交、推送或部署。
