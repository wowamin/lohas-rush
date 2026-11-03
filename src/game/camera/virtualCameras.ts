export type CameraMode = 'chase' | 'overview';
export type VirtualCamera = {
  id: CameraMode; label: string; priority: number; blendDuration: number;
  distance: number; height: number; shoulder: number; fov: number;
  lookAhead: number; lookAheadTime: number; aimHeight: number;
  damping: { x: number; y: number; z: number; aim: number };
};
export const virtualCameras: readonly VirtualCamera[] = [
  { id: 'chase', label: '跟車', priority: 10, blendDuration: 0.65, distance: 14, height: 9, shoulder: 0, fov: 58,
    lookAhead: 3, lookAheadTime: 0.12, aimHeight: 1.2, damping: { x: 0.25, y: 0.2, z: 0.25, aim: 0.2 } },
  { id: 'overview', label: '高視角', priority: 20, blendDuration: 0.65, distance: 22, height: 17, shoulder: 0, fov: 62,
    lookAhead: 4, lookAheadTime: 0.12, aimHeight: 1.2, damping: { x: 0.3, y: 0.25, z: 0.3, aim: 0.25 } },
];
export function selectVirtualCamera(mode: CameraMode): VirtualCamera {
  let live = virtualCameras[0];
  for (const camera of virtualCameras) {
    if ((camera.id === 'chase' || camera.id === mode) && camera.priority > live.priority) live = camera;
  }
  return live;
}
