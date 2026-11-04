# Pedestrian street module

Preview: `http://localhost:5174/?scene=pedestrian`. Drag to orbit, scroll to zoom,
and toggle the collision overlay. This standalone scene does not replace the
existing game's wider streets or change its missions.

The implementation uses the repository's TypeScript with Three.js. The core
classes have no React dependency. `PedestrianStreetPreview.tsx` is the optional
React Three Fiber wrapper, loaded on demand by the query parameter.

## Modules

| Class / factory | Responsibility |
| --- | --- |
| `PedestrianStreet extends Group` | Own the complete four-arm intersection, layout, navigation and disposal |
| `StreetArm` (internal) | Reuse a single approach at four quarter-turn rotations |
| `StreetBatch` | Merge temporary geometry by material; one draw per material per render pass |
| `StreetMarkings` | Zebra stripes, stop bars, lane dashes, arrows and tactile warning panels |
| `StreetFurniture` | Low-poly trees, lamps and reflective bollards outside the walking strip |
| `StreetNavigation` | Actor-specific circle/OBB and swept-circle collision queries; optional debug meshes |
| `createStreetMaterials` | Shared matte standard materials; built-in Three.js shader pipeline |

## Dimensions and layout

One world unit represents one metre; X/Z is the ground plane and +Y is up.
The road is a two-way street with right-hand traffic. A mirrored section is:

```text
2.4 m sidewalk | 1.2 m furnishing | .65 m shoulder | 3 m lane
              | 1.8 m central refuge reservation |
3 m lane | .65 m shoulder | 1.2 m furnishing | 2.4 m sidewalk
```

The curb extensions project 0.65 m into each shoulder, narrowing the curb-to-curb
crossing from 9.1 m to 7.8 m while preserving both 3 m travel lanes. Dashed
boundaries distinguish the 1.8 m central reservation from the lanes. Island noses
split the crossing into two 3 m vehicle lanes and a pedestrian refuge.

- Sidewalk top: +0.15 m above asphalt. The clear 2.4 m strip excludes furniture.
- Corner sidewalk slabs join adjacent approaches continuously.
- Curbs use actual extruded geometry with 25 mm single-segment chamfers.
- Nearest zebra edge: 4.5 m from the nominal turning corner, measured along each approach.
- Zebra/table width along the road: 3 m. Raised table top meets both footways at +0.15 m.
- Table approach ramps: 1.8 m long, a 1:12 rise; `roadHeightAt` matches their visual profile.
- Refuge noses: 1.8 m wide, +0.30 m high. The 3 m cut-through between them stays at
  table level (+0.15 m), with no island lip. The table ramps provide the elevation transition.
- Stop bars precede the incoming table ramp by 1 m. Trees, lamps and bollards
  start beyond the crossing to keep its immediate area open.
- Yellow ribbed warning panels distinguish the pedestrian entries through both
  color and geometry. They are visual cues, not a claim of a specified tactile standard.

## Plain Three.js usage

```ts
import { PedestrianStreet } from './PedestrianStreet';

const street = new PedestrianStreet({
  laneWidth: 3,
  sidewalkWidth: 2.4,
  bufferWidth: 1.2,
  crossingSetback: 4.5,
  armLength: 36,
  treeSpacing: 9,
});
scene.add(street);
street.position.set(100, 0, 50); // optional world placement
street.rotation.y = Math.PI / 2;
street.debugCollisions.visible = true;

// Before accepting a proposed world-space movement:
const blocked = street.navigation.sweep(
  previousX, previousZ, proposedX, proposedZ,
  0.45, 'pedestrian', // or 'vehicle', with an appropriate footprint radius
);
if (!blocked) {
  // accept movement; caller owns movement/velocity response
}

// Local X/Z query: use worldToLocal when the street is translated or rotated.
const roadY = street.roadHeightAt(localX, localZ);

// On scene removal:
scene.remove(street);
street.dispose();
```

Navigation supports unit-scale placement and rotation about Y. Sidewalks and
refuge cut-throughs block vehicles; tree trunks, posts and island noses block
both actor types. Pedestrians can traverse the entire raised crossing. The
boundaries are intentionally simple gameplay proxies. Circle sweeps test the
whole movement segment against expanded faces and rounded corners, avoiding
tunneling through thin posts. They return a blocked flag; sliding and response
belong to the controller. The tile edges are open connection points, not walls.

The existing game's van uses a 2.45 m enclosing collision circle, which cannot
fit a 3 m lane. Integrating this scene into live driving requires an oriented
vehicle footprint, sidewalk and road grounding for each actor, steering/turning
clearance checks, and an adapter into the current collision system. The preview
does not silently change that controller or claim these integrations are complete.

## Materials and rendering

`MeshStandardMaterial` uses Three.js's standard lighting, fog and shadow shaders.
Asphalt is dark `#303b44`, markings cream `#fff9e4`, sidewalks light `#d9d6ca`,
tactile cues gold `#e6ac32`, and posts dark `#243d49`. Roughness is 0.95 and
metalness is zero; the lamp lens has modest emission. No custom shaders,
textures, transparency, point lights or post-processing are required. The
preview uses one hemisphere light, one shadow-casting directional light with a
1024² map, and caps DPR at 1.5. Geometry reinforces cues rather than relying
only on color. No accessibility conformance or real-road certification is implied.

Default geometry merges into 11 material batches, below 10,000 triangles.
Debug boxes are hidden by default and add draws when enabled. Shadows require
additional render passes. Merging is appropriate for this compact tile;
large networks should use tiles with culling and reuse instanced furniture.
The design targets a modest rendering budget; 60 fps on physical hardware has
not been benchmarked. Chrome tests use software WebGL.

## Verification

```sh
npm run test:street
npm run test:street:browser
npm run build
```

Unit tests cover dimensions, finite vertices, mesh/triangle budgets, ramp
continuity on four approaches, pedestrian passage, vehicle lane clearance,
refuge and furniture collisions, sweeps, translated/rotated placement, disposal,
and invalid configuration. Browser checks cover scene loading, geometry budget,
collision toggle and a 390 × 844 viewport. Screenshots are written under
`.test-artifacts/pedestrian-street-*.png`.
