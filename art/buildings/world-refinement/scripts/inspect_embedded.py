import bpy
from pathlib import Path

out = Path(__file__).resolve().parents[1]
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=str(out.parents[2] / 'world.glb'))
refs = out / 'embedded_source_images'
refs.mkdir(exist_ok=True)
for image in bpy.data.images:
    image.filepath_raw = str(refs / (image.name + '.png'))
    image.file_format = 'PNG'
    image.save()
    print('EXTRACTED', image.name, list(image.size))
for name in ['Mesh_20', 'Mesh_21', 'Mesh_32', 'primitive-base-mesh.011']:
    obj = bpy.data.objects[name]
    print('INSPECT', name, 'parent', obj.parent, 'rotation', list(obj.rotation_euler), 'scale', list(obj.scale))
    print('VERTICES', [list(v.co) for v in obj.data.vertices][:12])
print('EXPORT_OPTIONS', list(bpy.ops.export_scene.gltf.get_rna_type().properties.keys()))
