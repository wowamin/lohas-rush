import { BoxGeometry, Group, Mesh, MeshBasicMaterial, Vector3 } from 'three';

export type StreetActor = 'vehicle' | 'pedestrian';
export type StreetBoundary = {
  id: string; x: number; z: number; halfX: number; halfZ: number; yaw: number;
  blocks: readonly StreetActor[];
};

export class StreetNavigation {
  readonly boundaries: StreetBoundary[] = [];
  private point = new Vector3();
  private root: Group;
  constructor(root: Group) { this.root=root; }
  add(boundary: StreetBoundary) { this.boundaries.push(boundary); }
  // World-space circle against local oriented boxes. Root may translate/yaw,
  // but must keep unit scale (metres). No per-query arrays or Three objects.
  collides(x: number, z: number, radius: number, actor: StreetActor) {
    if (!Number.isFinite(radius) || radius < 0) throw new RangeError('Invalid actor radius.');
    this.root.updateWorldMatrix(true, false);
    this.root.worldToLocal(this.point.set(x, this.root.matrixWorld.elements[13], z));
    for (const b of this.boundaries) {
      if (!b.blocks.includes(actor)) continue;
      const dx = this.point.x-b.x, dz = this.point.z-b.z, c = Math.cos(b.yaw), s = Math.sin(b.yaw);
      const localX = dx*c-dz*s, localZ = dx*s+dz*c;
      const gapX = Math.max(Math.abs(localX)-b.halfX,0), gapZ = Math.max(Math.abs(localZ)-b.halfZ,0);
      if (gapX*gapX+gapZ*gapZ <= radius*radius) return true;
    }
    return false;
  }
  // Exact swept circle vs rounded rectangle (expanded faces + corner circles).
  // Tests whole segments, preventing tunneling at high speed.
  sweep(x0: number, z0: number, x1: number, z1: number, radius: number, actor: StreetActor) {
    if (!Number.isFinite(radius) || radius < 0) throw new RangeError('Invalid actor radius.');
    this.root.updateWorldMatrix(true, false);
    const originY = this.root.matrixWorld.elements[13];
    this.root.worldToLocal(this.point.set(x0,originY,z0)); const ax = this.point.x, az = this.point.z;
    this.root.worldToLocal(this.point.set(x1,originY,z1)); const bx = this.point.x, bz = this.point.z;
    for (const b of this.boundaries) {
      if (!b.blocks.includes(actor)) continue;
      const c = Math.cos(b.yaw), s = Math.sin(b.yaw);
      const x = (ax-b.x)*c-(az-b.z)*s, z = (ax-b.x)*s+(az-b.z)*c;
      const dx = (bx-ax)*c-(bz-az)*s, dz = (bx-ax)*s+(bz-az)*c;
      const hitsBox = (hx: number, hz: number) => {
        let near = 0, far = 1;
        for (const [p,d,h] of [[x,dx,hx],[z,dz,hz]]) {
          if (Math.abs(d)<1e-12) { if (Math.abs(p)>h) return false; }
          else { const a=(-h-p)/d, end=(h-p)/d; near=Math.max(near,Math.min(a,end)); far=Math.min(far,Math.max(a,end)); }
          if (near>far) return false;
        }
        return true;
      };
      if (hitsBox(b.halfX+radius,b.halfZ) || hitsBox(b.halfX,b.halfZ+radius)) return true;
      for (const sx of [-1,1]) for (const sz of [-1,1]) {
        const px=x-sx*b.halfX, pz=z-sz*b.halfZ, length=dx*dx+dz*dz;
        const t=length>0 ? Math.max(0,Math.min(1,-(px*dx+pz*dz)/length)) : 0;
        if ((px+t*dx)**2+(pz+t*dz)**2 <= radius*radius) return true;
      }
    }
    return false;
  }
  createDebugMesh() {
    const group = new Group(); group.name = 'street-collision-debug';
    const geometry = new BoxGeometry(1,1,1), material = new MeshBasicMaterial({ color: '#ff38ce', wireframe: true, depthTest: false });
    for (const b of this.boundaries) {
      const mesh = new Mesh(geometry,material); mesh.name = b.id;
      mesh.position.set(b.x,.3,b.z); mesh.scale.set(b.halfX*2,.6,b.halfZ*2); mesh.rotation.y=b.yaw;
      group.add(mesh);
    }
    group.visible = false; this.root.add(group); return group;
  }
}
