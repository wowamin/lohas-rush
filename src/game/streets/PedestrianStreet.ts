import { CylinderGeometry, Group, IcosahedronGeometry, Mesh, type Material } from 'three';
import { StreetBatch, chamferedSlab, rampGeometry } from './StreetGeometry.ts';
import { createStreetMaterials, type StreetMaterials } from './StreetMaterials.ts';
import { StreetNavigation, type StreetActor } from './StreetNavigation.ts';

export type StreetOptions = {
  armLength?: number; laneWidth?: number; sidewalkWidth?: number; bufferWidth?: number;
  crossingSetback?: number; treeSpacing?: number;
};
export type StreetLayout = ReturnType<typeof streetLayout>;
export function streetLayout(options: StreetOptions = {}) {
  const settings = { armLength: 36, laneWidth: 3, sidewalkWidth: 2.4, bufferWidth: 1.2,
    crossingSetback: 4.5, treeSpacing: 9, ...options };
  for (const value of Object.values(settings)) if (!Number.isFinite(value) || value <= 0) throw new RangeError('Street dimensions must be finite and positive.');
  if (settings.sidewalkWidth < 2 || settings.bufferWidth < 1.2 || settings.laneWidth < 2.8 || settings.laneWidth > 3.2 ||
      settings.crossingSetback < 4 || settings.crossingSetback > 5 || settings.treeSpacing < 6) throw new RangeError('Unsupported pedestrian street dimensions.');
  const height = .15, refugeWidth = 1.8, shoulder = .65, crossingWidth = 3, rampLength = 1.8;
  const laneEdge = settings.laneWidth + refugeWidth/2;
  const roadEdge = laneEdge + shoulder;
  const outerEdge = roadEdge + settings.bufferWidth + settings.sidewalkWidth;
  const crossingStart = roadEdge + settings.crossingSetback;
  const crossingEnd = crossingStart + crossingWidth;
  if (settings.armLength < crossingEnd + rampLength + 10) throw new RangeError('Arms need space beyond crossings for furniture and markings.');
  return { ...settings, height, refugeWidth, shoulder, crossingWidth, rampLength,
    laneEdge, roadEdge, outerEdge, crossingStart, crossingEnd,
    crossingCenter: (crossingStart+crossingEnd)/2 };
}

// Local +Z is one outward approach. Reuse it at four quarter-turn rotations.
class StreetArm {
  readonly yaw: number; readonly layout: StreetLayout; readonly batch: StreetBatch;
  readonly materials: StreetMaterials; readonly navigation: StreetNavigation;
  constructor(yaw: number, layout: StreetLayout, batch: StreetBatch, materials: StreetMaterials, navigation: StreetNavigation) {
    this.yaw=yaw; this.layout=layout; this.batch=batch; this.materials=materials; this.navigation=navigation;
  }
  box(size: [number,number,number], position: [number,number,number], material: Material) {
    const [x,y,z]=position, c=Math.cos(this.yaw),s=Math.sin(this.yaw);
    this.batch.box(size,[x*c+z*s,y,-x*s+z*c],material,this.yaw);
  }
  boundary(id: string, x: number, z: number, halfX: number, halfZ: number, blocks: readonly StreetActor[]) {
    const c=Math.cos(this.yaw),s=Math.sin(this.yaw);
    this.navigation.add({ id: `${this.yaw}-${id}`, x:x*c+z*s, z:-x*s+z*c, halfX, halfZ, yaw:this.yaw, blocks });
  }
  build() {
    const l=this.layout, m=this.materials;
    for (const side of [-1,1]) {
      // Continuous 2.4 m clear pedestrian strip; furniture occupies a separate band.
      this.batch.add(chamferedSlab([
        [side*l.roadEdge,l.outerEdge],[side*l.outerEdge,l.outerEdge],
        [side*l.outerEdge,l.armLength],[side*l.roadEdge,l.armLength],
      ]),m.pavement,[0,0,0],this.yaw);
      this.box([l.bufferWidth,.015,l.armLength-l.outerEdge],
        [side*(l.roadEdge+l.bufferWidth/2),l.height+.008,(l.armLength+l.outerEdge)/2],m.buffer);
      // Extension tapers from the normal curb into the paved shoulder. Neither
      // 3 m travel lane is pinched by the neckdown or the 1.8 m refuge.
      this.batch.add(chamferedSlab([
        [side*l.roadEdge,l.crossingStart-1], [side*l.laneEdge,l.crossingStart-.4],
        [side*l.laneEdge,l.crossingEnd+.4], [side*l.roadEdge,l.crossingEnd+1],
      ]),m.curb,[0,0,0],this.yaw);
      this.boundary(`sidewalk-${side}`,side*(l.roadEdge+l.outerEdge)/2,(l.armLength+l.outerEdge)/2,
        (l.outerEdge-l.roadEdge)/2,(l.armLength-l.outerEdge)/2,['vehicle']);
      this.boundary(`neckdown-${side}`,side*(l.laneEdge+l.roadEdge)/2,l.crossingCenter,
        l.shoulder/2,l.crossingWidth/2+.4,['vehicle']);
    }
    // The table meets the footway at exactly +0.15 m; ramps are 1:12.
    this.box([2*l.laneEdge,l.height,l.crossingWidth],[0,l.height/2,l.crossingCenter],m.asphalt);
    for (const rising of [true,false]) this.batch.add(rampGeometry(2*l.roadEdge,l.rampLength,l.height,rising),m.asphalt,
      this.transform(0,0,rising ? l.crossingStart-l.rampLength/2 : l.crossingEnd+l.rampLength/2),this.yaw);
    // Refuge noses stand above the table; a 3 m wide cut-through remains flush
    // with both table and sidewalks, so wheelchairs encounter no island lip.
    for (const end of [-1,1]) {
      const z=l.crossingCenter+end*(l.crossingWidth/2+.65);
      this.box([l.refugeWidth,.3,1.1],[0,.15,z],m.curb);
      this.boundary(`refuge-${end}`,0,z,l.refugeWidth/2,.55,['vehicle','pedestrian']);
    }
    // Prevent driving through the refuge cut-through; pedestrians may cross it.
    this.boundary('refuge-path',0,l.crossingCenter,l.refugeWidth/2,l.crossingWidth/2,['vehicle']);
    new StreetMarkings(this).build();
    new StreetFurniture(this).build();
  }
  transform(x: number,y: number,z: number): [number,number,number] {
    const c=Math.cos(this.yaw),s=Math.sin(this.yaw); return [x*c+z*s,y,-x*s+z*c];
  }
}

export class StreetMarkings {
  private arm: StreetArm;
  constructor(arm: StreetArm) { this.arm=arm; }
  build() {
    const a=this.arm,l=a.layout,m=a.materials;
    // Stripe gaps run across the road; both carriageways and refuge are readable.
    for (let x=-l.laneEdge+.25;x<l.laneEdge-.15;x+=.8) {
      if (Math.abs(x)<l.refugeWidth/2+.2) continue;
      a.box([.4,.008,l.crossingWidth],[x,l.height+.005,l.crossingCenter],m.marking);
    }
    for (const side of [-1,1]) {
      // Tactile warning panels occupy only the furnishing band, preserving the
      // full clear sidewalk width. Geometric ribs also read without color.
      const x=side*(l.laneEdge+.25);
      a.box([.45,.012,l.crossingWidth],[x,l.height+.008,l.crossingCenter],m.tactile);
      for(let z=l.crossingStart+.15;z<l.crossingEnd;z+=.22)
        a.box([.4,.014,.035],[x,l.height+.02,z],m.curb);
    }
    // Right-hand traffic: +X approaches the intersection, -X departs it.
    const laneCenter=(l.refugeWidth/2+l.laneEdge)/2;
    a.box([l.laneWidth,.01,.3],[laneCenter,.006,l.crossingEnd+l.rampLength+1],m.marking);
    for(let z=l.crossingEnd+4;z<l.armLength-1;z+=5) for(const side of [-1,1])
      a.box([.12,.008,2],[side*l.refugeWidth/2,.005,z],m.marking);
    for (const side of [-1,1]) {
      const z=l.crossingEnd+7, x=side*laneCenter, direction=side===1 ? -1 : 1;
      a.box([.15,.01,1.4],[x,.006,z],m.marking);
      // Two rotated bars form a procedural arrowhead.
      for (const wing of [-1,1]) {
        const p=a.transform(x+wing*.22,.006,z+direction*.52);
        a.batch.box([.14,.01,.7],p,m.marking,a.yaw-wing*direction*Math.PI/4);
      }
      a.box([.08,.008,l.armLength-l.crossingEnd-4],
        [side*(l.laneEdge-.06),.005,(l.armLength+l.crossingEnd+4)/2],m.marking);
    }
  }
}

export class StreetFurniture {
  private arm: StreetArm;
  constructor(arm: StreetArm) { this.arm=arm; }
  build() {
    const a=this.arm,l=a.layout,m=a.materials;
    for(const side of [-1,1]) {
      const x=side*(l.roadEdge+l.bufferWidth/2);
      for(let z=l.crossingEnd+6;z<l.armLength-2;z+=l.treeSpacing) {
        a.batch.add(new CylinderGeometry(.14,.2,2.4,6),m.trunk,a.transform(x,1.35,z),a.yaw);
        // Narrow crowns keep the clear footway open above walking head height.
        a.batch.add(new IcosahedronGeometry(.95,0),m.foliage,a.transform(x,3.15,z),a.yaw);
        a.boundary(`tree-${side}-${z}`,x,z,.22,.22,['vehicle','pedestrian']);
        const lampZ=z+3;
        if(lampZ>l.armLength-1)continue;
        a.batch.add(new CylinderGeometry(.065,.09,4.5,6),m.metal,a.transform(x,2.4,lampZ),a.yaw);
        a.box([.7,.12,.3],[x-side*.25,4.65,lampZ],m.metal);
        a.box([.5,.025,.24],[x-side*.25,4.58,lampZ],m.lamp);
        a.boundary(`lamp-${side}-${z}`,x,lampZ,.12,.12,['vehicle','pedestrian']);
      }
      // Keep all street furniture out of the crossing and its immediate sightline.
      for(let z=l.crossingEnd+4;z<l.armLength-1;z+=2.2) {
        const bx=side*(l.roadEdge+.2);
        a.batch.add(new CylinderGeometry(.075,.10,.85,6),m.metal,a.transform(bx,.575,z),a.yaw);
        a.batch.add(new CylinderGeometry(.078,.078,.10,6),m.marking,a.transform(bx,.85,z),a.yaw);
        a.boundary(`bollard-${side}-${z}`,bx,z,.1,.1,['vehicle','pedestrian']);
      }
    }
  }
}

export class PedestrianStreet extends Group {
  readonly layout: StreetLayout;
  readonly navigation: StreetNavigation;
  readonly materials = createStreetMaterials();
  readonly debugCollisions: Group;
  constructor(options: StreetOptions = {}) {
    super(); this.name='pedestrian-street'; this.layout=streetLayout(options);
    this.navigation=new StreetNavigation(this);
    const l=this.layout,batch=new StreetBatch();
    batch.box([2*l.armLength,.12,2*l.armLength],[0,-.10,0],this.materials.ground);
    // Split the asphalt cross into three rectangles: no coplanar overlap.
    batch.box([2*l.roadEdge,.08,2*l.armLength],[0,-.04,0],this.materials.asphalt);
    for(const side of [-1,1])batch.box([l.armLength-l.roadEdge,.08,2*l.roadEdge],
      [side*(l.armLength+l.roadEdge)/2,-.04,0],this.materials.asphalt);
    for(let i=0;i<4;i++) {
      const arm=new StreetArm(i*Math.PI/2,l,batch,this.materials,this.navigation);
      arm.build();
      // Each quadrant's corner links the sidewalks of adjacent arms.
      batch.add(chamferedSlab([[l.roadEdge,l.roadEdge],[l.outerEdge,l.roadEdge],
        [l.outerEdge,l.outerEdge],[l.roadEdge,l.outerEdge]]),this.materials.pavement,[0,0,0],arm.yaw);
      arm.boundary('corner',(l.roadEdge+l.outerEdge)/2,(l.roadEdge+l.outerEdge)/2,
        (l.outerEdge-l.roadEdge)/2,(l.outerEdge-l.roadEdge)/2,['vehicle']);
    }
    batch.finish(this); this.debugCollisions=this.navigation.createDebugMesh();
    this.userData.layout=this.layout;
  }
  // Query LOCAL road surface for vehicle/chair grounding. Returns asphalt/table
  // height only; callers still use navigation boundaries to keep actors on paths.
  roadHeightAt(x: number,z: number) {
    const l=this.layout,along=Math.max(Math.abs(x),Math.abs(z)),across=Math.min(Math.abs(x),Math.abs(z));
    if(across>l.roadEdge || along>l.armLength)return 0;
    if(along>=l.crossingStart && along<=l.crossingEnd)return l.height;
    if(along>=l.crossingStart-l.rampLength && along<l.crossingStart)
      return l.height*(along-l.crossingStart+l.rampLength)/l.rampLength;
    if(along>l.crossingEnd && along<=l.crossingEnd+l.rampLength)
      return l.height*(l.crossingEnd+l.rampLength-along)/l.rampLength;
    return 0;
  }
  dispose() {
    const geometries=new Set<import('three').BufferGeometry>(),materials=new Set<Material>();
    this.traverse(object=>{ if(object instanceof Mesh){geometries.add(object.geometry);
      for(const material of Array.isArray(object.material)?object.material:[object.material])materials.add(material); } });
    Object.values(this.materials).forEach(material=>materials.add(material));
    geometries.forEach(g=>g.dispose()); materials.forEach(m=>m.dispose()); this.clear();
  }
}
