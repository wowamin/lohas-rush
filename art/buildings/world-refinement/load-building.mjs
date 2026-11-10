import { LOD } from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

/** Loads this asset bundle at its original world coordinates. Distances use source scene units. */
export async function loadRefinedBuilding({
  baseUrl = new URL('./', import.meta.url),
  distances = [0, 20, 45],
  loader = new GLTFLoader(),
} = {}) {
  if (distances.length !== 3 || distances[0] !== 0 ||
      !distances.every(Number.isFinite) || distances[1] <= 0 || distances[2] <= distances[1]) {
    throw new Error('distances must contain three increasing finite values starting at zero.');
  }
  const files = ['building_refined.glb', 'building_refined_lod1.glb', 'building_refined_lod2.glb'];
  const assets = await Promise.all(files.map(file => loader.loadAsync(new URL(file, baseUrl).href)));
  const lod = new LOD();
  lod.name = 'Refined_Building';
  const materials = new Map();
  const architecture = new Map();
  const retainedTextures = new Set();
  const discardedTextures = new Set();
  const geometries = new Set();
  const collectTextures = (material, target) => {
    for (const value of Object.values(material)) if (value?.isTexture) target.add(value);
  };
  assets.forEach(({ scene }, index) => {
    scene.traverse(object => {
      if (!object.isMesh) return;
      object.receiveShadow = true;
      const key = object.userData.canonical_name || object.name;
      if (object.userData.asset_role !== 'vegetation' && architecture.has(key)) {
        object.geometry.dispose();
        object.geometry = architecture.get(key);
      } else if (object.userData.asset_role !== 'vegetation') {
        architecture.set(key, object.geometry);
      }
      geometries.add(object.geometry);
      const shareMaterial = material => {
        const shared = materials.get(material.name);
        if (shared && shared !== material) {
          collectTextures(material, discardedTextures);
          material.dispose();
          return shared;
        }
        materials.set(material.name, material);
        collectTextures(material, retainedTextures);
        return material;
      };
      object.material = Array.isArray(object.material) ? object.material.map(shareMaterial) : shareMaterial(object.material);
      const list = Array.isArray(object.material) ? object.material : [object.material];
      object.castShadow = !list.some(material => material.transmission > 0);
    });
    lod.addLevel(scene, distances[index], 0.12);
  });
  for (const texture of discardedTextures) if (!retainedTextures.has(texture)) texture.dispose();
  lod.userData.physicalScaleVerified = false;
  lod.userData.lodPolicy = 'Architecture is identical at all levels; only vegetation changes.';
  lod.dispose = () => {
    lod.removeFromParent();
    for (const geometry of geometries) geometry.dispose();
    for (const material of materials.values()) material.dispose();
    for (const texture of retainedTextures) texture.dispose();
  };
  return lod;
}
