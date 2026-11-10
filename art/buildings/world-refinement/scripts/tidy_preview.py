"""Remove the redundant preview rig left by the initial two-view render pass."""
import bpy
from pathlib import Path

out = Path(__file__).resolve().parents[1]
bpy.ops.wm.open_mainfile(filepath=str(out / 'building_refined.blend'))
scene = bpy.data.scenes['01_Refined_LOD0']
bpy.context.window.scene = scene
rigs = [c for c in scene.collection.children if c.name.startswith('PREVIEW_ONLY_')]
preferred = next(c for c in rigs if 'preview.png' in c.name)
for collection in rigs:
    if collection == preferred:
        continue
    for obj in list(collection.objects):
        bpy.data.objects.remove(obj, do_unlink=True)
    bpy.data.collections.remove(collection)
scene.camera = next(o for o in preferred.objects if o.type == 'CAMERA')
for screen in bpy.data.screens:
    for area in screen.areas:
        if area.type == 'VIEW_3D':
            area.spaces.active.clip_end = 200
            area.spaces.active.region_3d.view_perspective = 'CAMERA'
bpy.context.preferences.filepaths.save_version = 0
if hasattr(bpy.context.preferences.filepaths, 'use_save_preview_images'):
    bpy.context.preferences.filepaths.use_save_preview_images = False
bpy.ops.wm.save_as_mainfile(filepath=str(out / 'building_refined.blend'))
print('PREVIEW_RIG_TIDIED')
