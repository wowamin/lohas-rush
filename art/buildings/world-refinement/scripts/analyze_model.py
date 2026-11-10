"""Read-only world.glb audit. Run with Blender --background --python this_file."""
import bpy
import hashlib
import json
from collections import Counter, defaultdict
from pathlib import Path
from mathutils import Vector

OUT = Path(__file__).resolve().parents[1]
ROOT = OUT.parents[2]
SOURCE = ROOT / 'world.glb'
OUT.mkdir(parents=True, exist_ok=True)


def sha256(path):
    return hashlib.file_digest(path.open('rb'), 'sha256').hexdigest()


def rounded(values):
    return [round(float(v), 6) for v in values]


def bounds(obj):
    points = [obj.matrix_world @ Vector(p) for p in obj.bound_box]
    return [[min(p[i] for p in points) for i in range(3)],
            [max(p[i] for p in points) for i in range(3)]]


def mesh_signature(mesh):
    h = hashlib.sha256()
    for v in mesh.vertices:
        h.update((','.join(f'{x:.7g}' for x in v.co) + ';').encode())
    for p in mesh.polygons:
        h.update((','.join(str(x) for x in p.vertices) + ';').encode())
    return h.hexdigest()


def material_info(mat):
    info = {'name': mat.name, 'users': mat.users, 'uses_nodes': mat.use_nodes,
            'diffuse_rgba': rounded(mat.diffuse_color)}
    if mat.use_nodes:
        nodes = list(mat.node_tree.nodes)
        info['node_types'] = [n.bl_idname for n in nodes]
        principled = next((n for n in nodes if n.type == 'BSDF_PRINCIPLED'), None)
        if principled:
            info['principled'] = {}
            for key in ['Base Color', 'Metallic', 'Roughness', 'IOR', 'Alpha', 'Transmission Weight']:
                socket = principled.inputs.get(key)
                if socket:
                    val = socket.default_value
                    info['principled'][key] = rounded(val) if hasattr(val, '__len__') else float(val)
        info['images'] = [n.image.name for n in nodes if n.type == 'TEX_IMAGE' and n.image]
    return info


def render_preview(objects, output, azimuth, label):
    import math
    scene = bpy.context.scene
    boxes = [bounds(o) for o in objects]
    lo = Vector([min(b[0][i] for b in boxes) for i in range(3)])
    hi = Vector([max(b[1][i] for b in boxes) for i in range(3)])
    center = (lo + hi) * 0.5
    span = max(hi - lo)
    cam_data = bpy.data.cameras.new('AUDIT_CAMERA_' + label)
    cam = bpy.data.objects.new(cam_data.name, cam_data)
    scene.collection.objects.link(cam)
    direction = Vector((math.cos(azimuth), math.sin(azimuth), 0.55)).normalized()
    cam.location = center + direction * span * 2
    cam.rotation_euler = (center - cam.location).to_track_quat('-Z', 'Y').to_euler()
    cam_data.type = 'ORTHO'
    cam_data.ortho_scale = span * 1.5
    scene.camera = cam
    scene.render.engine = 'BLENDER_WORKBENCH'
    scene.render.resolution_x = 1400
    scene.render.resolution_y = 1100
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = 'PNG'
    scene.render.film_transparent = False
    scene.display.shading.light = 'STUDIO'
    scene.display.shading.color_type = 'MATERIAL'
    scene.display.shading.show_shadows = True
    scene.display.shading.show_cavity = True
    scene.display.shading.cavity_type = 'BOTH'
    scene.display.shading.show_specular_highlight = True
    scene.display.shading.background_type = 'WORLD'
    scene.world.color = (0.12, 0.14, 0.17)
    scene.render.filepath = str(output)
    bpy.ops.render.render(write_still=True)
    bpy.data.objects.remove(cam, do_unlink=True)


def main():
    before_hash = sha256(SOURCE)
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.context.scene.world = bpy.data.worlds.new('AuditWorld')
    bpy.ops.import_scene.gltf(filepath=str(SOURCE))
    meshes = sorted([o for o in bpy.context.scene.objects if o.type == 'MESH'], key=lambda o: o.name)
    records, same_geometry, same_world = [], defaultdict(list), defaultdict(list)
    for obj in meshes:
        mesh = obj.data
        mesh.calc_loop_triangles()
        signature = mesh_signature(mesh)
        same_geometry[signature].append(obj.name)
        matrix = [[round(float(x), 8) for x in row] for row in obj.matrix_world]
        same_world[(signature, json.dumps(matrix))].append(obj.name)
        record = {
            'name': obj.name, 'mesh_data': mesh.name, 'parent': obj.parent.name if obj.parent else None,
            'vertices': len(mesh.vertices), 'polygons': len(mesh.polygons),
            'triangles': len(mesh.loop_triangles),
            'materials': [s.material.name if s.material else None for s in obj.material_slots],
            'dimensions_world': rounded(obj.dimensions),
            'world_position': rounded(obj.matrix_world.translation),
            'local_position': rounded(obj.location),
            'world_matrix': matrix, 'world_bounds': [rounded(v) for v in bounds(obj)],
            'scale': rounded(obj.scale), 'uv_layers': [v.name for v in mesh.uv_layers],
            'attributes': [a.name for a in mesh.attributes],
            'geometry_sha256': signature,
            'classification': 'unconfirmed', 'confidence': 'low',
            'requires_manual_review': True,
            'classification_evidence': 'Awaiting source views and architectural photographs; names alone are insufficient.',
        }
        records.append(record)
    boxes = [r['world_bounds'] for r in records]
    report = {
        'schema_version': 1, 'stage': 'analysis_before_refinement',
        'source': {'path': 'world.glb', 'bytes': SOURCE.stat().st_size,
                   'sha256_before': before_hash, 'sha256_after': sha256(SOURCE)},
        'blender_version': bpy.app.version_string,
        'coordinate_system': {'blender': 'Z up; meters assumed from glTF unit convention, physical scale unverified',
                              'gltf': 'Y up; Blender exporter converts axes'},
        'summary': {'meshes': len(meshes), 'vertices': sum(r['vertices'] for r in records),
                    'triangles': sum(r['triangles'] for r in records),
                    'materials': len(bpy.data.materials), 'images': len(bpy.data.images),
                    'bounds': [[min(b[0][i] for b in boxes) for i in range(3)],
                               [max(b[1][i] for b in boxes) for i in range(3)]]},
        'objects': records,
        'non_mesh_objects': [{'name': o.name, 'type': o.type, 'parent': o.parent.name if o.parent else None}
                             for o in bpy.context.scene.objects if o.type != 'MESH'],
        'materials': [material_info(m) for m in bpy.data.materials],
        'images': [{'name': i.name, 'size': list(i.size), 'channels': i.channels,
                    'filepath': i.filepath, 'packed': bool(i.packed_file)} for i in bpy.data.images],
        'duplicate_geometry_groups': [v for v in same_geometry.values() if len(v) > 1],
        'coincident_duplicate_candidates': [v for v in same_world.values() if len(v) > 1],
        'reference_status': 'Pending discovery and inspection',
        'safety': {'original_unchanged': before_hash == sha256(SOURCE), 'source_overwrite': False},
    }
    (OUT / 'model_analysis.json').write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding='utf-8')
    print('AUDIT_SUMMARY ' + json.dumps(report['summary']))
    print('AUDIT_MATERIALS ' + json.dumps(report['materials']))
    for r in sorted(records, key=lambda r: r['triangles'], reverse=True):
        print('AUDIT_OBJECT ' + json.dumps({k: r[k] for k in ['name', 'vertices', 'triangles', 'dimensions_world', 'world_position', 'world_bounds', 'materials']}))
    import math
    for angle, label in [(-60, '01'), (30, '02'), (120, '03'), (210, '04')]:
        render_preview(meshes, OUT / f'source_view_{label}.png', math.radians(angle), label)
    assert sha256(SOURCE) == before_hash, 'SOURCE FILE CHANGED'


if __name__ == '__main__':
    main()
