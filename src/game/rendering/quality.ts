export type Quality = 'low' | 'medium' | 'high';
export const QUALITY = {
  low: { label: 'Low', dpr: 1, shadowSize: 512, shadowExtent: 42, vegetationRange: 85, detailedTrees: 28 },
  medium: { label: 'Medium', dpr: 1.25, shadowSize: 1536, shadowExtent: 55, vegetationRange: 150, detailedTrees: 55 },
  high: { label: 'High', dpr: 1.5, shadowSize: 2048, shadowExtent: 72, vegetationRange: 220, detailedTrees: 85 },
} as const;
export function isQuality(value: unknown): value is Quality { return value === 'low' || value === 'medium' || value === 'high'; }
