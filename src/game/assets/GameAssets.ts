import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { clone } from 'three/addons/utils/SkeletonUtils.js';
import { assetKeys, modelSizes, modelUrl, type AssetKey } from './modelManifest.ts';
import { createFallbackModel } from './fallbackModels.ts';

export type AssetStatus = { state: 'idle' | 'loading' | 'ready' | 'fallback'; error?: string };
export type ModelSize = { width: number; height: number; depth: number };
type Options = { base?: string; timeoutMs?: number; load?: (url: string) => Promise<THREE.Object3D> };

export function disposeModels(roots: Iterable<THREE.Object3D>) {
  const geometries = new Set<THREE.BufferGeometry>(), materials = new Set<THREE.Material>();
  const textures = new Set<THREE.Texture>(), skeletons = new Set<THREE.Skeleton>(), images = new Set<{ close(): void }>();
  for (const root of roots) root.traverse(child => {
    if (!(child instanceof THREE.Mesh)) return;
    geometries.add(child.geometry);
    for (const material of Array.isArray(child.material) ? child.material : [child.material]) materials.add(material);
    if (child instanceof THREE.SkinnedMesh) skeletons.add(child.skeleton);
  });
  for (const material of materials) for (const value of Object.values(material)) if (value instanceof THREE.Texture) textures.add(value);
  for (const texture of textures) {
    const sources = Array.isArray(texture.image) ? texture.image : [texture.image];
    for (const source of sources) if (source && typeof source.close === 'function') images.add(source);
    texture.dispose();
  }
  for (const skeleton of skeletons) skeleton.dispose();
  for (const geometry of geometries) geometry.dispose();
  for (const material of materials) material.dispose();
  for (const bitmap of images) bitmap.close();
}

export class GameAssets {
  readonly assets = {} as Record<AssetKey, THREE.Object3D>;
  readonly status = {} as Record<AssetKey, AssetStatus>;
  private owned = new Set<THREE.Object3D>();
  private disposed = false;
  private pending?: Promise<void>;
  private cancellations = new Set<() => void>();
  private load: (url: string) => Promise<THREE.Object3D>;
  private base: string;
  private timeoutMs: number;
  constructor(options: Options = {}) {
    const loader = new GLTFLoader();
    this.load = options.load ?? (url => loader.loadAsync(url).then(gltf => gltf.scene));
    this.base = options.base ?? './'; this.timeoutMs = options.timeoutMs ?? 8000;
    for (const key of assetKeys) {
      const fallback = createFallbackModel(key); this.prepare(fallback);
      this.assets[key] = fallback; this.owned.add(fallback); this.status[key] = { state: 'idle' };
    }
  }
  private prepare(root: THREE.Object3D) {
    root.traverse(child => { if (child instanceof THREE.Mesh) { child.castShadow = true; child.receiveShadow = true; } });
    root.updateMatrixWorld(true);
    const bounds = new THREE.Box3().setFromObject(root), size = bounds.getSize(new THREE.Vector3());
    if (bounds.isEmpty() || ![...bounds.min.toArray(), ...bounds.max.toArray()].every(Number.isFinite) || Math.max(size.x, size.y, size.z) < 0.00001) throw new Error('Model has no usable geometry.');
  }
  loadGameAssets() {
    if (this.disposed) return Promise.reject(new Error('Asset library is disposed.'));
    if (this.pending) return this.pending;
    this.pending = Promise.all(assetKeys.map(key => new Promise<void>(resolve => {
      this.status[key] = { state: 'loading' };
      let settled = false;
      const fail = (error: unknown) => {
        if (settled) return; settled = true; clearTimeout(timer);
        this.cancellations.delete(cancel);
        if (!this.disposed) this.status[key] = { state: 'fallback', error: String(error) };
        resolve();
      };
      const cancel = () => fail(new Error('Asset library disposed.'));
      const timer = setTimeout(() => fail(new Error('Model loading timed out.')), this.timeoutMs);
      this.cancellations.add(cancel);
      Promise.resolve().then(() => {
        if (this.disposed) throw new Error('Asset library is disposed.');
        return this.load(modelUrl(key, this.base));
      }).then(root => {
        if (settled || this.disposed) { disposeModels([root]); if (!settled) { settled = true; clearTimeout(timer); resolve(); } return; }
        try { this.prepare(root); }
        catch (error) { disposeModels([root]); fail(error); return; }
        this.assets[key] = root; this.owned.add(root); this.status[key] = { state: 'ready' };
        settled = true; clearTimeout(timer); resolve();
        this.cancellations.delete(cancel);
      }, fail);
    }))).then(() => undefined);
    return this.pending;
  }
  create(key: AssetKey, dimensions: ModelSize = modelSizes[key]) {
    if (this.disposed) throw new Error('Asset library is disposed.');
    const model = clone(this.assets[key]); model.updateMatrixWorld(true);
    const bounds = new THREE.Box3().setFromObject(model), size = bounds.getSize(new THREE.Vector3()), center = bounds.getCenter(new THREE.Vector3());
    const scale = Math.min(dimensions.width / Math.max(size.x, 0.00001), dimensions.height / Math.max(size.y, 0.00001), dimensions.depth / Math.max(size.z, 0.00001));
    const wrapper = new THREE.Group(); wrapper.scale.setScalar(scale); wrapper.position.set(-center.x * scale, -bounds.min.y * scale, -center.z * scale); wrapper.add(model);
    const root = new THREE.Group(); root.add(wrapper); root.userData.assetKey = key; root.userData.modelState = this.status[key].state;
    return root;
  }
  releaseInstance(root: THREE.Object3D) {
    // SkeletonUtils clones bones but shares cached geometry/materials: release only instance skeletons.
    root.traverse(child => { if (child instanceof THREE.SkinnedMesh) child.skeleton.dispose(); });
    root.removeFromParent();
  }
  dispose() {
    if (this.disposed) return; this.disposed = true;
    for (const cancel of this.cancellations) cancel();
    this.cancellations.clear();
    disposeModels(this.owned); this.owned.clear();
  }
}
