"""Add evidence-based roles to the completed, unmodified mesh inventory."""
import hashlib
import json
from collections import Counter
from pathlib import Path

OUT = Path(__file__).resolve().parents[1]
ROOT = OUT.parents[2]
PHOTO = ROOT / 'public' / 'ChatGPT Image 2026年9月21日 下午04_12_52.png'


def classify(name):
    if name.startswith('tripo_node_ea4'):
        return 'vegetation', 'high', False, 'Six matching small textured plants visible in source overview; identical geometry, different placements.'
    if name.startswith('tripo_node_40'):
        return 'vegetation', 'high', False, 'Large textured tree visible left of building in source overview.'
    if name.startswith('tripo_node_256'):
        return 'vehicle', 'high', False, 'Van visible in front-left source overview; outside architectural refinement scope.'
    if name.startswith('Mesh_'):
        n = int(name.split('_')[1])
        if n in (13, 14, 15):
            return 'street_light', 'high', False, 'Pole, arm and luminaire visible in source overview; preserve.'
        if n == 17:
            return 'structural_column', 'high', False, 'White circular column in front of main facade; supported by architectural photograph.'
        if n in (20, 21, 22):
            return 'round_window', 'high', False, 'Three front-facing circular placeholders aligned vertically at x=3.8; circular black-framed windows visible in photograph.'
        if n in (32, 33):
            return 'unconfirmed_fixture', 'low', True, 'Small white horizontal cylinders may be lights or details; function and intended mounting are unconfirmed. Preserve exact mesh and placement.'
        if n in (34, 35):
            return 'traffic_cone', 'high', False, 'Orange cone and square base visible in source overview; preserve.'
        if 46 <= n <= 48:
            return 'entrance_door', 'high', False, 'Ground-level door surround, infill and handle; use existing opening envelope.'
        if 49 <= n <= 52:
            return 'rectangular_window', 'high', False, 'Ground-floor front glazing surround and three panels; overlaps backing primitive .032.'
        if 53 <= n <= 70:
            return 'balcony_railing', 'high', False, 'Front and right return rails/pickets in two identical source balcony assemblies; dense vertical metal pattern confirmed by photograph.'
        if 74 <= n <= 79:
            return 'window_surround', 'high', False, 'Three nested side-window trim assemblies; cream surround and black inset glazing confirmed by photograph.'
    if name.startswith('primitive-base-mesh'):
        n = int(name.rsplit('.', 1)[1]) if '.' in name else 0
        if n in (0, 1):
            return 'building_mass', 'high', False, 'Overlapping white main and right-wing building masses; preserve dimensions and world matrices.'
        if n == 2:
            return 'roof_slab', 'high', False, 'Large shallow slab above main mass; preserve envelope.'
        if n in (3, 4, 5, 17, 18, 19, 22, 32):
            return 'rectangular_window', 'high', False, 'Dark facade-mounted window placeholders; locations and proportions supported by photograph. .032 is backing of Mesh_49 glazing.'
        if n in (6, 7):
            return 'context_mass_unconfirmed', 'medium', True, 'Neighboring large box outside target white facade; exact real-world identity unconfirmed. Preserve unchanged.'
        if n == 8:
            return 'boundary_wall', 'high', False, 'Low detached right boundary wall visible in source overview; preserve.'
        if n in (9, 10):
            return 'ground_paving', 'high', False, 'Two thin ground-level paving planes; preserve their extents and overlaps.'
        if n == 11:
            return 'reference_image_plane', 'high', False, 'Image_2 is an embedded architectural image, not a building surface. Keep in original comparison scene and exclude from runtime export.'
        if n in (12, 20, 21):
            return 'balcony_screen', 'high', False, 'Solid black rectangular guard placeholders in existing facade; matching vertical picket guards visible in reference photograph. Retain exact guard extents.'
        if n == 13:
            return 'roof_volume_unconfirmed', 'medium', True, 'Dark rooftop box may represent a roof or simplified parapet. Photo does not establish hidden roof construction; retain geometry and placement.'
        if n in (14, 15, 16):
            return 'window_surround', 'high', False, 'Side-window nested backing overlapping Mesh_74 through Mesh_79; rebuild as one editable trim/frame/glass assembly per existing opening.'
        if n in (23, 24, 25, 26):
            return 'hedge_proxy', 'high', False, 'Green rectangular landscape proxies in source overview; preserve.'
        if n in (27, 28, 29):
            return 'facade_band', 'high', False, 'Horizontal shallow facade bands at existing floor and roof heights; preserve footprint, soften edges.'
        if n in (30, 31):
            return 'balcony_volume', 'high', False, 'Solid balcony placeholders engulf the original rails. Rebuild floor and open railing inside existing bounds; no footprint or floor-height expansion.'
        if n == 33:
            return 'entrance_door', 'high', False, 'Backing placeholder for Mesh_46 door assembly.'
    return 'unconfirmed', 'low', True, 'Insufficient evidence; preserve geometry, materials and world transform.'


def main():
    path = OUT / 'model_analysis.json'
    data = json.loads(path.read_text(encoding='utf-8'))
    for obj in data['objects']:
        role, confidence, review, evidence = classify(obj['name'])
        obj.update(classification=role, confidence=confidence, requires_manual_review=review,
                   classification_evidence=evidence)
    data['reference_status'] = 'Inspected external photograph and embedded Image_2; no unseen structural reconstruction.'
    data['references'] = [
        {'path': str(PHOTO.relative_to(ROOT)), 'sha256': hashlib.file_digest(PHOTO.open('rb'), 'sha256').hexdigest(),
         'role': 'Primary supplied architectural photograph; front and right facades visible'},
        {'path': 'embedded_source_images/Image_2.png', 'role': 'Source GLB embedded architectural image; supplementary visual evidence'},
    ]
    data['classification_summary'] = dict(Counter(o['classification'] for o in data['objects']))
    data['manual_review_objects'] = [o['name'] for o in data['objects'] if o['requires_manual_review']]
    data['analysis_completed_before_refinement'] = True
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding='utf-8')
    lines = ['# 原始模型分析（精緻化前）', '',
             '來源：`world.glb`。先匯入 Blender Python API、完成清單與四向檢視，再建立獨立精緻化版本。', '',
             f"- Mesh：{data['summary']['meshes']}；頂點：{data['summary']['vertices']:,}；三角面：{data['summary']['triangles']:,}。",
             f"- 材質：{data['summary']['materials']}；嵌入影像：{data['summary']['images']}。",
             '- 六株相同小植栽合計 42,978 三角面（約 67.7%）；可共用幾何，遠距才減面。',
             '- 未找到幾何與世界變換都相同的重疊副本；重複形狀分布在不同位置，不能直接刪除。',
             '- 目前座標單位沿用 glTF；實際建築尺寸未經量測，禁止依照片擅自縮放。',
             '- 主體是兩個重疊實心盒體，並非含室內樓板與牆厚的 BIM 模型。窗戶採有限深度的凹槽，不臆造室內。',
             '- 陽台實心佔位體遮住既有欄杆；改為同一範圍內的薄板與開放式直柵。',
             '- 圓窗佔位幾何並非正確朝向立面的圓環；依既有世界包圍盒中心與半徑重建。',
             '- 原始內嵌參考圖平面保留於原始場景，不加入遊戲輸出。', '',
             '## 待人工檢查（保留現狀）', '']
    for o in data['objects']:
        if o['requires_manual_review']:
            lines.append(f"- `{o['name']}`：{o['classification_evidence']}")
    lines += ['', '## 全部 Mesh 清單', '',
              '尺寸與座標為 Blender Z-up 世界座標；完整矩陣、材質參數與依據見 `model_analysis.json`。', '',
              '| 原始名稱 | 分類 | 頂點 | 三角面 | 世界尺寸 X,Y,Z | 世界位置 X,Y,Z | 材質 | 人工檢查 |',
              '|---|---|---:|---:|---|---|---|---|']
    for o in data['objects']:
        fmt = lambda v: ', '.join(f'{x:.4f}' for x in v)
        lines.append(f"| {o['name']} | {o['classification']} | {o['vertices']} | {o['triangles']} | {fmt(o['dimensions_world'])} | {fmt(o['world_position'])} | {', '.join(o['materials'])} | {'是' if o['requires_manual_review'] else ''} |")
    (OUT / 'model_analysis.md').write_text('\n'.join(lines) + '\n', encoding='utf-8')
    print(json.dumps({'classified': len(data['objects']), 'manual_review': data['manual_review_objects']}, ensure_ascii=False))


if __name__ == '__main__':
    main()
