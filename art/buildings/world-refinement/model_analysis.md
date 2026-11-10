# 原始模型分析（精緻化前）

來源：`world.glb`。先匯入 Blender Python API、完成清單與四向檢視，再建立獨立精緻化版本。

- Mesh：84；頂點：118,822；三角面：63,485。
- 材質：84；嵌入影像：4。
- 六株相同小植栽合計 42,978 三角面（約 67.7%）；可共用幾何，遠距才減面。
- 未找到幾何與世界變換都相同的重疊副本；重複形狀分布在不同位置，不能直接刪除。
- 目前座標單位沿用 glTF；實際建築尺寸未經量測，禁止依照片擅自縮放。
- 主體是兩個重疊實心盒體，並非含室內樓板與牆厚的 BIM 模型。窗戶採有限深度的凹槽，不臆造室內。
- 陽台實心佔位體遮住既有欄杆；改為同一範圍內的薄板與開放式直柵。
- 圓窗佔位幾何並非正確朝向立面的圓環；依既有世界包圍盒中心與半徑重建。
- 原始內嵌參考圖平面保留於原始場景，不加入遊戲輸出。

## 待人工檢查（保留現狀）

- `Mesh_32`：Small white horizontal cylinders may be lights or details; function and intended mounting are unconfirmed. Preserve exact mesh and placement.
- `Mesh_33`：Small white horizontal cylinders may be lights or details; function and intended mounting are unconfirmed. Preserve exact mesh and placement.
- `primitive-base-mesh.006`：Neighboring large box outside target white facade; exact real-world identity unconfirmed. Preserve unchanged.
- `primitive-base-mesh.007`：Neighboring large box outside target white facade; exact real-world identity unconfirmed. Preserve unchanged.
- `primitive-base-mesh.013`：Dark rooftop box may represent a roof or simplified parapet. Photo does not establish hidden roof construction; retain geometry and placement.

## 全部 Mesh 清單

尺寸與座標為 Blender Z-up 世界座標；完整矩陣、材質參數與依據見 `model_analysis.json`。

| 原始名稱 | 分類 | 頂點 | 三角面 | 世界尺寸 X,Y,Z | 世界位置 X,Y,Z | 材質 | 人工檢查 |
|---|---|---:|---:|---|---|---|---|
| Mesh_13 | street_light | 196 | 128 | 0.0800, 0.0800, 3.6000 | -4.6000, -3.2000, 1.8000 | Material_13 |  |
| Mesh_14 | street_light | 196 | 128 | 0.8000, 0.0600, 0.0600 | -4.2500, -3.2000, 3.5500 | Material_14 |  |
| Mesh_15 | street_light | 24 | 12 | 0.3500, 0.1800, 0.1000 | -3.9000, -3.2000, 3.4500 | Material_15 |  |
| Mesh_17 | structural_column | 196 | 128 | 0.2500, 0.2500, 2.0000 | -1.4000, -1.3500, 1.0000 | Material_17 |  |
| Mesh_20 | round_window | 196 | 128 | 0.4000, 0.0600, 0.4000 | 3.8000, -1.1800, 0.6800 | Material_20 |  |
| Mesh_21 | round_window | 196 | 128 | 0.4200, 0.0600, 0.4200 | 3.8000, -1.1800, 2.0300 | Material_21 |  |
| Mesh_22 | round_window | 196 | 128 | 0.4200, 0.0600, 0.4200 | 3.8000, -1.1800, 3.5300 | Material_22 |  |
| Mesh_32 | unconfirmed_fixture | 196 | 128 | 0.1500, 0.1500, 0.0400 | -0.5000, -0.6000, 2.6200 | Material_32 | 是 |
| Mesh_33 | unconfirmed_fixture | 196 | 128 | 0.1200, 0.1200, 0.0400 | 3.1000, -1.1500, 1.3700 | Material_33 | 是 |
| Mesh_34 | traffic_cone | 130 | 64 | 0.1800, 0.1800, 0.3500 | -0.5000, -3.2000, 0.2400 | Material_34 |  |
| Mesh_35 | traffic_cone | 24 | 12 | 0.2500, 0.2500, 0.0400 | -0.5000, -3.2000, 0.0800 | Material_35 |  |
| Mesh_46 | entrance_door | 24 | 12 | 0.8500, 0.0800, 1.0000 | 1.1000, -0.8200, 0.5000 | Material_46 |  |
| Mesh_47 | entrance_door | 24 | 12 | 0.7500, 0.0200, 0.8500 | 1.1000, -0.8400, 0.5000 | Material_47 |  |
| Mesh_48 | entrance_door | 24 | 12 | 0.0300, 0.0300, 0.3500 | 1.1000, -0.8600, 0.5000 | Material_48 |  |
| Mesh_49 | rectangular_window | 24 | 12 | 1.8500, 0.1000, 0.9000 | 2.5000, -1.1200, 0.6500 | Material_49 |  |
| Mesh_50 | rectangular_window | 24 | 12 | 0.4000, 0.0200, 0.8000 | 2.0500, -1.1400, 0.6500 | Material_50 |  |
| Mesh_51 | rectangular_window | 24 | 12 | 0.4000, 0.0200, 0.8000 | 2.5000, -1.1400, 0.6500 | Material_51 |  |
| Mesh_52 | rectangular_window | 24 | 12 | 0.4000, 0.0200, 0.8000 | 2.9500, -1.1400, 0.6500 | Material_52 |  |
| Mesh_53 | balcony_railing | 24 | 12 | 1.8000, 0.0400, 0.0400 | 3.1000, -1.6700, 1.9200 | Material_53 |  |
| Mesh_54 | balcony_railing | 24 | 12 | 1.8000, 0.0400, 0.0400 | 3.1000, -1.6700, 1.5200 | Material_54 |  |
| Mesh_55 | balcony_railing | 24 | 12 | 0.0400, 1.0500, 0.0400 | 3.9800, -1.1500, 1.9200 | Material_55 |  |
| Mesh_56 | balcony_railing | 24 | 12 | 0.0400, 1.0500, 0.0400 | 3.9800, -1.1500, 1.5200 | Material_56 |  |
| Mesh_57 | balcony_railing | 24 | 12 | 0.0300, 0.0200, 0.3800 | 2.5000, -1.6700, 1.7200 | Material_57 |  |
| Mesh_58 | balcony_railing | 24 | 12 | 0.0300, 0.0200, 0.3800 | 2.8000, -1.6700, 1.7200 | Material_58 |  |
| Mesh_59 | balcony_railing | 24 | 12 | 0.0300, 0.0200, 0.3800 | 3.1000, -1.6700, 1.7200 | Material_59 |  |
| Mesh_60 | balcony_railing | 24 | 12 | 0.0300, 0.0200, 0.3800 | 3.4000, -1.6700, 1.7200 | Material_60 |  |
| Mesh_61 | balcony_railing | 24 | 12 | 0.0300, 0.0200, 0.3800 | 3.7000, -1.6700, 1.7200 | Material_61 |  |
| Mesh_62 | balcony_railing | 24 | 12 | 1.8000, 0.0400, 0.0400 | 3.1000, -1.6700, 3.3200 | Material_62 |  |
| Mesh_63 | balcony_railing | 24 | 12 | 1.8000, 0.0400, 0.0400 | 3.1000, -1.6700, 2.9200 | Material_63 |  |
| Mesh_64 | balcony_railing | 24 | 12 | 0.0400, 1.0500, 0.0400 | 3.9800, -1.1500, 3.3200 | Material_64 |  |
| Mesh_65 | balcony_railing | 24 | 12 | 0.0400, 1.0500, 0.0400 | 3.9800, -1.1500, 2.9200 | Material_65 |  |
| Mesh_66 | balcony_railing | 24 | 12 | 0.0300, 0.0200, 0.3800 | 2.5000, -1.6700, 3.1200 | Material_66 |  |
| Mesh_67 | balcony_railing | 24 | 12 | 0.0300, 0.0200, 0.3800 | 2.8000, -1.6700, 3.1200 | Material_67 |  |
| Mesh_68 | balcony_railing | 24 | 12 | 0.0300, 0.0200, 0.3800 | 3.1000, -1.6700, 3.1200 | Material_68 |  |
| Mesh_69 | balcony_railing | 24 | 12 | 0.0300, 0.0200, 0.3800 | 3.4000, -1.6700, 3.1200 | Material_69 |  |
| Mesh_70 | balcony_railing | 24 | 12 | 0.0300, 0.0200, 0.3800 | 3.7000, -1.6700, 3.1200 | Material_70 |  |
| Mesh_74 | window_surround | 24 | 12 | 0.1600, 0.4800, 0.8500 | 4.3200, -0.2000, 3.7250 | Material_74 |  |
| Mesh_75 | window_surround | 24 | 12 | 0.1400, 0.3600, 0.7000 | 4.3400, -0.2000, 3.7250 | Material_75 |  |
| Mesh_76 | window_surround | 24 | 12 | 0.1600, 0.4800, 0.8500 | 4.3200, -0.2000, 2.5250 | Material_76 |  |
| Mesh_77 | window_surround | 24 | 12 | 0.1400, 0.3600, 0.7000 | 4.3400, -0.2000, 2.5250 | Material_77 |  |
| Mesh_78 | window_surround | 24 | 12 | 0.1600, 0.6200, 0.5500 | 4.3200, -0.2000, 0.9250 | Material_78 |  |
| Mesh_79 | window_surround | 24 | 12 | 0.1400, 0.5000, 0.4000 | 4.3400, -0.2000, 0.9250 | Material_79 |  |
| primitive-base-mesh | building_mass | 24 | 12 | 5.5000, 4.5000, 4.2000 | 0.4000, 1.5000, 2.1000 | Material_0 |  |
| primitive-base-mesh.001 | building_mass | 24 | 12 | 3.0000, 3.2000, 4.6000 | 2.8000, 0.5000, 2.3000 | Material_1 |  |
| primitive-base-mesh.002 | roof_slab | 24 | 12 | 5.7000, 4.7000, 0.2500 | 0.4000, 1.5000, 4.3250 | Material_2 |  |
| primitive-base-mesh.003 | rectangular_window | 24 | 12 | 1.5000, 0.1000, 0.7500 | -0.2000, -0.7800, 1.9250 | Material_3 |  |
| primitive-base-mesh.004 | rectangular_window | 24 | 12 | 1.5000, 0.1000, 0.7500 | -0.2000, -0.7800, 3.2250 | Material_4 |  |
| primitive-base-mesh.005 | rectangular_window | 24 | 12 | 0.1000, 0.8000, 0.6500 | 4.3200, 0.6000, 3.1250 | Material_5 |  |
| primitive-base-mesh.006 | context_mass_unconfirmed | 24 | 12 | 2.2000, 4.0000, 3.8000 | -3.6000, 2.0000, 1.9000 | Material_6 | 是 |
| primitive-base-mesh.007 | context_mass_unconfirmed | 24 | 12 | 5.0000, 5.0000, 7.5000 | -5.5000, 7.0000, 3.7500 | Material_7 | 是 |
| primitive-base-mesh.008 | boundary_wall | 24 | 12 | 0.1500, 4.0000, 1.1000 | 5.2000, 0.2000, 0.5500 | Material_8 |  |
| primitive-base-mesh.009 | ground_paving | 24 | 12 | 14.0000, 2.2000, 0.0500 | -0.5000, -2.2000, 0.0350 | Material_9 |  |
| primitive-base-mesh.010 | ground_paving | 24 | 12 | 3.8000, 3.5000, 0.0600 | 4.2000, -2.0000, 0.0500 | Material_10 |  |
| primitive-base-mesh.011 | reference_image_plane | 4 | 2 | 1.0500, 0.0000, 0.8403 | 0.0000, -0.6337, 0.4202 | Material_16 |  |
| primitive-base-mesh.012 | balcony_screen | 24 | 12 | 2.6000, 0.0500, 0.4500 | -0.3000, -1.4500, 1.4750 | Material_18 |  |
| primitive-base-mesh.013 | roof_volume_unconfirmed | 24 | 12 | 5.3000, 4.5000, 0.4000 | 0.4000, 1.5000, 4.5000 | Material_19 | 是 |
| primitive-base-mesh.014 | window_surround | 24 | 12 | 0.1200, 0.4000, 0.7500 | 4.3200, -0.2000, 3.6750 | Material_23 |  |
| primitive-base-mesh.015 | window_surround | 24 | 12 | 0.1200, 0.4000, 0.7500 | 4.3200, -0.2000, 2.4750 | Material_24 |  |
| primitive-base-mesh.016 | window_surround | 24 | 12 | 0.1200, 0.5500, 0.4500 | 4.3200, -0.2000, 0.8750 | Material_25 |  |
| primitive-base-mesh.017 | rectangular_window | 24 | 12 | 0.1800, 0.0800, 0.8500 | -1.7000, -1.0200, 0.5750 | Material_26 |  |
| primitive-base-mesh.018 | rectangular_window | 24 | 12 | 0.1800, 0.0800, 0.8500 | -1.7000, -1.0200, 1.9750 | Material_27 |  |
| primitive-base-mesh.019 | rectangular_window | 24 | 12 | 0.1800, 0.0800, 0.8500 | -1.7000, -1.0200, 3.2750 | Material_28 |  |
| primitive-base-mesh.020 | balcony_screen | 24 | 12 | 1.2000, 0.0600, 0.4200 | 1.1000, -1.1500, 2.8600 | Material_29 |  |
| primitive-base-mesh.021 | balcony_screen | 24 | 12 | 1.2000, 0.0600, 0.4200 | 1.1000, -1.1500, 1.5600 | Material_30 |  |
| primitive-base-mesh.022 | rectangular_window | 24 | 12 | 0.9500, 0.0600, 0.6500 | 2.5000, -1.1200, 1.9250 | Material_31 |  |
| primitive-base-mesh.023 | hedge_proxy | 24 | 12 | 1.8000, 0.6000, 0.4500 | 5.1000, -2.2000, 0.2650 | Material_36 |  |
| primitive-base-mesh.024 | hedge_proxy | 24 | 12 | 2.2000, 0.4000, 0.3500 | -1.5000, -2.7000, 0.2150 | Material_37 |  |
| primitive-base-mesh.025 | hedge_proxy | 24 | 12 | 2.6000, 0.4000, 0.4000 | 1.6000, -2.7000, 0.2400 | Material_38 |  |
| primitive-base-mesh.026 | hedge_proxy | 24 | 12 | 2.2000, 0.4000, 0.3800 | 4.5000, -2.9000, 0.2300 | Material_39 |  |
| primitive-base-mesh.027 | facade_band | 24 | 12 | 5.7000, 0.1200, 0.0800 | 0.4000, -0.8800, 1.5200 | Material_71 |  |
| primitive-base-mesh.028 | facade_band | 24 | 12 | 5.7000, 0.1200, 0.0800 | 0.4000, -0.8800, 2.8200 | Material_72 |  |
| primitive-base-mesh.029 | facade_band | 24 | 12 | 5.9000, 0.1500, 0.1200 | 0.4000, -0.8800, 4.2600 | Material_73 |  |
| primitive-base-mesh.030 | balcony_volume | 24 | 12 | 1.8000, 1.1000, 0.4500 | 3.1000, -1.1500, 1.7250 | Material_80 |  |
| primitive-base-mesh.031 | balcony_volume | 24 | 12 | 1.8000, 1.1000, 0.4500 | 3.1000, -1.1500, 3.1250 | Material_81 |  |
| primitive-base-mesh.032 | rectangular_window | 24 | 12 | 1.8000, 0.1000, 0.8500 | 2.5000, -1.0800, 0.6250 | Material_82 |  |
| primitive-base-mesh.033 | entrance_door | 24 | 12 | 0.7000, 0.1000, 1.0000 | 1.1000, -0.7800, 0.5000 | Material_83 |  |
| tripo_node_2564325a-fb35-49d2-8a94-c82f8eb06e11 | vehicle | 12155 | 9742 | 2.5727, 1.0623, 1.1429 | -4.2000, -4.1000, 0.6014 | tripo_material_2564325a-fb35-49d2-8a94-c82f8eb06e11 |  |
| tripo_node_40f33689-19e3-4f47-af31-3b40153ef03f | vegetation | 11743 | 8883 | 5.0858, 4.3075, 6.8571 | -4.8000, -1.2000, 3.4285 | tripo_material_40f33689-19e3-4f47-af31-3b40153ef03f |  |
| tripo_node_ea4b5c3e-d929-4ee4-b03d-87afa3dcea7c | vegetation | 15273 | 7163 | 0.5271, 0.5486, 0.3704 | -1.8000, -2.7000, 0.2252 | tripo_material_ea4b5c3e-d929-4ee4-b03d-87afa3dcea7c |  |
| tripo_node_ea4b5c3e-d929-4ee4-b03d-87afa3dcea7c.001 | vegetation | 15273 | 7163 | 0.5271, 0.5486, 0.3704 | -1.0000, -2.7000, 0.2252 | tripo_material_ea4b5c3e-d929-4ee4-b03d-87afa3dcea7c.001 |  |
| tripo_node_ea4b5c3e-d929-4ee4-b03d-87afa3dcea7c.002 | vegetation | 15273 | 7163 | 0.5271, 0.5486, 0.3704 | 1.2000, -2.7000, 0.2252 | tripo_material_ea4b5c3e-d929-4ee4-b03d-87afa3dcea7c.002 |  |
| tripo_node_ea4b5c3e-d929-4ee4-b03d-87afa3dcea7c.003 | vegetation | 15273 | 7163 | 0.5271, 0.5486, 0.3704 | 2.0000, -2.7000, 0.2252 | tripo_material_ea4b5c3e-d929-4ee4-b03d-87afa3dcea7c.003 |  |
| tripo_node_ea4b5c3e-d929-4ee4-b03d-87afa3dcea7c.004 | vegetation | 15273 | 7163 | 0.5271, 0.5486, 0.3704 | 4.2000, -2.9000, 0.2252 | tripo_material_ea4b5c3e-d929-4ee4-b03d-87afa3dcea7c.004 |  |
| tripo_node_ea4b5c3e-d929-4ee4-b03d-87afa3dcea7c.005 | vegetation | 15273 | 7163 | 0.5271, 0.5486, 0.3704 | 4.9000, -2.9000, 0.2252 | tripo_material_ea4b5c3e-d929-4ee4-b03d-87afa3dcea7c.005 |  |
