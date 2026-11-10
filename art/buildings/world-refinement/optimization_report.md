# 建築精緻化與效能優化報告

日期：2026-11-10（Asia/Taipei）。工具：Blender 5.2.3 LTS / Blender Python API、Three.js r175、Chrome WebGL2。

已先完成原始模型分析及回報，再於獨立場景建立精緻化版本。全部產物位於 `art/buildings/world-refinement/`，沒有替換遊戲使用的資產路徑或修改遊戲程式碼。

## 交付檔案

- `building_refined.blend`：完整原始比對場景、可編輯精緻化場景、兩個植栽 LOD 場景，貼圖全部封裝。
- `building_refined.glb`：預設高品質 LOD0，包含原有環境與物件位置。
- `model_analysis.json`：原始 84 個 Mesh 的名稱、頂點／三角面、材質、世界尺寸、位置、矩陣、包圍盒、分類依據與人工檢查標記。
- `model_analysis.md`：上述分析的可讀版，含完整 Mesh 表格。
- `building_refined_lod1.glb`、`building_refined_lod2.glb`：遠距替代檔案。
- `load-building.mjs`：選用的 Three.js LOD 載入器，沿用世界座標並共用材質／建築幾何。
- `building_refined_preview.png`、`building_refined_front.png`：立面檢視；`threejs_validation.png`：實際 GLB 的 Three.js 畫面。

## 參考依據與範圍

已檢視新增照片 `public\ChatGPT Image 2026年9月21日 下午04_12_52.png`，以及原始 GLB 中的 `Image_2` 建築參考圖。可確認黑色密直柵欄杆、黑色圓窗框、矩形窗分格、礦物色外框、白色粉刷表面與鋪面。

保留現有樓層高度、兩個主體盒體的基礎幾何及世界矩陣。照片與簡化模型的比例和開窗配置並不完全相同；本次沿用既有開口的中心與範圍，沒有依照片重新移動整棟建築、推測室內格局、增加缺少的側窗或補建不可確認的屋頂結構。原模型中的深色屋頂量體仍保留。

## 已完成的建築細節

- 兩個右側陽台：將遮住欄杆的實心佔位體改為 0.075 場景單位厚的樓板、獨立地磚面、前方直柵及可見右側回折欄杆。沿用原有 1.8 × 1.1 範圍及樓板底標高，不向外擴建。原實心體減為薄板後，陽台深度可見。
- 三個既有立面護欄佔位體：依照片重建為密直柵；在護欄與既有牆面之間加入薄樓板，形成可編輯的空間深度。沒有另加照片以外的護欄位置。
- 三個圓窗：沿用既有中心／直徑，建立 64 分段的環形鋁框、獨立薄玻璃、淺凹槽及暗色底板；中層圓窗加入照片可辨識的橫向分格。
- 矩形窗與入口：由實心面板改為真正鏤空的框架、窗梃、玻璃、淺窗槽及窗台。側面三組重疊窗框整合成各自的外框、鋁框與玻璃組件。
- 主體、樓板、窗框與欄杆橫桿使用小幅 Bevel；主體窗槽維持可編輯 Boolean，並保留加權法線與輸出三角化修改器。修改器未破壞原始主體的基礎 Mesh。
- 建立白色粉刷、黑色陽極金屬、透射玻璃、礦物色窗框、暗窗槽與暖色地磚 PBR 材質。
- 粉刷 Normal／ORM 為 256²，地磚 Base Color／Normal／ORM 為 512²；使用實際 UV 貼圖輸出，沒有依賴 glTF 不支援的 Blender 程序節點。

## 面數、材質與檔案

原始場景：84 個 Mesh、118,822 個頂點、63,485 個三角面、84 個材質、4 張嵌入影像，檔案 12.14 MB。

| 層級 | 檔案 | 大小（十進位） | 場景三角面 | Mesh 物件 | 共用後唯一 Mesh | glTF 材質 |
|---|---|---:|---:|---:|---:|---:|
| LOD0 | `building_refined.glb` | 5.22 MB | 86,963 | 117 | 112 | 22 |
| LOD1 | `building_refined_lod1.glb` | 4.85 MB | 65,131 | 117 | 112 | 22 |
| LOD2 | `building_refined_lod2.glb` | 4.51 MB | 52,431 | 117 | 112 | 22 |

- LOD0 檔案較原始減少 57.0%。精緻化新增窗框、欄杆與倒角，場景三角面增加 37.0%；檔案縮小不代表面數減少。
- Blender 工作場景共 20 個材質；glTF 輸出為 22 個。多出的兩個是不同 UV 通道使用情境所需的材質變體，保留正確貼圖座標。
- 六株相同小植栽共用一份幾何與材質。這些是位於不同位置的植栽，不能直接刪除。沒有發現幾何及世界變換完全相同的重疊副本。
- 原始六株小植栽合計 42,978 三角面，占原場景約 67.7%；LOD1 小植栽目標比例 0.55、樹木 0.72；LOD2 為 0.30／0.50。車輛與其他環境物件不減面。
- LOD1／LOD2 場景三角面較 LOD0 減少 25.1%／39.7%。**所有 LOD 的建築頂點位置、法線、面索引、材質配置與物件階層完全相同；建築不做 Decimate。**
- 植栽 LOD 使用雙向取樣的表面距離檢查（不是完整 Hausdorff 保證）；每個唯一植栽網格／層級取樣約 4,000～5,000 點。小植栽最大取樣誤差占自身局部包圍盒最大邊長 2.58%／5.59%，樹木為 0.18%／0.72%。只供遠距使用，完整數據見 `refinement_metrics.json`。
- 三張環境色彩圖集由 2048² JPEG 改成獨立的 1024² JPEG；原始場景中的 2048² 圖集不受影響。移除執行檔中不需要的 1402 × 1122 參考圖。輸出共 8 張影像，全部嵌入 GLB。
- 未採用 Draco／Meshopt 或外部解碼器依賴。保留透射玻璃與 IOR 的標準 glTF 材質擴充。

## 可編輯場景與 Three.js 使用

`.blend` 內含 `00_Original_Reference`、`01_Refined_LOD0`、`02_Refined_LOD1`、`03_Refined_LOD2`。預設開啟精緻化 LOD0。原始場景維持 84 個原始 Mesh 與原材質。

精緻化階層為 `Building` → `Structure`／`Windows`／`Doors`／`Balconies`／`Facade_Details`／`Roof`，以及 `Environment` → `Vegetation`／`Context`／`Ground`／`Props`。每扇窗及陽台再分成框、玻璃、樓板或欄杆等子物件。`Review_Required` 存放用途待確認且保持原狀的建築物件；相鄰量體留在 `Context`。

Boolean 切割物件位於 `EDITABLE_RECESS_CUTTERS_NOT_EXPORTED`，保留於 `.blend` 供編輯，未混入 GLB。預覽攝影機與燈光也未輸出。參考圖平面只保留於原始比對場景。

`building_refined.glb` 可直接由 `GLTFLoader` 載入；不需要載入原始場景或額外貼圖。需要 LOD 時使用 `load-building.mjs`，它建立 `THREE.LOD`，預設距離 0／20／45 原場景單位、遲滯 0.12，並共用各層級材質與建築幾何。這些距離只是可調整的起始設定；真實建築尺度未經量測。glTF 本身不會自動切換這三個獨立檔案。

Blender 為 Z-up，GLB 為 Y-up，座標轉換由匯出器處理。沒有重新置中或縮放。玻璃應在有環境反射的 Three.js PBR 場景觀看；預覽與遊戲的光源會影響外觀。檢視圖為突出立面隱藏部分車輛、樹木與相鄰量體，交付 GLB 仍包含這些原有物件。

## 保留原狀／待人工檢查

- `Mesh_32`：Small white horizontal cylinders may be lights or details; function and intended mounting are unconfirmed. Preserve exact mesh and placement.
- `Mesh_33`：Small white horizontal cylinders may be lights or details; function and intended mounting are unconfirmed. Preserve exact mesh and placement.
- `primitive-base-mesh.006`：Neighboring large box outside target white facade; exact real-world identity unconfirmed. Preserve unchanged.
- `primitive-base-mesh.007`：Neighboring large box outside target white facade; exact real-world identity unconfirmed. Preserve unchanged.
- `primitive-base-mesh.013`：Dark rooftop box may represent a roof or simplified parapet. Photo does not establish hidden roof construction; retain geometry and placement.

主體仍是原模型的實心量體，並非 BIM 或室內模型。窗槽有有限深度與暗底，沒有憑空建立看不到的房間或牆體構造。若要完整重現照片中的凹入陽台、屋頂護欄與所有開窗，需另行確認可改動的量體／位置與尺寸範圍。

## 驗證結果

- 重新開啟交付 `.blend`，確認原始 84 個 Mesh 的幾何簽章、世界矩陣、材質槽，以及 84 個材質的著色參數、4 張封裝原圖均保留；5 個待檢查物件幾何、位置、材質與零修改器狀態保持原狀。
- 三個 GLB 均只含所選的一個精緻化場景，沒有原始比對場景、切割物件或參考圖平面；全部頂點資料為有限值，面索引範圍有效，外部資源依賴為零。
- 確認 110 個非植栽物件在 LOD 間幾何／法線／面索引、材質配置及階層一致。Boolean 重算造成的 UV 浮點差異最多約 0.000002，切線分量差異最多約 0.0002，低於檢查容許值，不影響建築輪廓。
- Chrome 實際使用 Three.js r175 的 `GLTFLoader` 載入全部三個 GLB，WebGL2 成功繪製，無瀏覽器錯誤；LOD 切換結果為 0 → 1 → 2。驗證畫面共 204 個 draw calls（包含玻璃透射相關繪製），不是特定遊戲／裝置的 FPS 保證。
- `validation_report.json`、`blend_validation.json` 記錄測試結果；`scripts/` 保留分析、重建與驗證程式。未執行遊戲功能測試，因為遊戲程式碼和資產引用未變更。

## 來源保護

`world.glb` 原始與完成後 SHA-256 相同：

`961fb0671221430d55be14941839df96b48e58164e380b31558942d57cfbd71b`

外部參考照片也已驗證 SHA-256 未變更。所有輸出均寫入獨立資料夾；沒有覆蓋 `world.glb`、提交 Git 或把新模型套用至遊戲。
