"""Build an editable, conservative architectural refinement from the audited GLB.

Blender --background --python-exit-code 1 --python scripts/refine_model.py
Only writes beneath this script's world-refinement directory.
"""
import bpy
import hashlib
import json
import math
import struct
import sys
from collections import Counter
from pathlib import Path

import numpy as np
from mathutils import Matrix, Vector
from mathutils.bvhtree import BVHTree

OUT = Path(__file__).resolve().parents[1]
ROOT = OUT.parents[2]
SOURCE = ROOT / 'world.glb'
sys.path.insert(0, str(Path(__file__).resolve().parent))
from analyze_model import bounds, mesh_signature

AUDIT = json.loads((OUT / 'model_analysis.json').read_text(encoding='utf-8'))
assert AUDIT['analysis_completed_before_refinement']
EXPECTED_HASH = AUDIT['source']['sha256_before']
SOURCES, GROUPS, MATS, MAT_CACHE, IMAGE_CACHE = {}, {}, {}, {}, {}
EXPORTED = []
CHANGE_LOG = []


def file_hash(path):
    return hashlib.file_digest(path.open('rb'), 'sha256').hexdigest()


def prop(obj, source=None, role=None):
    obj['asset_role'] = role or 'architectural_detail'
    if source:
        obj['source_objects'] = source if isinstance(source, str) else ', '.join(source)
    return obj


def group(name, parent=None):
    obj = bpy.data.objects.new(name, None)
    WORK.collection.objects.link(obj)
    if parent:
        obj.parent = parent
    obj.empty_display_size = 0.12
    return obj


def link(obj, parent, source=None, role=None):
    WORK.collection.objects.link(obj)
    if parent:
        world = obj.matrix_world.copy()
        obj.parent = parent
        obj.matrix_world = world
    return prop(obj, source, role)


def bevel(obj, width, segments=2):
    mod = obj.modifiers.new('Editable_Edge_Bevel', 'BEVEL')
    mod.width = width
    mod.segments = segments
    mod.limit_method = 'ANGLE'
    mod.angle_limit = math.radians(35)
    mod.harden_normals = True
    mod.use_clamp_overlap = True
    weighted = obj.modifiers.new('Weighted_Corner_Normals', 'WEIGHTED_NORMAL')
    weighted.keep_sharp = True
    weighted.weight = 40


def meter_uv(obj, period=1.0):
    mesh = obj.data
    uv = mesh.uv_layers.get('MetersUV') or mesh.uv_layers.new(name='MetersUV')
    mesh.uv_layers.active = uv
    uv.active_render = True
    matrix = obj.matrix_world
    normal_matrix = matrix.to_3x3().inverted().transposed()
    for poly in mesh.polygons:
        normal = normal_matrix @ poly.normal
        axis = max(range(3), key=lambda i: abs(normal[i]))
        axes = (1, 2) if axis == 0 else (0, 2) if axis == 1 else (0, 1)
        for loop_i in poly.loop_indices:
            p = matrix @ mesh.vertices[mesh.loops[loop_i].vertex_index].co
            uv.data[loop_i].uv = (p[axes[0]] / period, p[axes[1]] / period)


def clone_material(mat):
    nodes = list(mat.node_tree.nodes) if mat.use_nodes else []
    key_nodes = []
    for node in nodes:
        inputs = []
        for socket in node.inputs:
            if hasattr(socket, 'default_value'):
                value = socket.default_value
                if hasattr(value, '__len__'):
                    value = [round(float(x), 7) for x in value]
                elif isinstance(value, (int, float, bool, str)):
                    value = value
                else:
                    value = str(value)
                inputs.append((socket.identifier, value))
        key_nodes.append((node.bl_idname, inputs, node.image.name if node.type == 'TEX_IMAGE' and node.image else None))
    links = [(nodes.index(l.from_node), l.from_socket.identifier, nodes.index(l.to_node), l.to_socket.identifier)
             for l in mat.node_tree.links] if mat.use_nodes else []
    key = json.dumps([list(mat.diffuse_color), key_nodes, links], sort_keys=True)
    if key in MAT_CACHE:
        return MAT_CACHE[key]
    copy = mat.copy()
    copy.name = 'Preserved_' + mat.name
    MAT_CACHE[key] = copy
    for node in copy.node_tree.nodes if copy.use_nodes else []:
        if node.type != 'TEX_IMAGE' or not node.image:
            continue
        image = node.image
        if image.name not in IMAGE_CACHE:
            optimized = image.copy()
            optimized.name = 'Runtime_' + image.name + '_1024'
            if optimized.packed_file:
                # Image.copy also copies the old packed payload; remove that
                # payload so glTF cannot accidentally reuse the original 2K JPEG.
                optimized.unpack(method='REMOVE')
            largest = max(image.size)
            if largest > 1024:
                optimized.scale(round(image.size[0] * 1024 / largest), round(image.size[1] * 1024 / largest))
            # These three source atlases are opaque JPEG color textures. Keep the
            # same encoding family instead of bloating them into RGBA PNGs.
            texture_dir = OUT / 'textures'
            texture_dir.mkdir(exist_ok=True)
            optimized.filepath_raw = str(texture_dir / (optimized.name + '.jpg'))
            optimized.file_format = 'JPEG'
            optimized.save()
            optimized.pack()
            IMAGE_CACHE[image.name] = optimized
        node.image = IMAGE_CACHE[image.name]
    return copy


def copy_source(name, parent, material=None, edge=None):
    source = SOURCES[name]
    obj = source.copy()
    obj.data = source.data.copy()
    obj.name = 'Preserved_' + name
    obj.parent = None
    obj.matrix_world = source.matrix_world.copy()
    link(obj, parent, name, ROLES[name]['classification'])
    obj.data.materials.clear()
    for slot in source.material_slots:
        if slot.material:
            obj.data.materials.append(material or clone_material(slot.material))
    if ROLES[name]['requires_manual_review']:
        obj['requires_manual_review'] = True
        obj['review_reason'] = ROLES[name]['classification_evidence']
    if material and material.name.startswith('PBR_Plaster'):
        meter_uv(obj, 0.25)
    elif material and material.name.startswith('PBR_Tile'):
        meter_uv(obj, 1.2)
    if edge:
        bevel(obj, edge)
    return obj


def mesh_boxes(name, boxes, material, parent, edge=0, source=None):
    verts, faces = [], []
    # Correct outward-facing winding for a right-handed box.
    template = [(0, 3, 2, 1), (4, 5, 6, 7), (0, 1, 5, 4),
                (1, 2, 6, 5), (2, 3, 7, 6), (3, 0, 4, 7)]
    for center, size in boxes:
        x, y, z = center
        dx, dy, dz = [v / 2 for v in size]
        start = len(verts)
        verts += [(x-dx, y-dy, z-dz), (x+dx, y-dy, z-dz),
                  (x+dx, y+dy, z-dz), (x-dx, y+dy, z-dz),
                  (x-dx, y-dy, z+dz), (x+dx, y-dy, z+dz),
                  (x+dx, y+dy, z+dz), (x-dx, y+dy, z+dz)]
        faces += [tuple(start + i for i in f) for f in template]
    mesh = bpy.data.meshes.new(name + '_Mesh')
    mesh.from_pydata(verts, [], faces)
    mesh.update()
    obj = bpy.data.objects.new(name, mesh)
    link(obj, parent, source)
    mesh.materials.append(material)
    if material == MATS.get('plaster'):
        meter_uv(obj, 0.25)
    elif material == MATS.get('tile'):
        meter_uv(obj, 1.2)
    if edge:
        bevel(obj, edge)
    return obj


def cylinder(name, center, radius, depth, material, parent, axis='Y', segments=64, source=None):
    verts, faces = [], []
    for side in (-1, 1):
        for i in range(segments):
            angle = i * math.tau / segments
            a, b, c = radius * math.cos(angle), radius * math.sin(angle), side * depth / 2
            p = (a, -c, b) if axis == 'Y' else (c, a, b)
            verts.append(tuple(center[j] + p[j] for j in range(3)))
    faces += [tuple(reversed(range(segments))), tuple(range(segments, 2*segments))]
    faces += [(i, (i+1) % segments, (i+1) % segments + segments, i+segments) for i in range(segments)]
    mesh = bpy.data.meshes.new(name + '_Mesh')
    mesh.from_pydata(verts, [], faces)
    mesh.update()
    obj = bpy.data.objects.new(name, mesh)
    link(obj, parent, source)
    if material:
        mesh.materials.append(material)
    for p in mesh.polygons[2:]:
        p.use_smooth = True
    return obj


def cut_box(body, name, center, size):
    cutter = mesh_boxes('CUT_' + name, [(center, size)], MATS['recess'], None)
    for col in list(cutter.users_collection):
        col.objects.unlink(cutter)
    CUTTERS.objects.link(cutter)
    cutter.hide_render = True
    cutter.display_type = 'WIRE'
    cutter.hide_set(True)
    mod = body.modifiers.new('Editable_Recess_' + name, 'BOOLEAN')
    mod.operation = 'DIFFERENCE'
    mod.solver = 'EXACT'
    mod.object = cutter
    # Recesses precede edge bevels.
    bpy.context.view_layer.objects.active = body
    bpy.ops.object.modifier_move_to_index(modifier=mod.name, index=0)


def create_texture(name, rgba, colorspace='Non-Color'):
    h, w = rgba.shape[:2]
    image = bpy.data.images.new(name, width=w, height=h, alpha=True)
    image.colorspace_settings.name = colorspace
    image.pixels.foreach_set(np.asarray(rgba, dtype=np.float32).ravel())
    image.file_format = 'PNG'
    texture_dir = OUT / 'textures'
    texture_dir.mkdir(exist_ok=True)
    image.filepath_raw = str(texture_dir / (name + '.png'))
    image.save()
    image.pack()
    return image


def rgba(rgb):
    return np.concatenate((rgb, np.ones((*rgb.shape[:2], 1))), axis=2)


def normal_from_height(height, strength):
    gx = (np.roll(height, -1, 1) - np.roll(height, 1, 1)) * strength
    gy = (np.roll(height, -1, 0) - np.roll(height, 1, 0)) * strength
    n = np.stack((-gx, -gy, np.ones_like(gx)), axis=-1)
    n /= np.linalg.norm(n, axis=-1, keepdims=True)
    return rgba(n * 0.5 + 0.5)


def pbr_material(name, color, roughness, metallic=0, transmission=0):
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes.get('Principled BSDF')
    bsdf.inputs['Base Color'].default_value = (*color, 1)
    bsdf.inputs['Roughness'].default_value = roughness
    bsdf.inputs['Metallic'].default_value = metallic
    bsdf.inputs['Transmission Weight'].default_value = transmission
    bsdf.inputs['IOR'].default_value = 1.46 if transmission else 1.5
    mat.diffuse_color = (*color, 1)
    mat.use_backface_culling = False
    return mat


def texture_node(mat, image):
    node = mat.node_tree.nodes.new('ShaderNodeTexImage')
    node.image = image
    node.interpolation = 'Linear'
    node.extension = 'REPEAT'
    uv = mat.node_tree.nodes.get('RuntimeMetersUV')
    if not uv:
        uv = mat.node_tree.nodes.new('ShaderNodeUVMap')
        uv.name = 'RuntimeMetersUV'
        uv.uv_map = 'MetersUV'
    mat.node_tree.links.new(uv.outputs['UV'], node.inputs['Vector'])
    return node


def attach_maps(mat, normal_image, orm_image, color_image=None, strength=1):
    nodes, links = mat.node_tree.nodes, mat.node_tree.links
    bsdf = nodes.get('Principled BSDF')
    normal_tex = texture_node(mat, normal_image)
    normal = nodes.new('ShaderNodeNormalMap')
    normal.uv_map = 'MetersUV'
    normal.inputs['Strength'].default_value = strength
    links.new(normal_tex.outputs['Color'], normal.inputs['Color'])
    links.new(normal.outputs['Normal'], bsdf.inputs['Normal'])
    orm_tex = texture_node(mat, orm_image)
    separate = nodes.new('ShaderNodeSeparateColor')
    separate.mode = 'RGB'
    links.new(orm_tex.outputs['Color'], separate.inputs['Color'])
    links.new(separate.outputs['Green'], bsdf.inputs['Roughness'])
    links.new(separate.outputs['Blue'], bsdf.inputs['Metallic'])
    if color_image:
        tex = texture_node(mat, color_image)
        links.new(tex.outputs['Color'], bsdf.inputs['Base Color'])


def materials():
    # Periodic numerical textures export as actual glTF maps, not Blender-only Noise nodes.
    y, x = np.mgrid[0:256, 0:256] / 256
    height = sum(np.sin(math.tau * (a*x+b*y) + phase) / (i+2)
                 for i, (a, b, phase) in enumerate([(5, 7, .2), (17, -11, 1.3), (37, 29, 2.1), (73, -61, .7)]))
    normal = create_texture('plaster_normal_256', normal_from_height(height, .12))
    rough = np.clip(.84 + .035*height, .76, .92)
    orm = create_texture('plaster_orm_256', rgba(np.stack((np.ones_like(x), rough, np.zeros_like(x)), -1)))
    MATS['plaster'] = pbr_material('PBR_Plaster_White', (.82, .81, .775), .84)
    attach_maps(MATS['plaster'], normal, orm, strength=.35)
    MATS['metal'] = pbr_material('PBR_Metal_Black_Anodized', (.012, .017, .023), .29, .68)
    MATS['glass'] = pbr_material('PBR_Glass_Clear_Smoked', (.52, .66, .72), .12, 0, .88)
    MATS['trim'] = pbr_material('PBR_Mineral_Window_Trim', (.72, .69, .61), .74)
    MATS['recess'] = pbr_material('PBR_Recess_Dark', (.018, .026, .032), .88)
    y, x = np.mgrid[0:512, 0:512] / 512
    cell_x, cell_y = (x*2) % 1, (y*2) % 1
    edge = np.minimum.reduce([cell_x, 1-cell_x, cell_y, 1-cell_y])
    grout = np.clip(edge / .014, 0, 1)
    noise = (np.sin(x*math.tau*47)*np.cos(y*math.tau*53) + .45*np.sin((x*91+y*61)*math.tau))*.006
    checker = ((np.floor(x*2)+np.floor(y*2)) % 2)*.025
    stone = .64 + checker + noise
    rgb = np.stack((stone*.98, stone*.92, stone*.82), -1)
    rgb = rgb*grout[..., None] + np.array([.38, .36, .32])*(1-grout[..., None])
    color = create_texture('tile_basecolor_512', rgba(rgb), 'sRGB')
    normal = create_texture('tile_normal_512', normal_from_height(grout*.2 + noise, .65))
    orm = create_texture('tile_orm_512', rgba(np.stack((np.ones_like(x), .68+.17*(1-grout), np.zeros_like(x)), -1)))
    MATS['tile'] = pbr_material('PBR_Tile_Warm_Stone', (.63, .59, .51), .7)
    attach_maps(MATS['tile'], normal, orm, color)


def ring(name, center, outer, inner, front_y, back_y, parent, source):
    n, verts, faces = 64, [], []
    for y, radius in [(front_y, outer), (front_y, inner), (back_y, outer), (back_y, inner)]:
        for i in range(n):
            a = i * math.tau / n
            verts.append((center[0]+radius*math.cos(a), y, center[2]+radius*math.sin(a)))
    for i in range(n):
        j = (i+1) % n
        # Front/back annulus and outer/inner barrel. All surfaces face outward.
        faces += [(i, j, n+j, n+i), (2*n+j, 2*n+i, 3*n+i, 3*n+j),
                  (j, i, 2*n+i, 2*n+j), (n+i, n+j, 3*n+j, 3*n+i)]
    mesh = bpy.data.meshes.new(name + '_Mesh')
    mesh.from_pydata(verts, [], faces)
    mesh.update()
    obj = bpy.data.objects.new(name, mesh)
    link(obj, parent, source, 'round_window_frame')
    mesh.materials.append(MATS['metal'])
    for p in mesh.polygons:
        p.use_smooth = p.index % 4 in (2, 3)
    bevel(obj, .0012, 1)
    return obj


def round_window(name, source, body):
    record = ROLES[source]
    center = record['world_position']
    radius = record['dimensions_world'][0]/2
    inner = radius-.026
    parent = group(name, GROUPS['Windows'])
    prop(parent, source, 'round_window_assembly')
    ring(name + '_Aluminum_Frame', center, radius, inner, -1.21, -1.095, parent, source)
    glass_center = (center[0], -1.184, center[2])
    cylinder(name + '_Glass', glass_center, inner-.002, .008, MATS['glass'], parent, source=source)
    cylinder(name + '_Recess_Back', (center[0], -.94, center[2]), radius-.015, .008, MATS['recess'], parent, source=source)
    cutter = cylinder('CUT_' + name, (center[0], -1.09, center[2]), radius-.018, .31, None, None)
    WORK.collection.objects.unlink(cutter)
    CUTTERS.objects.link(cutter)
    cutter.hide_render = True
    cutter.hide_set(True)
    cutter.display_type = 'WIRE'
    mod = body.modifiers.new('Editable_Recess_' + name, 'BOOLEAN')
    mod.operation = 'DIFFERENCE'
    mod.solver = 'EXACT'
    mod.object = cutter
    bpy.context.view_layer.objects.active = body
    bpy.ops.object.modifier_move_to_index(modifier=mod.name, index=0)
    if source == 'Mesh_21':
        offset = .04
        width = 2*math.sqrt(inner**2-offset**2)
        mesh_boxes(name + '_Transom', [((center[0], -1.196, center[2]+offset), (width, .018, .018))], MATS['metal'], parent, .001, source)


def plane_box(center_h, depth_coord, z, width, depth, height, axis):
    return ((center_h, depth_coord, z), (width, depth, height)) if axis == 'Y' else ((depth_coord, center_h, z), (depth, width, height))


def frame_boxes(h, z, w, ht, depth_coord, depth, frame, axis):
    return [plane_box(h, depth_coord, z-ht/2+frame/2, w, depth, frame, axis),
            plane_box(h, depth_coord, z+ht/2-frame/2, w, depth, frame, axis),
            plane_box(h-w/2+frame/2, depth_coord, z, frame, depth, ht-2*frame, axis),
            plane_box(h+w/2-frame/2, depth_coord, z, frame, depth, ht-2*frame, axis)]


def rectangular_window(name, source, body, axis='Y', width=None, height=None, surround=False, panes=2, transom=False, door=False):
    r = ROLES[source]
    center, dims = r['world_position'], r['dimensions_world']
    h = center[0] if axis == 'Y' else center[1]
    z, w, ht = center[2], width or (dims[0] if axis == 'Y' else dims[1]), height or dims[2]
    front = r['world_bounds'][0][1] if axis == 'Y' else r['world_bounds'][1][0]
    body_face = -.75 if body == BODIES[0] else -1.1
    if axis == 'X':
        body_face = 4.3
    sign = -1 if axis == 'Y' else 1
    parent = group(name, GROUPS['Doors' if door else 'Windows'])
    prop(parent, source, 'entrance_door' if door else 'rectangular_window_assembly')
    if surround:
        # Preserve the outside cream trim envelope, expose the previously solid opening.
        trim_frame = .055 if ht > .6 else .06
        trim_boxes = frame_boxes(h, z, w, ht, (front+body_face)/2, abs(front-body_face), trim_frame, axis)
        mesh_boxes(name + '_Mineral_Surround', trim_boxes, MATS['trim'], parent, .003, source)
        w, ht = w-2*trim_frame, ht-2*trim_frame
        front += sign*.005
    frame = min(.032, w*.12, ht*.085)
    depth = max(abs(front-body_face)+.008, .055)
    frame_center = front-sign*depth/2
    boxes = frame_boxes(h, z, w, ht, frame_center, depth, frame, axis)
    for i in range(1, panes):
        boxes.append(plane_box(h-w/2+w*i/panes, frame_center, z, frame*.7, depth*.65, ht-2*frame, axis))
    if transom:
        boxes.append(plane_box(h, frame_center, z-ht*.18, w-2*frame, depth*.65, frame*.7, axis))
    mesh_boxes(name + '_Aluminum_Frame', boxes, MATS['metal'], parent, .0015, source)
    glass_depth = front-sign*.027
    mesh_boxes(name + '_Glass', [plane_box(h, glass_depth, z, w-2*frame+.003, .006, ht-2*frame+.003, axis)], MATS['glass'], parent, source=source)
    back = body_face-sign*.105
    mesh_boxes(name + '_Recess_Back', [plane_box(h, back, z, w-1.5*frame, .008, ht-1.5*frame, axis)], MATS['recess'], parent, source=source)
    cut_center = body_face-sign*.04
    cut_size = plane_box(h, cut_center, z, w-1.7*frame, .2, ht-1.7*frame, axis)
    cut_box(body, name, *cut_size)
    if not door:
        sill_front = front + sign*.003
        sill = plane_box(h, (sill_front+body_face)/2, z-ht/2-.009, w+.015, abs(sill_front-body_face), .018, axis)
        mesh_boxes(name + '_Sill', [sill], MATS['trim'], parent, .002, source)
    return parent


def guard_run(name, start, end, bottom, top, parent, source, spacing=.052):
    a, b = Vector(start), Vector(end)
    delta = b-a
    length = delta.length
    direction = delta.normalized()
    along_x = abs(direction.x) > .9
    rail_size = (length+.018, .027, .025) if along_x else (.027, length+.018, .025)
    middle = (a+b)/2
    rails = [((middle.x, middle.y, top-.0125), rail_size),
             ((middle.x, middle.y, bottom+.0125), rail_size)]
    mesh_boxes(name + '_Top_Bottom_Rails', rails, MATS['metal'], parent, .0015, source)
    count = max(2, math.ceil(length/spacing))
    bars = []
    for i in range(count+1):
        p = a+delta*(i/count)
        endpoint = i in (0, count)
        width = .022 if endpoint else .012
        bars.append(((p.x, p.y, (bottom+top)/2), (width, .018 if along_x else width, top-bottom-.025)))
    # Fine pickets are already small at native scene scale; bevel only the heavier rails.
    mesh_boxes(name + '_Vertical_Pickets', bars, MATS['metal'], parent, source=source)


def balconies():
    for level, source in [(2, 'primitive-base-mesh.030'), (3, 'primitive-base-mesh.031')]:
        r = ROLES[source]
        lo, hi = r['world_bounds']
        floor = lo[2]
        parent = group(f'Balcony_Right_L{level:02}', GROUPS['Balconies'])
        prop(parent, source, 'balcony_assembly')
        mesh_boxes(f'Balcony_Right_L{level:02}_Floor', [((3.1, -1.15, floor+.0375), (1.8, 1.1, .075))], MATS['plaster'], parent, .006, source)
        mesh_boxes(f'Balcony_Right_L{level:02}_Tile', [((3.1, -1.15, floor+.079), (1.76, 1.06, .008))], MATS['tile'], parent, .001, source)
        bottom, top = floor+.095, hi[2]-.015
        guard_run(f'Right_L{level:02}_Front', (2.22, -1.676, 0), (3.98, -1.676, 0), bottom, top, parent, source)
        # Only the exposed section of the return is modeled; the rest intersects the existing wall.
        guard_run(f'Right_L{level:02}_Return', (3.98, -1.676, 0), (3.98, -1.11, 0), bottom, top, parent, source)
    # The three source solid guard screens are confirmed as picket guards by the photograph.
    for source, label in [('primitive-base-mesh.012', 'Left_L02'), ('primitive-base-mesh.020', 'Center_L03'), ('primitive-base-mesh.021', 'Center_L02')]:
        r = ROLES[source]
        lo, hi = r['world_bounds']
        h, depth, z = r['world_position']
        w = r['dimensions_world'][0]
        parent = group('Balcony_' + label, GROUPS['Balconies'])
        prop(parent, source, 'balcony_assembly')
        guard_run(label, (lo[0]+.014, depth, 0), (hi[0]-.014, depth, 0), lo[2], hi[2], parent, source)
        back = -.755
        projection = back-depth
        slab_z = lo[2]-.035
        mesh_boxes(label+'_Floor', [((h, (back+depth)/2, slab_z), (w+.03, projection+.025, .07))], MATS['plaster'], parent, .005, source)
        mesh_boxes(label+'_Tile', [((h, (back+depth)/2, lo[2]+.004), (w, projection, .008))], MATS['tile'], parent, source=source)
    CHANGE_LOG.append('Replaced two opaque balcony blocks and three solid guard screens with editable slabs, tile surfaces and dense vertical metal guards. Balcony footprints and source guard heights retained.')


def evaluated_stats(scene):
    bpy.context.window.scene = scene
    depsgraph = bpy.context.evaluated_depsgraph_get()
    triangles = vertices = 0
    objects = [o for o in scene.objects if o.type == 'MESH' and not o.name.startswith('CUT_')]
    for obj in objects:
        mesh = obj.evaluated_get(depsgraph).to_mesh()
        mesh.calc_loop_triangles()
        vertices += len(mesh.vertices)
        triangles += len(mesh.loop_triangles)
        obj.evaluated_get(depsgraph).to_mesh_clear()
    return {'mesh_objects': len(objects), 'vertices_evaluated': vertices, 'triangles_evaluated': triangles,
            'materials': len({m for o in objects for m in o.data.materials if m}),
            'shared_mesh_datablocks': len({o.data for o in objects})}


def share_identical_meshes(scene):
    registry = {}
    shared = 0
    for obj in scene.objects:
        if obj.type != 'MESH' or obj.name.startswith('CUT_') or obj.modifiers:
            continue
        uv_hash = hashlib.sha256()
        for uv in obj.data.uv_layers:
            values = np.empty(len(obj.data.loops)*2, dtype=np.float32)
            uv.data.foreach_get('uv', values)
            uv_hash.update(values.tobytes())
        key = (mesh_signature(obj.data), tuple(m.name for m in obj.data.materials), uv_hash.hexdigest())
        if key in registry:
            obj.data = registry[key]
            shared += 1
        else:
            registry[key] = obj.data
    return shared


def surface_error(original, reduced):
    original.calc_loop_triangles()
    reduced.calc_loop_triangles()
    original_points = [v.co.copy() for v in original.vertices]
    reduced_points = [v.co.copy() for v in reduced.vertices]
    original_tree = BVHTree.FromPolygons(original_points, [list(t.vertices) for t in original.loop_triangles], all_triangles=True)
    reduced_tree = BVHTree.FromPolygons(reduced_points, [list(t.vertices) for t in reduced.loop_triangles], all_triangles=True)
    distances = []
    for points, tree in [(original_points, reduced_tree), (reduced_points, original_tree)]:
        step = max(1, len(points)//2048)
        for p in points[::step]:
            nearest = tree.find_nearest(p)
            if nearest:
                distances.append(nearest[3])
    return {'sample_count': len(distances), 'max_local_surface_distance': max(distances, default=0),
            'p95_local_surface_distance': float(np.percentile(distances, 95)) if distances else 0}


def make_lod(level):
    scene = bpy.data.scenes.new(f'0{level+1}_Refined_LOD{level}')
    scene.collection.children.link(CUTTERS)
    copies, reduced_cache, measurements = {}, {}, []
    for src in WORK.objects:
        if src.name.startswith('CUT_') or src.type in ('CAMERA', 'LIGHT'):
            continue
        obj = src.copy()
        obj.name = src.name + f'__LOD{level}'
        obj['canonical_name'] = src.name
        scene.collection.objects.link(obj)
        copies[src] = obj
    for src, obj in copies.items():
        obj.parent = copies.get(src.parent)
        obj.matrix_world = src.matrix_world.copy()
    bpy.context.window.scene = scene
    for src, obj in copies.items():
        if obj.type != 'MESH' or obj.get('asset_role') != 'vegetation':
            continue
        key = obj.data.as_pointer()
        if key in reduced_cache:
            obj.data = reduced_cache[key]
            continue
        original = obj.data
        is_tree = 'tripo_node_40' in obj.get('source_objects', '')
        ratio = (.72 if level == 1 else .5) if is_tree else (.55 if level == 1 else .3)
        modifier = obj.modifiers.new('Environment_Only_LOD_Decimate', 'DECIMATE')
        modifier.ratio = ratio
        modifier.use_collapse_triangulate = True
        bpy.context.view_layer.update()
        dg = bpy.context.evaluated_depsgraph_get()
        reduced = bpy.data.meshes.new_from_object(obj.evaluated_get(dg), depsgraph=dg)
        reduced.name = original.name + f'_LOD{level}'
        obj.modifiers.remove(modifier)
        error = surface_error(original, reduced)
        span = max(max(v.co[i] for v in original.vertices)-min(v.co[i] for v in original.vertices) for i in range(3))
        error['max_distance_fraction_of_span'] = error['max_local_surface_distance']/span
        # A conservative geometry error gate on environment-only LODs.
        if error['max_distance_fraction_of_span'] > (.035 if level == 1 else .06):
            bpy.data.meshes.remove(reduced)
            reduced = original
            error['accepted'] = False
            error['fallback'] = 'Retained source geometry because sampled surface error exceeded limit.'
        else:
            error['accepted'] = True
        obj.data = reduced
        reduced_cache[key] = reduced
        measurements.append({'source': src.get('source_objects'), 'requested_ratio': ratio, **error})
    return scene, measurements


def export_scene(scene, filename):
    bpy.context.window.scene = scene
    bpy.ops.object.select_all(action='DESELECT')
    for obj in scene.objects:
        if obj.type not in ('LIGHT', 'CAMERA') and not obj.name.startswith('CUT_'):
            obj.hide_set(False)
            obj.select_set(True)
    filepath = OUT / filename
    bpy.ops.export_scene.gltf(filepath=str(filepath), export_format='GLB', use_selection=True, use_active_scene=True,
                              export_apply=True, export_extras=True, export_yup=True,
                              export_cameras=False, export_lights=False, export_animations=False,
                              export_tangents=True, export_materials='EXPORT', export_image_format='AUTO',
                              export_shared_accessors=True, export_unused_images=False,
                              export_draco_mesh_compression_enable=False, export_meshopt_compression_enable=False,
                              export_keep_originals=False, will_save_settings=False)
    binary = filepath.read_bytes()
    json_length = struct.unpack_from('<I', binary, 12)[0]
    document = json.loads(binary[20:20+json_length])
    assert len(document['scenes']) == 1, 'Only the current refined scene may enter a runtime GLB.'
    assert not any(n.get('name', '').startswith('CUT_') for n in document['nodes'])
    EXPORTED.append({'file': filename, 'bytes': filepath.stat().st_size, 'sha256': file_hash(filepath),
                     'exported_materials': len(document.get('materials', [])),
                     'exported_images': len(document.get('images', [])),
                     'exported_meshes': len(document.get('meshes', [])), **evaluated_stats(scene)})


def render(scene, filename, azimuth=-58, front=False, context=False):
    bpy.context.window.scene = scene
    for previous in list(scene.collection.children):
        if previous.name.startswith('PREVIEW_ONLY_'):
            for obj in list(previous.objects):
                bpy.data.objects.remove(obj, do_unlink=True)
            bpy.data.collections.remove(previous)
    if not scene.world:
        world = bpy.data.worlds.new('Preview_Studio_World')
        world.use_nodes = True
        world.node_tree.nodes['Background'].inputs['Color'].default_value = (.6, .7, .85, 1)
        world.node_tree.nodes['Background'].inputs['Strength'].default_value = .6
        scene.world = world
    rig = bpy.data.collections.new('PREVIEW_ONLY_' + filename)
    scene.collection.children.link(rig)
    for i, (loc, energy, size) in enumerate([((0, -9, 12), 1800, 8), ((9, -2, 8), 1100, 7), ((-5, 6, 10), 1400, 6)]):
        data = bpy.data.lights.new('Studio_Area_' + str(i), 'AREA')
        data.energy, data.shape, data.size = energy, 'DISK', size
        obj = bpy.data.objects.new(data.name, data)
        rig.objects.link(obj)
        obj.location = loc
        obj.rotation_euler = (Vector((.8, .8, 2.2))-obj.location).to_track_quat('-Z', 'Y').to_euler()
    camera_data = bpy.data.cameras.new('Preview_Camera')
    camera = bpy.data.objects.new('Preview_Camera', camera_data)
    rig.objects.link(camera)
    target = Vector((.8, .65, 2.3))
    direction = Vector((math.cos(math.radians(azimuth)), math.sin(math.radians(azimuth)), .36))
    camera.location = target + direction*17
    camera.rotation_euler = (target-camera.location).to_track_quat('-Z', 'Y').to_euler()
    camera_data.type = 'ORTHO'
    camera_data.ortho_scale = 9.1 if not context else 17
    if front:
        camera.location = (.8, -18, 2.45)
        camera.rotation_euler = (Vector((.8, 0, 2.45))-camera.location).to_track_quat('-Z', 'Y').to_euler()
        camera_data.ortho_scale = 8
    scene.camera = camera
    # Isolated architectural preview: environment remains present in the saved scenes/GLB.
    hidden = []
    if not context:
        for obj in scene.objects:
            if obj.type == 'MESH' and obj.get('asset_role') in ('vegetation', 'vehicle', 'context_mass_unconfirmed', 'street_light', 'traffic_cone'):
                hidden.append((obj, obj.hide_render))
                obj.hide_render = True
    scene.render.engine = 'CYCLES'
    scene.cycles.samples = 32
    scene.cycles.use_denoising = True
    scene.render.resolution_x = 1500
    scene.render.resolution_y = 1200
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = 'PNG'
    scene.render.film_transparent = False
    scene.view_settings.view_transform = 'AgX'
    scene.render.filepath = str(OUT / filename)
    bpy.ops.render.render(write_still=True)
    for obj, previous in hidden:
        obj.hide_render = previous
    return rig


def main():
    global WORK, CUTTERS, BODIES, ROLES
    assert file_hash(SOURCE) == EXPECTED_HASH, 'Source differs from completed audit; analyze again.'
    ROLES = {o['name']: o for o in AUDIT['objects']}
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=str(SOURCE))
    original = bpy.context.scene
    original.name = '00_Original_Reference'
    original['purpose'] = 'Unmodified imported world.glb comparison. Never export this scene as the refined asset.'
    SOURCES.update({o.name: o for o in original.objects if o.type == 'MESH'})
    WORK = bpy.data.scenes.new('01_Refined_LOD0')
    WORK['source_sha256'] = EXPECTED_HASH
    WORK['physical_scale_verified'] = False
    WORK['reference_photo'] = AUDIT['references'][0]['path']
    bpy.context.window.scene = WORK
    architecture = group('Building')
    environment = group('Environment')
    for label in ['Structure', 'Windows', 'Doors', 'Balconies', 'Facade_Details', 'Roof']:
        GROUPS[label] = group(label, architecture)
    for label in ['Vegetation', 'Context', 'Ground', 'Props', 'Review_Required']:
        GROUPS[label] = group(label, environment if label != 'Review_Required' else architecture)
    CUTTERS = bpy.data.collections.new('EDITABLE_RECESS_CUTTERS_NOT_EXPORTED')
    WORK.collection.children.link(CUTTERS)
    materials()
    BODIES = []
    replaced = set()
    for name, label in [('primitive-base-mesh', 'Main_Building_Mass'), ('primitive-base-mesh.001', 'Right_Wing_Mass')]:
        obj = copy_source(name, GROUPS['Structure'], MATS['plaster'])
        obj.name = label
        BODIES.append(obj)
        replaced.add(name)
    for src, name in [('primitive-base-mesh.003', 'Front_Main_L02'), ('primitive-base-mesh.004', 'Front_Main_L03')]:
        rectangular_window(name, src, BODIES[0], panes=3, transom=True)
        replaced.add(src)
    for i, src in enumerate(['primitive-base-mesh.017', 'primitive-base-mesh.018', 'primitive-base-mesh.019'], 1):
        rectangular_window(f'Front_Slit_L{i:02}', src, BODIES[0], panes=1)
        replaced.add(src)
    rectangular_window('Front_Right_L02', 'primitive-base-mesh.022', BODIES[1], panes=2)
    replaced.add('primitive-base-mesh.022')
    rectangular_window('Side_Horizontal_L03', 'primitive-base-mesh.005', BODIES[1], axis='X', panes=2)
    replaced.add('primitive-base-mesh.005')
    for i, src in enumerate(['Mesh_74', 'Mesh_76', 'Mesh_78']):
        rectangular_window(f'Side_Trim_L{3-i:02}', src, BODIES[1], axis='X', surround=True, panes=1 if i < 2 else 2)
    replaced.update(['Mesh_74', 'Mesh_75', 'Mesh_76', 'Mesh_77', 'Mesh_78', 'Mesh_79',
                     'primitive-base-mesh.014', 'primitive-base-mesh.015', 'primitive-base-mesh.016'])
    rectangular_window('Ground_Front_Glazing', 'Mesh_49', BODIES[1], panes=3, transom=True)
    replaced.update(['Mesh_49', 'Mesh_50', 'Mesh_51', 'Mesh_52', 'primitive-base-mesh.032'])
    rectangular_window('Entrance_Door', 'Mesh_46', BODIES[0], panes=1, door=True)
    copy_source('Mesh_48', GROUPS['Doors'], MATS['metal'], .002)
    replaced.update(['Mesh_46', 'Mesh_47', 'Mesh_48', 'primitive-base-mesh.033'])
    for i, src in enumerate(['Mesh_20', 'Mesh_21', 'Mesh_22'], 1):
        round_window(f'Round_Window_L{i:02}', src, BODIES[1])
        replaced.add(src)
    balconies()
    replaced.update(['primitive-base-mesh.012', 'primitive-base-mesh.020', 'primitive-base-mesh.021',
                     'primitive-base-mesh.030', 'primitive-base-mesh.031'])
    replaced.update(f'Mesh_{i}' for i in range(53, 71))
    # Do not substitute the photograph plane for architectural geometry.
    replaced.add('primitive-base-mesh.011')
    for name, r in ROLES.items():
        if name in replaced:
            continue
        role = r['classification']
        if r['requires_manual_review']:
            parent = GROUPS['Context'] if role == 'context_mass_unconfirmed' else GROUPS['Review_Required']
            # Uncertain objects are copied exactly, including their original materials.
            obj = copy_source(name, parent)
            for i, slot in enumerate(SOURCES[name].material_slots):
                obj.data.materials[i] = slot.material
        elif role == 'vegetation':
            obj = copy_source(name, GROUPS['Vegetation'])
        elif role == 'ground_paving':
            obj = copy_source(name, GROUPS['Ground'], MATS['tile'], .003)
        elif role in ('structural_column', 'roof_slab', 'facade_band'):
            obj = copy_source(name, GROUPS['Roof' if role == 'roof_slab' else 'Facade_Details'], MATS['plaster'], .004)
        else:
            obj = copy_source(name, GROUPS['Props'])
    # Booleans first; finish the existing mass envelopes with small live edge bevels.
    for body in BODIES:
        bevel(body, .008, 3)
        meter_uv(body, .25)
    for obj in WORK.objects:
        if obj.type == 'MESH' and obj.data.uv_layers and obj.modifiers and not obj.name.startswith('CUT_'):
            obj.modifiers.new('Export_Stable_Triangulation', 'TRIANGULATE')
        if not obj.name.startswith('CUT_'):
            obj['canonical_name'] = obj.name
    shared = share_identical_meshes(WORK)
    print('REFINEMENT_GEOMETRY_COMPLETE', evaluated_stats(WORK), flush=True)
    lod_scenes, lod_errors = [], {}
    for level in (1, 2):
        scene, errors = make_lod(level)
        lod_scenes.append(scene)
        lod_errors[f'LOD{level}'] = errors
    export_scene(WORK, 'building_refined.glb')
    for i, scene in enumerate(lod_scenes, 1):
        export_scene(scene, f'building_refined_lod{i}.glb')
    # Explicitly verify preserved meshes and transforms in the comparison scene.
    reference_checks = []
    for name, obj in SOURCES.items():
        r = ROLES[name]
        assert mesh_signature(obj.data) == r['geometry_sha256'], name
        assert max(abs(obj.matrix_world[i][j]-r['world_matrix'][i][j]) for i in range(4) for j in range(4)) < 1e-6, name
        reference_checks.append(name)
    assert file_hash(SOURCE) == EXPECTED_HASH
    runtime = {'source_sha256': EXPECTED_HASH, 'source_unchanged': True,
               'original_scene_verified_meshes': len(reference_checks),
               'deduplicated_object_mesh_links': shared, 'exports': EXPORTED,
               'lod_surface_measurements': lod_errors, 'changes': CHANGE_LOG,
               'manual_review_objects': AUDIT['manual_review_objects'],
               'reference_photo': AUDIT['references'][0],
               'architectural_lod_policy': 'No architectural decimation at any LOD; only tree and repeated small plants are simplified.'}
    (OUT / 'refinement_metrics.json').write_text(json.dumps(runtime, ensure_ascii=False, indent=2), encoding='utf-8')
    bpy.context.window.scene = WORK
    bpy.ops.file.pack_all()
    bpy.context.preferences.filepaths.save_version = 0
    if hasattr(bpy.context.preferences.filepaths, 'use_save_preview_images'):
        bpy.context.preferences.filepaths.use_save_preview_images = False
    # Save before previews so a renderer failure cannot lose the deliverable.
    bpy.ops.wm.save_as_mainfile(filepath=str(OUT / 'building_refined.blend'))
    render(WORK, 'building_refined_preview.png')
    render(WORK, 'building_refined_front.png', front=True)
    # Preview lights/cameras are intentionally saved only in the LOD0 scene and never exported.
    bpy.context.window.scene = WORK
    bpy.ops.wm.save_as_mainfile(filepath=str(OUT / 'building_refined.blend'))
    assert file_hash(SOURCE) == EXPECTED_HASH
    print('REFINEMENT_FINISHED', json.dumps(EXPORTED), flush=True)


if __name__ == '__main__':
    main()
