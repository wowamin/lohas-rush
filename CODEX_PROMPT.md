# Codex 執行指令

你是資深 React + TypeScript + React Three Fiber 遊戲工程師。

任務：在目前 **lohas-rush** 專案上檢查、修正並完善 V0.1 3D 城市駕駛 MVP。

## 安全限制
1. 先輸出 pwd / git status，確認目前資料夾是 lohas-rush。
2. 不得修改、刪除、移動或覆蓋 lohas_islands。
3. 不得對任何 repo 執行 git reset --hard、git clean -fd、強制推送。
4. 不得假設已取得原遊戲素材。

## 任務
1. 讀取 README.md、package.json 和 src 目錄。
2. 執行 npm install、npm run build；逐一修復 TypeScript、套件與編譯錯誤。
3. 檢查 WASD/方向鍵、Space 煞車、R 重置、第三人稱鏡頭、建築碰撞。
4. 驗證三個據點依序觸發任務、HUD 正確更新、重置後任務清空。
5. 改善物理固定時間步長與碰撞可靠性，但不要引入後端或多人連線。
6. 以 Chrome 瀏覽器實測（若執行環境不具備瀏覽器，明確列為未測試）。
7. 更新 README，記錄執行方式、實際測試結果與未完成項目。

## 驗收
- npm run build 成功
- npm run dev 可以開啟
- 駕駛與鏡頭流暢
- 車輛不穿牆、重置正常
- 三個任務可完成
- 原 lohas_islands 完全不變

先讓 V0.1 穩定運作，不要開始 V0.2。
