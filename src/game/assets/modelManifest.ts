export const modelFiles = {
  scooter: 'scooter.glb', blueTruck: 'blue_truck.glb', trafficCone: 'traffic_cone.glb', shophouse: 'shophouse.glb',
} as const;
export type AssetKey = keyof typeof modelFiles;
export const assetKeys = Object.keys(modelFiles) as AssetKey[];
export function modelUrl(key: AssetKey, base = './') {
  return `${base.endsWith('/') ? base : `${base}/`}assets/models/${modelFiles[key]}`;
}
export const modelSizes: Record<AssetKey, { width: number; height: number; depth: number }> = {
  scooter: { width: 0.8, height: 1.6, depth: 1.8 }, blueTruck: { width: 2.6, height: 2.5, depth: 5 },
  trafficCone: { width: 0.7, height: 0.9, depth: 0.7 }, shophouse: { width: 9, height: 6, depth: 9 },
};
