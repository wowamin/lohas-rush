# 可選 GLB 模型

`lohas_service_van.glb` 已由本專案用 Blender 製作，作為唯一可駕駛的廂型服務車。
來源、重建方式、照片對應與外觀限制見 `art/vehicles/README.md`。
車輛 +Y 向上、-Z 朝前，已使用遊戲尺寸，不套用下述店屋的置中縮放；載入失敗會保留同款純幾何 fallback。

可放入有明確來源及使用授權的 scooter.glb、blue_truck.glb、traffic_cone.glb、shophouse.glb。
目前未提供這四個模型，程式會保留幾何替代，不宣稱已取得真實店家或日照中心外觀。

模型以 Y 軸向上，店屋正面朝 +Z；程式會置中、貼地並以等比例縮放限制於既定體積。
店屋僅替換一般店家，不替換五間中心的實景佔位。請提供模型來源、作者與授權文件。
目前沒有配置 Draco／KTX2 解碼器；無法解碼的檔案會走替代流程。
