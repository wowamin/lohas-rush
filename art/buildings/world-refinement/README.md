# 建築模型交付

主要交付：`building_refined.blend`、`building_refined.glb`、`model_analysis.json`、`optimization_report.md`。

先看 `building_refined_preview.png`，再開啟 `.blend` 的 `01_Refined_LOD0`。原模型在 `00_Original_Reference`，兩個遠距版本分別在 LOD1／LOD2 場景。原始 `world.glb` 未修改，模型也未套用至遊戲。

直接以 `GLTFLoader.loadAsync()` 載入 `building_refined.glb` 即可使用。GLB 包含原有環境，世界座標與單位沿用原檔，輸出為 Y-up；不要再額外旋轉以重複轉換座標。

需要自動 LOD 時，將三個 GLB 與 `load-building.mjs` 放在同一個可供 HTTP 存取的資料夾：

```js
import { loadRefinedBuilding } from './assets/building/load-building.mjs';

const building = await loadRefinedBuilding({
  distances: [0, 20, 45], // 沿用原場景單位，可依相機與畫面大小調整
});
scene.add(building);

// 移除整組資產並釋放共用 GPU 資源：
// building.dispose();
```

程式依賴專案提供的 `three` 和 `three/addons/` 匯入解析。也可傳入 `baseUrl: new URL('/assets/building/', location.origin)`。玻璃應搭配環境反射與 PBR 光源觀看。

`optimization_report.md` 說明保留的結構、待確認物件、精緻化與原照片的差距、LOD 的面數與載入方式。`validation_report.json` 是實際 Three.js 載入與切換結果；`blend_validation.json` 記錄原始場景保存檢查；`delivery_manifest.json` 包含主要產物的 SHA-256。

重建流程（從專案根目錄，以 Blender 5.2 的 Python 執行）：

1. 執行 `scripts/analyze_model.py`，檢視 `source_view_01.png`～`04.png` 與原始資料。
2. 執行 `scripts/inspect_embedded.py`，擷取與檢視原模型嵌入參考圖。
3. 執行 `scripts/classify_analysis.py`，寫入經照片檢視確認的分類。
4. 分析回報後執行 `scripts/refine_model.py`，產生場景、貼圖、GLB 與預覽。此腳本只會重建本交付資料夾中的產物。
5. 執行 `scripts/verify_blend.py`，再以 Node 執行 `scripts/validate_assets.mjs`（需本機 Chrome 與專案的 Playwright）。
6. 執行 `scripts/write_report.py` 產生測量報告與清單。

`finalize_assets.py`、`tidy_preview.py` 是製作過程的修復工具，完整重建時不需要執行。它們只處理本資料夾的既有輸出。所有 Blender 腳本可透過 `blender --background --python-exit-code 1 --python 路徑` 執行。
