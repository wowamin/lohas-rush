export type Quality = 'low' | 'medium' | 'high';
export const QUALITY = {
  low: { label: '低', dpr: 1, shadows: false, shadowSize: 512, shadowExtent: 42, far: 230, fogNear: 80, fogFar: 220, sceneryRange: 240, vegetationRange: 70, detailedTrees: 22 },
  medium: { label: '中', dpr: 1.25, shadows: true, shadowSize: 1536, shadowExtent: 55, far: 440, fogNear: 160, fogFar: 420, sceneryRange: 460, vegetationRange: 150, detailedTrees: 55 },
  high: { label: '高', dpr: 1.5, shadows: true, shadowSize: 2048, shadowExtent: 72, far: 640, fogNear: 180, fogFar: 620, sceneryRange: 660, vegetationRange: 220, detailedTrees: 85 },
} as const;
export function isQuality(value: unknown): value is Quality { return value === 'low' || value === 'medium' || value === 'high'; }

export type DeviceCapabilities = { width: number; height: number; dpr: number; memory?: number; cores?: number; coarse: boolean };
export function readDeviceCapabilities(): DeviceCapabilities {
  if (typeof window === 'undefined') return { width: 1280, height: 720, dpr: 1, coarse: false };
  const nav = navigator as Navigator & { deviceMemory?: number };
  return { width: innerWidth, height: innerHeight, dpr: devicePixelRatio || 1, memory: nav.deviceMemory,
    cores: nav.hardwareConcurrency, coarse: matchMedia('(any-pointer: coarse)').matches };
}
export function selectDeviceQuality(device: DeviceCapabilities): { initial: Quality; ceiling: Quality; reason: string } {
  const known = (n: number | undefined) => typeof n === 'number' && Number.isFinite(n) && n > 0;
  const memory = known(device.memory) ? device.memory! : undefined, cores = known(device.cores) ? device.cores! : undefined;
  const pixels = Math.max(1, device.width) * Math.max(1, device.height) * Math.min(Math.max(device.dpr, 1), 3) ** 2;
  if ((memory !== undefined && memory <= 2) || (cores !== undefined && cores <= 2) ||
    (device.coarse && ((memory !== undefined && memory <= 4) || (cores !== undefined && cores <= 4))))
    return { initial: 'low', ceiling: 'low', reason: '裝置資源較有限，優先保持操作順暢。' };
  if (pixels > 6000000 || (memory !== undefined && memory <= 4))
    return { initial: 'medium', ceiling: 'medium', reason: '依畫面解析度與可用資源採用平衡畫質。' };
  if (memory !== undefined && memory >= 8 && cores !== undefined && cores >= 8)
    return { initial: 'high', ceiling: 'high', reason: '裝置資源充足，先採用高畫質並觀察幀率。' };
  return { initial: device.coarse && cores === undefined ? 'low' : 'medium', ceiling: 'high', reason: '先採保守設定，開始遊玩後依實測幀率調整。' };
}

const tiers: Quality[] = ['low', 'medium', 'high'];
export class QualitySampler {
  private warmup = 2;
  private elapsed = 0;
  private frames = 0;
  private fastWindows = 0;
  private cooldown = 0;
  reset() { this.warmup = 2; this.elapsed = 0; this.frames = 0; this.fastWindows = 0; this.cooldown = 0; }
  sample(delta: number, quality: Quality, ceiling: Quality): { quality: Quality; fps: number } | null {
    if (!Number.isFinite(delta) || delta <= 0) { this.reset(); return null; }
    delta = Math.min(delta, 1);
    if (this.warmup > 0) { this.warmup -= delta; return null; }
    this.cooldown = Math.max(0, this.cooldown - delta);
    this.elapsed += delta; this.frames++;
    if (this.elapsed < 4) return null;
    const fps = this.frames / this.elapsed;
    this.elapsed = 0; this.frames = 0;
    const tier = tiers.indexOf(quality), cap = tiers.indexOf(ceiling);
    this.fastWindows = fps >= 55 ? this.fastWindows + 1 : 0;
    let next = tier;
    if (this.cooldown === 0) {
      if (fps < 28 && tier > 0) next = tier - 1;
      else if (fps < 43 && tier === 2) next = 1;
      else if (this.fastWindows >= 3 && tier < cap) next = tier + 1;
    }
    if (next === tier) return null;
    this.fastWindows = 0; this.cooldown = 12;
    return { quality: tiers[next], fps };
  }
}
