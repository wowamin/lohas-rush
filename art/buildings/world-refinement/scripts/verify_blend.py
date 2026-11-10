"""Reopen the delivered .blend and verify source preservation and editable scenes."""
import bpy
import json
import sys
from pathlib import Path

OUT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(Path(__file__).resolve().parent))
from analyze_model import mesh_signature, material_info, sha256

audit = json.loads((OUT / 'model_analysis.json').read_text(encoding='utf-8'))
bpy.ops.wm.open_mainfile(filepath=str(OUT / 'building_refined.blend'))
original = bpy.data.scenes['00_Original_Reference']
bpy.context.window.scene = original
bpy.context.view_layer.update()
records = {r['name']: r for r in audit['objects']}
assert len([o for o in original.objects if o.type == 'MESH']) == 84
for name, r in records.items():
    obj = original.objects[name]
    assert mesh_signature(obj.data) == r['geometry_sha256'], name
    assert max(abs(obj.matrix_world[i][j]-r['world_matrix'][i][j]) for i in range(4) for j in range(4)) < 1e-6, name
    assert [s.material.name for s in obj.material_slots] == r['materials'], name
for r in audit['materials']:
    actual = material_info(bpy.data.materials[r['name']])
    for key in ['diffuse_rgba', 'uses_nodes', 'principled', 'images', 'node_types']:
        assert actual.get(key) == r.get(key), (r['name'], key)
for r in audit['images']:
    actual = bpy.data.images[r['name']]
    assert list(actual.size) == r['size'], r['name']
    assert bool(actual.packed_file), r['name']
work = bpy.data.scenes['01_Refined_LOD0']
bpy.context.window.scene = work
bpy.context.view_layer.update()
uncertain = []
for obj in work.objects:
    if not obj.get('requires_manual_review'):
        continue
    source = obj['source_objects']
    r = records[source]
    assert mesh_signature(obj.data) == r['geometry_sha256']
    assert len(obj.modifiers) == 0
    assert max(abs(obj.matrix_world[i][j]-r['world_matrix'][i][j]) for i in range(4) for j in range(4)) < 1e-6
    assert [s.material.name for s in obj.material_slots] == r['materials']
    uncertain.append(source)
assert set(uncertain) == set(audit['manual_review_objects'])
for name in ['Main_Building_Mass', 'Right_Wing_Mass']:
    obj = work.objects[name]
    assert obj.parent.name == 'Structure'
    assert any(m.type == 'BOOLEAN' for m in obj.modifiers)
    assert any(m.type == 'BEVEL' for m in obj.modifiers)
    r = records[obj['source_objects']]
    assert mesh_signature(obj.data) == r['geometry_sha256']
    assert max(abs(obj.matrix_world[i][j]-r['world_matrix'][i][j]) for i in range(4) for j in range(4)) < 1e-6
assert sha256(OUT.parents[2] / 'world.glb') == audit['source']['sha256_before']
result = {'passed': True, 'original_meshes_verified': 84, 'original_materials_verified': 84,
          'original_packed_images_verified': 4, 'unchanged_manual_review_objects': uncertain,
          'main_masses_base_geometry_and_world_matrices_preserved': True,
          'live_recess_and_bevel_modifiers': True, 'source_file_hash_unchanged': True,
          'scenes': [s.name for s in bpy.data.scenes]}
(OUT / 'blend_validation.json').write_text(json.dumps(result, ensure_ascii=False, indent=2), encoding='utf-8')
print('BLEND_VERIFIED', json.dumps(result), flush=True)
