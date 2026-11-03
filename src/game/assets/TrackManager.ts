import { Group } from 'three';
import type { AssetKey } from './modelManifest.ts';
import type { GameAssets, ModelSize } from './GameAssets.ts';
import { StreetModelPool, poolKey, type PoolSpec } from './StreetModelPool.ts';

export type StreetPlacement = {
  id: string; asset: AssetKey; x: number; z: number; y?: number; rotation?: number;
  size?: ModelSize; shopId?: string;
};

// Free driving uses a two-dimensional neighborhood, including when reversing.
// Only detailed models stream; roads, mission triggers and collision stay resident.
export class TrackManager {
  readonly chunkLength = 40;
  readonly visibleChunks = 4;
  readonly chunks: Group[] = [];
  private anchor = '';
  private cells = new Map<string, StreetPlacement[]>();
  private disposed = false;
  private x = 0;
  private z = 0;
  private scene: Group;
  private assets: GameAssets;
  private pool: StreetModelPool;
  private onShopsChanged: (ids: ReadonlySet<string>) => void;
  constructor(scene: Group, assets: GameAssets, placements: StreetPlacement[],
    onShopsChanged: (ids: ReadonlySet<string>) => void = () => {}) {
    this.scene = scene; this.assets = assets; this.onShopsChanged = onShopsChanged;
    for (const placement of placements) {
      const key = this.key(Math.floor(placement.x / 40), Math.floor(placement.z / 40));
      const cell = this.cells.get(key) ?? []; cell.push(placement); this.cells.set(key, cell);
    }
    const variants = new Map<string, { spec: PoolSpec; counts: number[] }>();
    for (const cell of this.cells.values()) {
      const counts = new Map<string, number>();
      for (const item of cell) {
        const key = poolKey(item.asset, item.size);
        if (!variants.has(key)) variants.set(key, { spec: { asset: item.asset, size: item.size, capacity: 0, requiresReady: !!item.shopId }, counts: [] });
        if (!item.shopId) variants.get(key)!.spec.requiresReady = false;
        counts.set(key, (counts.get(key) ?? 0) + 1);
      }
      for (const [key, count] of counts) variants.get(key)!.counts.push(count);
    }
    // Four densest cells give a conservative bound for any four-cell neighborhood.
    this.pool = new StreetModelPool(assets, [...variants.values()].map(({ spec, counts }) => ({
      ...spec, capacity: counts.sort((a, b) => b - a).slice(0, this.visibleChunks).reduce((sum, count) => sum + count, 0),
    })));
  }
  private key(x: number, z: number) { return `${x},${z}`; }
  init(x = 0, z = 0) {
    if (this.disposed || this.chunks.length) return;
    this.anchor = '';
    for (let i = 0; i < this.visibleChunks; i++) { const group = new Group(); this.chunks.push(group); this.scene.add(group); }
    this.update(x, z);
  }
  private clear(group: Group) {
    for (const child of [...group.children]) this.pool.release(child);
  }
  get poolStats() { return this.pool.stats; }
  update(x: number, z: number, force = false) {
    if (this.disposed || !Number.isFinite(x) || !Number.isFinite(z)) return;
    this.x = x; this.z = z;
    const cx = Math.floor(x / 40 - .5), cz = Math.floor(z / 40 - .5), anchor = this.key(cx, cz);
    if (!force && this.anchor === anchor) return;
    this.anchor = anchor;
    const desired = [this.key(cx, cz), this.key(cx + 1, cz), this.key(cx, cz + 1), this.key(cx + 1, cz + 1)];
    const unused = this.chunks.filter(group => force || !desired.includes(group.name));
    // Return every leaving model before filling any arriving cell, so replacements
    // never need a second copy merely because another slot has not recycled yet.
    for (const group of unused) { this.clear(group); group.name = ''; }
    this.pool.prewarm();
    for (const key of desired) {
      if (!force && this.chunks.some(group => group.name === key)) continue;
      const group = unused.shift(); if (!group) continue;
      group.name = key;
      for (const item of this.cells.get(key) ?? []) {
        if (item.shopId && this.assets.status.shophouse.state !== 'ready') continue;
        const model = this.pool.acquire(item.asset, item.size);
        model.name = item.id; model.position.set(item.x, item.y ?? .1, item.z);
        model.rotation.set(0, item.rotation ?? 0, 0); model.scale.setScalar(1);
        model.userData.shopId = item.shopId; group.add(model);
      }
    }
    const shops = new Set<string>();
    for (const group of this.chunks) for (const model of group.children) if (model.userData.shopId) shops.add(model.userData.shopId);
    this.onShopsChanged(shops);
  }
  refreshAssets() { this.update(this.x, this.z, true); }
  dispose() {
    if (this.disposed) return; this.disposed = true;
    for (const group of this.chunks) { this.clear(group); group.removeFromParent(); }
    this.pool.dispose();
    this.chunks.length = 0; this.cells.clear();
  }
}
