"""Blender-authored low-poly van; wrap reference: public/lohas_car2.jpg (side only).
Rear hatch reference: user-supplied KOMBI/STARIA images in art/references/accessibility.
Run: blender --background --python tools/create_service_van.py
Game coordinates: +Y up, -Z forward, metres, origin at ground under vehicle centre.
No photo textures, manufacturer badges, phone numbers or recreated logos.
"""
import bpy
import json
import math
from pathlib import Path
from mathutils import Vector, Matrix
from mathutils.geometry import tessellate_polygon

ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / 'public/assets/models'
SOURCE = ROOT / 'art/vehicles'
OUTPUT.mkdir(parents=True, exist_ok=True)
SOURCE.mkdir(parents=True, exist_ok=True)
bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)
bpy.context.preferences.filepaths.save_version = 0

palette = {
    'white': '#f8f9f4', 'trim': '#58666b', 'tire': '#283237',
    'glass': '#354f5a', 'windshield': '#718e99', 'glassHighlight': '#718e99', 'hub': '#b9c5c8', 'mirror': '#b4ced8',
    'blue': '#b9dfe9', 'pink': '#e8a9c2', 'yellow': '#f3e34d',
    'green': '#deebc9', 'teal': '#168d88', 'lamp': '#fff1c8', 'tail': '#bc6262',
}
materials = {}
batches = {key: {'color': color, 'positions': []} for key, color in palette.items()}
def linear(c):
    return c / 12.92 if c <= .04045 else ((c + .055) / 1.055) ** 2.4
for name, color in palette.items():
    rgb = [linear(int(color[i:i+2], 16) / 255) for i in (1, 3, 5)]
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    bsdf = next((node for node in mat.node_tree.nodes if node.type == 'BSDF_PRINCIPLED'), None)
    if bsdf is None:
        bsdf = mat.node_tree.nodes.new('ShaderNodeBsdfPrincipled')
    output = next((node for node in mat.node_tree.nodes if node.type == 'OUTPUT_MATERIAL'), None)
    if output is None:
        output = mat.node_tree.nodes.new('ShaderNodeOutputMaterial')
    mat.node_tree.links.new(bsdf.outputs['BSDF'], output.inputs['Surface'])
    alpha = .45 if name == 'windshield' else 1
    bsdf.inputs['Base Color'].default_value = (*rgb, alpha)
    bsdf.inputs['Alpha'].default_value = alpha
    bsdf.inputs['Roughness'].default_value = .12 if name == 'mirror' else .38 if name in ('glass', 'windshield', 'hub') else .76
    if name == 'mirror':
        bsdf.inputs['Metallic'].default_value = .75
    mat.diffuse_color = (*rgb, alpha)
    materials[name] = mat

def face(points, material):
    # Triangulate in game space; export and fallback share the same mesh source.
    vectors = [Vector(p) for p in points]
    for triangle in tessellate_polygon([vectors]):
        for vertex in triangle:
            if isinstance(vertex, int):
                vertex = vectors[vertex]
            batches[material]['positions'].extend(round(c, 6) for c in vertex)

def box(center, size, material):
    x, y, z = center
    a, b, c = [d / 2 for d in size]
    p = [(x + dx*a, y + dy*b, z + dz*c) for dx,dy,dz in
         [(-1,-1,-1),(1,-1,-1),(1,1,-1),(-1,1,-1),(-1,-1,1),(1,-1,1),(1,1,1),(-1,1,1)]]
    for indices in [(0,3,2,1),(4,5,6,7),(0,1,5,4),(3,7,6,2),(0,4,7,3),(1,2,6,5)]:
        face([p[i] for i in indices], material)

def cylinder_x(x, y, z, radius, depth, material, segments=12):
    rings = [[(x + side*depth/2, y + radius*math.sin(i*2*math.pi/segments), z + radius*math.cos(i*2*math.pi/segments)) for i in range(segments)] for side in (-1, 1)]
    face(rings[0], material)
    face(rings[1][::-1], material)
    for i in range(segments):
        j = (i + 1) % segments
        face([rings[0][i], rings[1][i], rings[1][j], rings[0][j]], material)

driver_pivot = [-1.08,.75,-1.62]
passenger_pivot = [1.08,.75,-1.62]
driver_batches = {key: {'color':color,'positions':[]} for key,color in palette.items()}
passenger_batches = {key: {'color':color,'positions':[]} for key,color in palette.items()}
def clip_z(points, boundary, greater):
    result=[]
    for i,point in enumerate(points):
        previous=points[i-1]
        inside=point[2]>=boundary if greater else point[2]<=boundary
        old_inside=previous[2]>=boundary if greater else previous[2]<=boundary
        if inside != old_inside:
            t=(boundary-previous[2])/(point[2]-previous[2])
            result.append(tuple(previous[j]+(point[j]-previous[j])*t for j in range(3)))
        if inside:
            result.append(point)
    return result
def driver_face(points, material,side):
    global batches
    original=batches
    batches=driver_batches if side==-1 else passenger_batches
    pivot=driver_pivot if side==-1 else passenger_pivot
    face([tuple(p[j]-pivot[j] for j in range(3)) for p in points],material)
    batches=original
def side_face(points, material, side):
    for clipped in [clip_z(points,-1.62,False),clip_z(points,-.43,True)]:
        if len(clipped)>=3:
            face(clipped,material)
    clipped=clip_z(clip_z(points,-1.62,True),-.43,False)
    if len(clipped)>=3:
        driver_face(clipped,material,side)
def driver_box(center,size,material):
    global batches
    original=batches
    batches=driver_batches if center[0]<0 else passenger_batches
    pivot=driver_pivot if center[0]<0 else passenger_pivot
    box(tuple(center[j]-pivot[j] for j in range(3)),size,material)
    batches=original

# Side silhouette with real wheel openings and a sloped, neutral cab.
profile = [(-2.1,.65),(-2.1,1.23),(-2.05,1.5),(-1.65,2.35),
           (1.85,2.35),(2.1,2.15),(2.1,.65),(1.81,.65),(1.74,.88),
           (1.57,1.02),(1.3,1.08),(1.03,1.02),(.86,.88),(.79,.65),
           (-.79,.65),(-.86,.88),(-1.03,1.02),(-1.3,1.08),(-1.57,1.02),(-1.74,.88),(-1.81,.65)]
def windshield_z(y):
    return -2.05 + (y-1.5)*.4/.85

lower_profile = profile[:3] + [(windshield_z(1.55),1.55),(2.1,1.55)] + profile[6:]
for side in (-1, 1):
    side_face([(side*1.08,y,z) for z,y in lower_profile][::side], 'white',side)
    # Open window apertures: the old solid side panel must not hide the passengers.
    side_face([(side*1.08,y,z) for z,y in [(-2.05,1.5),(-1.65,2.35),(windshield_z(2.23)+.05,2.23),(windshield_z(1.59)+.05,1.59)]][::side],'white',side)
    box((side*1.045,2.29,.11),(.07,.12,3.8),'white')
    for z in (-.385,.765,2.02):
        box((side*1.045,1.90,z),(.07,.78,.07),'white')
for i in range(len(profile)):
    z1,y1 = profile[i]
    z2,y2 = profile[(i+1) % len(profile)]
    if z1 == 2.1 and z2 == 2.1:
        continue  # Rear doorway is closed by the independently hinged hatch.
    if i == 2:
        continue  # Real windscreen opening; do not put an opaque shell behind glass.
    face([(-1.08,y1,z1),(-1.08,y2,z2),(1.08,y2,z2),(1.08,y1,z1)], 'white')
box((0,.65,0),(1.88,.22,3.8),'trim')
box((0,.725,0),(1.86,.05,3.8),'hub')
# A low dashboard ahead of the driver, leaving the enlarged cab clear at head height.
box((0,1.20,-1.77),(1.86,.30,.28),'trim')
for side in (-1,1):
    box((side*.55,.84,-1.04),(.32,.18,.30),'trim')
    box((side*.55,.93,-1.04),(.48,.10,.46),'trim')
    # Fixed seat backs behind the driver and copilot, clear of their heads/bun.
    box((side*.55,1.33,-.69),(.48,.70,.15),'trim')
    box((side*.55,1.34,-.7775),(.40,.58,.025),'glassHighlight')
    box((side*.55,.988,-1.055),(.40,.016,.34),'glassHighlight')
    for edge in (-1,1):
        box((side*.55+edge*.155,1.34,-.792),(.006,.49,.004),'hub')
    box((side*.55,1.56,-.792),(.31,.006,.004),'hub')

wheels = []
for side in (-1, 1):
    # Window layout follows only the selected van's side proportions.
    for shape in [ [(windshield_z(1.59)+.05,1.59),(windshield_z(2.23)+.05,2.23),(-.43,2.23),(-.43,1.59)],
                   [(-.34,1.59),(-.34,2.23),(.72,2.23),(.72,1.59)],
                   [(.81,1.59),(.81,2.23),(1.8,2.23),(1.97,2.09),(1.97,1.59)] ]:
        side_face([(side*1.083,y,z) for z,y in shape][::side], 'glass',side)
    box((side*1.087,1.66,.26),(.014,.026,.84),'glassHighlight')
    box((side*1.087,1.66,1.35),(.014,.026,.87),'glassHighlight')
    # Approximate wrap triangles, separated by white gutters. No invented service text.
    zs = [-1.72,-.79,.1,1.02,2.0]
    lows = [1.12,.72,.72,1.12,1.12]
    colors = ['blue','green','yellow','blue','pink','green','blue','yellow']
    for i in range(4):
        corners = [(zs[i],lows[i]),(zs[i+1],lows[i+1]),(zs[i+1],1.51),(zs[i],1.51)]
        for j, indices in enumerate([(0,1,2),(0,2,3)]):
            triangle = [corners[k] for k in indices]
            cz = sum(p[0] for p in triangle)/3
            cy = sum(p[1] for p in triangle)/3
            side_face([(side*1.086,cy+(y-cy)*.94,cz+(z-cz)*.94) for z,y in triangle][::-side], colors[i*2+j],side)
    box((side*1.09,1.26,.30),(.012,.29,1.30),'white')
    driver_box((side*1.092,1.48,-.53),(.015,.035,.19),'trim')
    box((side*1.092,1.48,.45),(.015,.035,.19),'trim')
    box((side*1.089,1.13,1.32),(.012,.025,1.18),'trim')
    box((side*1.09,.66,0),(.07,.08,1.51),'hub')
    driver_box((side*1.14,1.66,-1.30),(.15,.055,.13),'trim')
    # Mirror housing faces the front; the opaque reflective surface faces +Z (rear).
    mirror_x = side*1.215
    driver_box((mirror_x,1.76,-1.31),(.12,.27,.09),'white')
    driver_box((mirror_x,1.76,-1.261),(.108,.238,.008),'trim')
    driver_face([(mirror_x-.047,1.653,-1.255),(mirror_x+.047,1.653,-1.255),
                 (mirror_x+.047,1.867,-1.255),(mirror_x-.047,1.867,-1.255)],'mirror',side)
    for z in (-1.3, 1.3):
        wheels.append({'x': side*1.075, 'y': .56, 'z': z, 'radius': .42, 'width': .25})
        cylinder_x(side*1.075,.56,z,.42,.25,'tire')
        cylinder_x(side*1.208,.56,z,.255,.025,'hub')
        cylinder_x(side*1.226,.56,z,.10,.015,'trim')
# Keep the roof bare and white: no rails, crossbars or mounting brackets.
outer=[(-1.08,1.5,-2.05),(-1.08,2.35,-1.65),(1.08,2.35,-1.65),(1.08,1.5,-2.05)]
inner=[(-.96,1.59,windshield_z(1.59)),(-.96,2.23,windshield_z(2.23)),(.96,2.23,windshield_z(2.23)),(.96,1.59,windshield_z(1.59))]
for i in range(4):
    j=(i+1)%4
    face([outer[i],outer[j],inner[j],inner[i]],'white')
face(inner,'windshield')
box((0,.72,-2.11),(2.05,.18,.10),'white')
box((0,.72,2.11),(2.05,.18,.10),'white')
box((0,.94,-2.105),(1.04,.19,.012),'trim')
for side in (-1,1):
    box((side*.79,1.13,-2.105),(.40,.15,.02),'lamp')
    box((side*.92,1.25,2.108),(.12,.40,.02),'tail')

# Rear-opening lift vehicle reference: upper hinge, raised tailgate and clear doorway.
hatch_pivot = [0,2.15,2.1]
body_batches = batches
hatch_batches = {key: {'color':color,'positions':[]} for key,color in palette.items()}
batches = hatch_batches
box((0,-.10,.012),(1.82,.13,.055),'white')
box((0,-1.21,.012),(1.82,.27,.055),'white')
for side in (-1,1):
    box((side*.865,-.65,.012),(.09,1.3,.055),'white')
box((0,-.39,.014),(1.68,.51,.018),'glass')
box((0,-.87,.012),(1.68,.46,.055),'white')
box((0,-1.10,.045),(.32,.055,.018),'trim')
batches = body_batches

# Plain wording legible in the supplied photo, not a recreation of its logo.
for side in (-1,1):
    bpy.ops.object.text_add()
    obj = bpy.context.object
    obj.data.body = 'LOHAS GROUP'
    obj.data.size = .14
    obj.data.extrude = 0
    obj.rotation_euler = Matrix(((0,0,side),(side,0,0),(0,1,0))).to_euler()
    obj.location = (side*1.099, -side*.56-.35, 1.21)
    bpy.ops.object.convert(target='MESH')
    for polygon in obj.data.polygons:
        points = []
        for vertex in polygon.vertices:
            v = obj.matrix_world @ obj.data.vertices[vertex].co
            points.append((v.x,v.z,-v.y))
        face(points,'teal')
    bpy.data.objects.remove(obj, do_unlink=True)

metadata = {'name':'lohas-service-van','units':'metres','forward':'-Z','up':'+Y',
            'reference':'public/lohas_car2.jpg','wheels':wheels,
            'cabin':{'roofFrontZ':-1.65,'roofY':2.35,'windshieldLowerZ':-2.05,'windshieldLowerY':1.5,'windshieldUpperZ':-1.65,'windshieldUpperY':2.35},
            'note':'Side wrap approximation; rear hatch and lift inspired by supplied KOMBI/STARIA references, not a certified mechanism.'}
geometry = {'metadata':metadata,'batches':batches,'hatch':{'pivot':hatch_pivot,'batches':hatch_batches},'driverDoor':{'pivot':driver_pivot,'batches':driver_batches},'passengerDoor':{'pivot':passenger_pivot,'batches':passenger_batches}}
(ROOT / 'src/game/vehicle/serviceVanGeometry.json').write_text(json.dumps(geometry,separators=(',',':')),encoding='utf-8')

def emit(parts, prefix, parent=None):
    for name,batch in parts.items():
        positions = batch['positions']
        if not positions:
            continue
        vertices = [(positions[i],-positions[i+2],positions[i+1]) for i in range(0,len(positions),3)]
        faces = [tuple(range(i,i+3)) for i in range(0,len(vertices),3)]
        mesh = bpy.data.meshes.new(prefix+name)
        mesh.from_pydata(vertices,[],faces)
        mesh.update()
        obj = bpy.data.objects.new(prefix+name,mesh)
        bpy.context.collection.objects.link(obj)
        obj.data.materials.append(materials[name])
        if parent:
            obj.parent = parent
emit(batches,'van-')
hinge = bpy.data.objects.new('rearHatch',None)
bpy.context.collection.objects.link(hinge)
hinge.location = (hatch_pivot[0],-hatch_pivot[2],hatch_pivot[1])
emit(hatch_batches,'hatch-',hinge)
door=bpy.data.objects.new('driverDoor',None)
bpy.context.collection.objects.link(door)
door.location=(driver_pivot[0],-driver_pivot[2],driver_pivot[1])
emit(driver_batches,'driver-door-',door)
passenger_door=bpy.data.objects.new('passengerDoor',None)
bpy.context.collection.objects.link(passenger_door)
passenger_door.location=(passenger_pivot[0],-passenger_pivot[2],passenger_pivot[1])
emit(passenger_batches,'passenger-door-',passenger_door)

bpy.context.scene['reference'] = metadata['reference']
bpy.context.scene['approximation'] = metadata['note']
bpy.ops.wm.save_as_mainfile(filepath=str(SOURCE / 'lohas-service-van.blend'))
bpy.ops.export_scene.gltf(filepath=str(OUTPUT / 'lohas_service_van.glb'),export_format='GLB',
    export_yup=True,export_animations=False,export_cameras=False,export_lights=False,
    export_extras=True,export_copyright='Project-authored geometry; user-supplied side-photo reference.')
print('SERVICE_VAN_EXPORT',sum(len(b['positions'])//9 for parts in (batches,hatch_batches,driver_batches,passenger_batches) for b in parts.values()),'triangles')
