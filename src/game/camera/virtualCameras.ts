export type CameraMode = 'chase' | 'overview' | 'service' | 'wheelchair';
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
  { id: 'service', label: '接送視角', priority: 30, blendDuration: .8, distance: 8, height: 4.5, shoulder: 5, fov: 48,
    lookAhead: -1.8, lookAheadTime: 0, aimHeight: 1.25, damping: { x: .2, y: .2, z: .2, aim: .2 } },
  { id:'wheelchair',label:'輪椅跟隨',priority:40,blendDuration:.65,distance:5.5,height:3.7,shoulder:2.5,fov:52,
    lookAhead:.6,lookAheadTime:.15,aimHeight:.85,damping:{x:.18,y:.18,z:.18,aim:.18} },
];
export function selectVirtualCamera(mode: CameraMode): VirtualCamera {
  let live = virtualCameras[0];
  for (const camera of virtualCameras) {
    if ((camera.id === 'chase' || camera.id === mode) && camera.priority > live.priority) live = camera;
  }
  return live;
}
