import { readFile,writeFile,mkdir } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';

const folder='.test-artifacts/rendering';
const read=async file=>JSON.parse(await readFile(`${folder}/${file}`,'utf8'));
const before=await read('before.json'),after=await read('after.json'),browser=await read('browser-validation.json'),pages=await read('pages-validation.json');
const regression=await read('regression/results.json');
const changed=execFileSync('git',['diff','--name-only'],{encoding:'utf8',windowsHide:true}).trim().split('\n');
const untracked=execFileSync('git',['ls-files','--others','--exclude-standard'],{encoding:'utf8',windowsHide:true}).trim().split('\n')
  .filter(file=>!file.startsWith('art/buildings/')&&!file.startsWith('public/ChatGPT')&&file!=='world.glb');
const sourceHash=createHash('sha256').update(await readFile('world.glb')).digest('hex');
const table=after.samples.map(s=>`| ${s.quality} | ${s.fps.toFixed(2)} | ${s.frameMsP95.toFixed(1)} ms | ${s.beautyDrawCalls.toFixed(0)} | ${s.drawCalls.toFixed(0)} | ${s.geometries} | ${s.textures} | ${(s.jsHeapBytes/1048576).toFixed(1)} MiB |`).join('\n');
const b=before.samples[0];
const report=`# 樂活狂飆渲染升級驗收

2026-11-10（Asia/Taipei）。在現有 D:\\lohas-rush 開發，未修改 lohas_islands、未執行 reset/clean、未部署或推送正式網站。

## 完成內容

- **Phase 1**：檢查原有 React 18.3.1、Three.js 0.175.0、R3F 8.18.0、Drei 9.122.0、Zustand 5.0.16、Vite 6.4.5 與載入管線；先記錄原場景 1080p 基準，原始 84 項測試通過。
- **Phase 2**：明確設定 sRGB、ACES、exposure 0.94、PCFSoftShadowMap；午後太陽與 Hemisphere 補光、原創自託管 RGBE HDR 天空與 PMREM 反射。太陽陰影跟隨車輛或展示建築，以 texel 對齊降低閃爍；每個畫格只更新一次陰影，AO 不重畫陰影。
- **Phase 3**：共享材質工廠與世界尺度 UV；白色粉刷、深灰混凝土陽台、礦物色外框、金屬與反射玻璃。總部外牆小幅倒角；四棟特色建築保留位置、入口、標牌及原始輪廓。街坊外牆淡化為白色系，保留店面識別色。
- **Phase 4**：柏油細顆粒、0.6 m 模組磁磚、粗糙度與細微 Normal、立體路緣及草地；沿用所有 streetFurniture 種植座標，以 5 個 InstancedMesh 批次繪製樹幹、近／遠樹冠、棕櫚樹與灌木，依距離分級及裁切，不增加道路上的碰撞物件。大面積鋪面不作陰影投射，避免共面路面出現自陰影條紋；Medium/High 的 AO 補足細節接觸感。
- **Phase 5**：沿用可駕駛的 lohas_service_van.glb 與同步 fallback，改善清漆、黑膠輪胎、輪框、玻璃、燈具與鏡面；保留彩色幾何識別和透明車窗契約，加入輪胎／底盤漸層接地陰影。Y-up、-Z 朝前、地面中心原點及既有 2.45 m 碰撞半徑通過原測試；車身／輪胎比例沿用已驗證的遊戲尺寸，未縮放而破壞座位或車門樞軸。
- **Phase 6**：保留原第三人稱、服務及輪椅相機；新增四棟建築的自由環繞、平移、縮放與直接 PNG 擷取。停車且接送流程收妥才可進入展示；展示期間凍結駕駛及接送，返回後恢復原相機與操作。
- **Phase 7**：Low／Medium／High 可直接切換，儲存偏好，支援 ?quality=low 作固定測試設定。Low：512 陰影、85 m 植栽距離、AO/Bloom 關閉；Medium：1536 陰影、150 m 植栽、半解析度 8-sample SSAO；High：2048 陰影、220 m 植栽、0.65 解析度 12-sample SSAO，可另開微量 Bloom。DPR 上限 1／1.25／1.5；主畫面／後製使用適當 MSAA 和一次輸出轉色。未加入景深，維持駕駛視野。
- **Phase 8**：TypeScript、Vite 建置、87 項程式測試、既有瀏覽器回歸、專用渲染／展示測試和正式建置的 /lohas-rush/ 前綴資源驗證。Windows 截圖鎖定曾導致 Vite watcher 中斷，已排除測試及離線建模產物的監看。

## 已知資產與幾何限制

專案沒有指定的 **lohas_shuttle_game.glb**，已在開始時告知並詢問路徑；本次實際使用 public/assets/models/lohas_service_van.glb。未宣稱已替換成另一個不存在的模型。

四個選用模型 scooter.glb、blue_truck.glb、traffic_cone.glb、shophouse.glb 仍未提供，沿用原本的幾何替代流程；這些預期的 404 不影響可駕駛服務車或 HDR 天空載入。原本的 GameAssets、TrackManager、碰撞資料、任務和固定時間步物理沒有改寫。

遊戲目前使用程序建築，不是先前 world.glb 的獨立場景。沒有把含相鄰量體／車輛的 world.glb 整場套入城市。需要 Blender 的後續項目：依照片重分凹入陽台、實際牆厚及窗洞、完整樓層與開窗配置；服務車的獨立輪軸／轉向節點、更細輪胎與鈑金輪廓、車燈內部結構、正確車款與包膜原稿。提高材質或曝光無法修復這些幾何。

建築窗戶採不透明反射型 MeshPhysicalMaterial（transmission=0），避免大量排序或額外透射 pass；它不代表已有可透視室內。車窗保留透明與 depthWrite=false，乘客和門動畫仍可見。輪胎接地暗部是輕量漸層貼片，並非宣稱使用即時光線追蹤。

HDR 為程序下午天空，不是實景攝影。512×256 HDR 與 256² 表面圖均由專案程式生成；來源／原創素材 CC0 說明見 public/assets/environments/README.md。沒有新增 CDN、HDR preset、外部模型下載或 npm 依賴；使用者照片和既有素材未重新授權。

## 測試結果

- npm run build：成功（Vite 仍提示大型主 chunk；未調高警告門檻掩蓋）。
- npm run test：87／87 通過；npm run test:street 另驗證街道模組。
- 渲染瀏覽器：${browser.passed?'通過':'失敗'}；實際 HDR／GLB 載入、著色器、三種畫質、AO／Bloom、展示環繞、凍結座標／任務、PNG 下載、返回油門／煞車／重置及偏好保存。
- 正式輸出前綴：${pages.passed?'通過':'失敗'}；將真正 dist 掛在 /lohas-rush/，確認 JS、CSS、HDR 與服務車 GLB 都回應 200 且未逸出前綴。這是本機模擬驗證，正式 GitHub Pages 沒有部署。
- 原有瀏覽器組別：${regression.filter(r=>r.status==='passed').length}／${regression.length} 通過。為避免軟體渲染與多瀏覽器互相競爭，依既有 runner 序列執行，固定 Low 畫質測遊戲功能；Medium/High 另測完整渲染與展示流程。

${regression.map(r=>`| ${r.file} | ${r.status} | ${r.seconds} s |`).join('\n')}

## 實測數據與限制

同一出生點、1920×1080、DPR 1、相同 Chrome／SwiftShader，停車取樣至少 30 幀；未打開 Bloom。**這是軟體渲染，並非使用者 RTX 3050 Laptop 的硬體測試，不能宣稱已達成 Medium 60 FPS 或 High 30 FPS。**

| 設定 | 平均 FPS | P95 畫格時間 | 主色彩 pass calls | 全畫格 calls | GPU 幾何物件 | GPU 貼圖物件 | JS heap |
|---|---:|---:|---:|---:|---:|---:|---:|
| 原始 | ${b.fps.toFixed(2)} | ${b.frameMsP95.toFixed(1)} ms | ${b.drawCalls} | 未取樣 | ${b.geometries} | ${b.textures} | ${(b.jsHeapBytes/1048576).toFixed(1)} MiB |
${table}

原始 renderer.info 在主繪製前自動清零，原始 calls 僅含主色彩 pass；升級後也分別記錄 beautyDrawCalls，供同範圍比較。升級後全畫格 calls 另包含陰影、法線、AO、MSAA／輸出等 pass，不能拿它直接和原始主 pass 比較。FPS 包含所有實際繪製。

JS heap 是 Chrome 的 JavaScript 記憶體，不是 VRAM；幾何／貼圖欄為 renderer.info 的物件數，不是位元組。WebGL 不提供可信的目前專用 GPU 記憶體讀數，因此 hardwareGPUBytes 留 null。4GB 顯示記憶體使用量和 1080p FPS 目標仍需在指定筆電以工作管理員或 GPU profiler 實測。較大畫面、陰影、環境圖和 AO 都有額外成本；Low 可作較弱裝置的回退。

原始 world.glb SHA-256 仍為 ${sourceHash}。

## 修改檔案

${[...new Set([...changed,...untracked])].filter(Boolean).map(file=>'- '+file).join('\n')}

其中 tests/street-furniture.browser.mjs 的舊斷言「所有遠方樹都繪製且少於 10 批」已改為驗證完整種植位置、距離裁切及有限 PBR 批次；兩個既有截圖測試將相機回呼依 priority 排序，確保在新增後製繪製回呼之前執行。沒有移除駕駛／碰撞／任務斷言。

API 參考：[R3F Canvas 色彩與陰影](https://r3f.docs.pmnd.rs/api/canvas)、[Three.js Renderer](https://threejs.org/docs/#api/en/renderers/WebGLRenderer)、[Drei Environment 與 CDN 素材注意事項](https://drei.docs.pmnd.rs/staging/environment)。實作以已安裝 r175 的 API／原始碼和實際編譯為準。

完整 JSON、畫面及逐組測試紀錄位於 .test-artifacts/rendering/。重測：npm run test、npm run test:rendering:browser、npm run benchmark:rendering，以及 node tools/validate-pages-rendering.mjs。Windows PowerShell 可使用 npm.cmd。
`;
await mkdir('docs',{recursive:true});await writeFile('docs/rendering-upgrade-report.md',report);
await writeFile('docs/rendering-benchmarks.json',JSON.stringify({before,after,regression,browser,pages,sourceHash},null,2));
console.log('Wrote docs/rendering-upgrade-report.md and docs/rendering-benchmarks.json');
