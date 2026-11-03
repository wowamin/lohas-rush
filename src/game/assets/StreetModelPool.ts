import type { Object3D } from 'three';
import { modelSizes, type AssetKey } from './modelManifest.ts';
import type { GameAssets, ModelSize } from './GameAssets.ts';

export type PoolSpec = { asset: AssetKey; size?: ModelSize; capacity: number; requiresReady?: boolean };
type Entry = PoolSpec & { idle: Object3D[]; active: Set<Object3D> };
export function poolKey(asset: AssetKey, size: ModelSize = modelSizes[asset]) {
  return `${asset}:${size.width},${size.height},${size.depth}`;
}

// Instances own their cloned skeletons; geometry, materials and textures belong to GameAssets.
export class StreetModelPool {
  private assets: GameAssets;
  private entries = new Map<string, Entry>();
  private owners = new Map<Object3D, Entry>();
  private disposed = false;
  private created = 0;
  constructor(assets: GameAssets, specs: PoolSpec[]) {
    this.assets = assets;
    for (const spec of specs) this.entries.set(poolKey(spec.asset, spec.size), { ...spec, idle: [], active: new Set() });
  }
  private current(model: Object3D, entry: Entry) { return model.userData.templateId === this.assets.assets[entry.asset].uuid; }
  private make(entry: Entry) {
    const model = this.assets.create(entry.asset, entry.size);
    model.userData.templateId = this.assets.assets[entry.asset].uuid;
    this.created++; return model;
  }
  prewarm() {
    if (this.disposed) return;
    for (const entry of this.entries.values()) {
      entry.idle = entry.idle.filter(model => {
        if (this.current(model, entry)) return true;
        this.assets.releaseInstance(model); return false;
      });
      if (entry.requiresReady && this.assets.status[entry.asset].state !== 'ready') continue;
      while (entry.idle.length + entry.active.size < entry.capacity) entry.idle.push(this.make(entry));
    }
  }
  acquire(asset: AssetKey, size?: ModelSize) {
    if (this.disposed) throw new Error('Street model pool is disposed.');
    const entry = this.entries.get(poolKey(asset, size));
    if (!entry) throw new Error('Street model variant was not reserved.');
    const model = entry.idle.pop();
    if (!model || !this.current(model, entry)) throw new Error('Street model pool requires prewarming or capacity is exhausted.');
    entry.active.add(model); this.owners.set(model, entry); return model;
  }
  release(model: Object3D) {
    const entry = this.owners.get(model); if (!entry) return;
    this.owners.delete(model); entry.active.delete(model); model.removeFromParent();
    delete model.userData.shopId;
    if (this.disposed || !this.current(model, entry)) this.assets.releaseInstance(model);
    else entry.idle.push(model);
  }
  get stats() {
    let capacity = 0, idle = 0, active = 0;
    for (const entry of this.entries.values()) { capacity += entry.capacity; idle += entry.idle.length; active += entry.active.size; }
    return { capacity, idle, active, resident: idle + active, created: this.created };
  }
  dispose() {
    if (this.disposed) return; this.disposed = true;
    for (const entry of this.entries.values()) {
      for (const model of [...entry.idle, ...entry.active]) this.assets.releaseInstance(model);
    }
    this.entries.clear(); this.owners.clear();
  }
}
