# 樂活廂型服務車｜第一階段

`lohas-service-van.blend` 為本專案以 Blender 5.2.3 製作的可編輯模型。
主要參考是使用者提供的 `public/lohas_car2.jpg`；其餘三張為不同車型，未當作多角度資料拼合。
未下載第三方模型，沒有包膜照片貼圖、電話、車牌、車廠徽章或重畫的樂活圖形標誌。
側面以粉／黃／淺綠／淺藍多邊形與白色留縫近似包膜，只使用照片可讀的普通字樣 LOHAS GROUP。
目前不是精確車款、真實尺寸或包膜施工檔；另一側對稱示意，車頭中性簡化，車尾已參照新提供的 KOMBI／STARIA 圖片加入可活動上掀門。

輸出：`public/assets/models/lohas_service_van.glb`，目前 2686 三角面、14 種材質／29 個網格批次，229,660 bytes，無外部貼圖或解碼器。
fallback：`src/game/vehicle/serviceVanGeometry.json`，與 GLB 共用同一套 Blender 三角形資料。

駕駛艙已向前擴充：車頂前緣 Z=-1.65（原 -0.75），前玻璃下緣 Z=-2.05／Y=1.5，上緣 Z=-1.65／Y=2.35。前側窗與地板一併延伸，低儀表台移至駕駛前方，司機坐姿及角色大小維持原值。`van-windshield` 為真正開孔內的半透明面（opacity 0.45），後方沒有實心白色面；GLB 本身也儲存玻璃 alpha，執行時 GLB／fallback 同步設定透明、關閉玻璃 depthWrite 與投影。這是遊戲比例的艙內空間調整，不宣稱忠實還原某一車款。
Blender 檔案不會在遊戲執行時下載。

重新產生（在專案根目錄執行）：

```powershell
& 'C:/Program Files/Blender Foundation/Blender 5.2/blender.exe' --background --python-exit-code 1 --python tools/create_service_van.py
```

腳本採 [Blender glTF 匯出 API](https://docs.blender.org/api/main/bpy.ops.export_scene.html) 輸出 Y-up。
程式內先以遊戲座標建模，再轉換為 Blender 座標 `(x,-z,y)`。
輸出以公尺為單位、+Y 向上、-Z 車頭，原點位於車輛中心地面。車身寬 2.16 m，含鏡約 2.564 m、長 4.32 m、頂高約 2.46 m；此為遊戲比例。
輪軸 X=±1.075、Z=±1.3、Y=.56，輪胎半徑 .42、厚 .25 m，最低點 .14 m 配合道路高度。
全模型頂點經驗證在既有 2.45 m 碰撞半徑內，不更動駕駛或城市碰撞設定。

後門獨立節點為 `rearHatch`，閉合時在原碰撞範圍內；停車後繞上緣向外開啟約 120 度。側面改為真正窗孔與半透明車窗，可看見車內乘客。JSON 同時保存後門局部座標與樞軸，fallback 與 GLB 可播放相同動畫。
升降平台、兩側支架／伸縮桿與爺爺奶奶角色由 Three.js 幾何建立，不宣稱已製作它們的 GLB 或骨架動畫。參考來源見 `art/references/accessibility/README.md`。
行駛時兩位在車內、平台折起，僅停妥且車後保留區域沒有建築、河岸或邊界阻擋時可展開。接送期間額外保留後方空間並禁止行駛，收妥後恢復原車體碰撞規則。

雙側前門分為 `driverDoor`／`passengerDoor` 樞軸與門體／玻璃／包膜／把手／側鏡，各開約 68 度，GLB 與 fallback 同步。司機在左駕、照服員在右側副駕，均有座墊與彎膝坐姿；停車後各自下車，司機操作控制台、照服員接手推輪椅。回車時兩人沿左右側返回座位並關門後才恢復行車。卸客前檢查雙側通道及後方平台／推行區；輪椅會避開等候司機。角色、控制台與關節動作皆由 Three.js 建立，未宣稱已有 Blender 角色骨架或動作捕捉。

待補：同一車的正／背／另一側及車頂照片、尺寸、清晰包膜原稿、向量標誌與可重用授權紀錄。
使用者提供照片供本次外觀參考；不宣稱照片可授權第三方使用。純幾何色塊只是遊戲近似。
