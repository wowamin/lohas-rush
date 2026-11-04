import { MeshStandardMaterial } from 'three';

// Built-in standard shaders retain fog, shadows, color management and instancing.
// Matte surfaces avoid glare; white markings remain distinct from dark asphalt.
export function createStreetMaterials() {
  const matte = (color: string) => new MeshStandardMaterial({ color, roughness: .95, metalness: 0, flatShading: true });
  return {
    asphalt: matte('#303b44'), pavement: matte('#d9d6ca'), curb: matte('#f2eee1'),
    buffer: matte('#aeb6a0'), marking: matte('#fff9e4'), tactile: matte('#e6ac32'),
    metal: matte('#243d49'), trunk: matte('#71513e'), foliage: matte('#47735b'),
    ground: matte('#92aa87'),
    lamp: new MeshStandardMaterial({ color: '#fff1c4', emissive: '#ffe5a0', emissiveIntensity: .5, roughness: .9 }),
  };
}
export type StreetMaterials = ReturnType<typeof createStreetMaterials>;
