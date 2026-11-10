# 午後天空與表面素材來源

`lohas-afternoon.hdr` 是本專案以 `tools/generate_render_environment.mjs` 產生的 512 × 256 Radiance RGBE 高動態範圍天空，含天頂、地平線、地面反光與太陽亮區。它是程序天空，並非實景 HDR 攝影。

粉刷、混凝土、柏油、地磚與草地的 256² Base Color／Normal／Roughness 由 `src/game/rendering/materials.ts` 在本機產生，使用世界座標比例，沒有下載第三方貼圖。新生成的天空與紋理可依本專案使用；這些原創程序素材以 CC0-1.0 提供。

原有 GLB、包膜色塊及使用者參考照片沿用各自來源說明；此宣告不替使用者照片或既有外部素材授權。建築參考照片僅作風格與可見外觀的參考。
