"""Refresh export metadata/atlas payloads in an already built blend, without rerendering."""
import bpy
import json
import sys
from pathlib import Path

OUT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(Path(__file__).resolve().parent))
import refine_model as pipeline

bpy.ops.wm.open_mainfile(filepath=str(OUT / 'building_refined.blend'))
metrics_path = OUT / 'refinement_metrics.json'
metrics = json.loads(metrics_path.read_text(encoding='utf-8'))
assert pipeline.file_hash(pipeline.SOURCE) == metrics['source_sha256']
replacements = {}
for image in list(bpy.data.images):
    if not image.name.startswith('Runtime_Image_'):
        continue
    expected_path = OUT / 'textures' / (image.name + '.jpg')
    if not expected_path.is_file():
        continue
    replacement = bpy.data.images.load(str(expected_path), check_existing=False)
    assert max(replacement.size) <= 1024
    replacement.pack()
    replacements[image] = replacement
for material in bpy.data.materials:
    if material.use_nodes:
        for node in material.node_tree.nodes:
            if node.type == 'TEX_IMAGE' and node.image in replacements:
                node.image = replacements[node.image]
for previous, replacement in replacements.items():
    name = previous.name
    assert previous.users == 0
    bpy.data.images.remove(previous)
    replacement.name = name
work = bpy.data.scenes['01_Refined_LOD0']
pipeline.WORK = work
for obj in work.objects:
    if not obj.name.startswith('CUT_') and obj.type not in ('CAMERA', 'LIGHT'):
        obj['canonical_name'] = obj.name
for i, name in enumerate(['01_Refined_LOD0', '02_Refined_LOD1', '03_Refined_LOD2']):
    pipeline.export_scene(bpy.data.scenes[name], 'building_refined.glb' if i == 0 else f'building_refined_lod{i}.glb')
metrics['exports'] = pipeline.EXPORTED
metrics['runtime_atlases'] = [{'name': image.name, 'size': list(image.size), 'encoding': 'JPEG'} for image in replacements.values()]
metrics_path.write_text(json.dumps(metrics, ensure_ascii=False, indent=2), encoding='utf-8')
for image in bpy.data.images:
    if image.name in ('Image_0', 'Image_1', 'Image_3'):
        assert list(image.size) == [2048, 2048], 'Original reference texture was modified'
bpy.context.window.scene = work
bpy.context.preferences.filepaths.save_version = 0
if hasattr(bpy.context.preferences.filepaths, 'use_save_preview_images'):
    bpy.context.preferences.filepaths.use_save_preview_images = False
bpy.ops.file.pack_all()
bpy.ops.wm.save_as_mainfile(filepath=str(OUT / 'building_refined.blend'))
assert pipeline.file_hash(pipeline.SOURCE) == metrics['source_sha256']
print('FINALIZED', json.dumps(pipeline.EXPORTED), flush=True)
