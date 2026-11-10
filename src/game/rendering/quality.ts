export type Quality = 'low' | 'medium' | 'high';
export const QUALITY = {
  low: { label: 'Low', dpr: 1, shadowSize: 512, shadowExtent: 42, vegetationRange: 85, detailedTrees: 28, ao: false, aoScale: .4, aoSamples: 6 },
  medium: { label: 'Medium', dpr: 1.25, shadowSize: 1536, shadowExtent: 55, vegetationRange: 150, detailedTrees: 55, ao: true, aoScale: .5, aoSamples: 8 },
  high: { label: 'High', dpr: 1.5, shadowSize: 2048, shadowExtent: 72, vegetationRange: 220, detailedTrees: 85, ao: true, aoScale: .65, aoSamples: 12 },
} as const;
export function isQuality(value: unknown): value is Quality { return value === 'low' || value === 'medium' || value === 'high'; }
