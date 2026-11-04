import { BoxGeometry, BufferGeometry, ExtrudeGeometry, Group, Matrix4, Mesh, type Material, type Vector3Tuple, Shape } from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

// Merge by material: draw calls grow with material count, rather than tree count.
// Each module owns its temporary geometry; finish() transfers merged meshes.
export class StreetBatch {
  private batches = new Map<Material, BufferGeometry[]>();
  add(geometry: BufferGeometry, material: Material, position: Vector3Tuple = [0,0,0], yaw = 0) {
    const matrix = new Matrix4().makeRotationY(yaw); matrix.setPosition(...position);
    geometry.applyMatrix4(matrix);
    // Extrusions and primitives have different attributes/indexing. Normalize once.
    const normalized = geometry.index ? geometry.toNonIndexed() : geometry;
    normalized.deleteAttribute('uv');
    if (normalized !== geometry) geometry.dispose();
    const batch = this.batches.get(material) ?? []; batch.push(normalized); this.batches.set(material, batch);
  }
  box(size: Vector3Tuple, position: Vector3Tuple, material: Material, yaw = 0) {
    this.add(new BoxGeometry(...size), material, position, yaw);
  }
  finish(target: Group) {
    for (const [material, geometries] of this.batches) {
      const merged = mergeGeometries(geometries, false);
      geometries.forEach(g => g.dispose());
      if (!merged) throw new Error('Street geometry attributes must match.');
      merged.computeBoundingSphere();
      const mesh = new Mesh(merged, material); mesh.name = `street-${material.uuid}`;
      mesh.castShadow = true; mesh.receiveShadow = true; target.add(mesh);
    }
    this.batches.clear();
  }
}

// Polygon points are [x,z]. One bevel segment produces a true low-poly chamfer.
export function chamferedSlab(points: readonly (readonly [number, number])[], height = .15, bevel = .025) {
  const shape = new Shape();
  points.forEach(([x,z], index) => index ? shape.lineTo(x,-z) : shape.moveTo(x,-z)); shape.closePath();
  const geometry = new ExtrudeGeometry(shape, { depth: height - 2 * bevel, bevelEnabled: true,
    bevelThickness: bevel, bevelSize: bevel, bevelSegments: 1, steps: 1, curveSegments: 1 });
  geometry.rotateX(-Math.PI / 2); geometry.translate(0, bevel, 0);
  return geometry;
}

// Road-longitudinal ramp: no vertical lip at either end of the speed table.
export function rampGeometry(width: number, length: number, height: number, rising: boolean) {
  const shape = new Shape();
  const low = rising ? 0 : height, high = rising ? height : 0;
  shape.moveTo(-length/2, -.04); shape.lineTo(length/2, -.04);
  shape.lineTo(length/2, high); shape.lineTo(-length/2, low); shape.closePath();
  const geometry = new ExtrudeGeometry(shape, { depth: width, bevelEnabled: false, steps: 1 });
  // Extruded width becomes X; profile length becomes Z.
  geometry.rotateY(-Math.PI/2); geometry.translate(width/2, 0, 0);
  return geometry;
}
