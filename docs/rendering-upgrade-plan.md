# 樂活狂飆渲染升級計畫

2026-11-10，工作目錄 D:\lohas-rush。只在現有專案開發，不部署。執行前 git status 只有使用者的 world.glb、建築參考圖及先前 art/buildings 產物未追蹤；不刪除或覆寫這些來源。

已確認 React 18.3.1 / Three.js 0.175.0 / R3F 8.18.0 / Drei 9.122.0 / Zustand 5.0.16。原始 84 項測試通過。Canvas 位於 App，City 管理城市，特色建築為分批合併幾何，StaticScenery 為 InstancedMesh，GameAssets/TrackManager 保留缺少選用 GLB 時的替代及串流。

1. Phase 1：記錄 1080p、固定出生點的原始 FPS、draw calls、幾何／貼圖數及 JS heap。軟體渲染結果與 RTX 3050 真機驗收分開。
2. Phase 2：新增 rendering/Lighting、HDR 環境、明確的 sRGB/ACES 與跟隨式陰影範圍。調整 App、City。
3. Phase 3：新增可重用 PBR 材質工廠與世界尺度貼圖映射，更新四棟特色建築及 StaticScenery 的材質分批；保留輪廓、入口、位置、標牌和碰撞資料。
4. Phase 4：深色柏油、磁磚、草皮、路緣；重用 streetFurniture 的種植位置，批次處理棕櫚樹、樹冠、灌木，依距離分級和裁切。
5. Phase 5：使用現有 lohas_service_van.glb（找不到指定的 lohas_shuttle_game.glb），保留識別色、動畫樞軸、乘客及碰撞範圍，改善車漆／玻璃／輪框／車燈並加入接地陰影。不靠材質假裝修改車體結構。
6. Phase 6：展示環繞相機與 PNG 擷取；保留第三人稱相機，展示期間凍結駕駛與接送流程。加入可調 AO；不預設開啟景深或 Bloom。
7. Phase 7：Low/Medium/High 設定、儲存偏好、合理 DPR、陰影尺寸、植栽距離及 AO 分級。
8. Phase 8：既有測試、駕駛／煞車／重置／任務／接送／展示瀏覽器驗證、npm run build、/lohas-rush/ 前綴的正式建置資源檢查及前後效能報告。

預計修改 App.tsx、City.tsx、StaticScenery.tsx、四棟特色建築、車輛 serviceVan/Car、VehicleCamera、StreetMaterials，以及 style.css。新增 rendering/、stores/visual.ts、GraphicsControls、素材產生工具、效能工具與測試。駕駛物理、任務／碰撞演算法、城市道路座標和原始 GLB 維持原有契約。

新 HDR 天空與表面紋理均為本專案程序產生，列出來源與用途；不下載未知授權貼圖，不依賴 CDN HDR preset。先前 world.glb 精緻化成果是完整獨立場景，並非目前遊戲載入的總部，避免直接整場套用造成重複道路、車輛或碰撞不符。
