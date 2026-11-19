import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { buildings } from '../data/city';
import { disposeModels } from './assets/GameAssets';
import { createQiguCenterModel, type QiguCenterId } from './buildings/qiguCenterModels';

function createSignTexture(id: QiguCenterId, header = false) {
  const canvas = document.createElement('canvas');
  canvas.width = 1024; canvas.height = header ? 128 : 256;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Unable to draw the Qigu center sign.');
  ctx.fillStyle = header ? '#a58d98' : '#f5f1df'; ctx.fillRect(0, 0, canvas.width, canvas.height);
  if (!header) {
    ctx.fillStyle = id === 'longshan' ? '#c1dce0' : '#c4d0a4';
    for (let y = 18; y < 256; y += 58) ctx.fillRect(0, y, 1024, 18);
    ctx.fillStyle = '#f9f6e9'; ctx.fillRect(34, 18, 956, 220);
  }
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.font = `900 ${header ? 86 : 88}px "Microsoft JhengHei", "Noto Sans TC", sans-serif`;
  ctx.fillStyle = header ? '#f3d887' : id === 'longshan' ? '#257694' : '#b83b72';
  if (header) ctx.fillText('龍山', 512, 66);
  else {
    ctx.fillText(id === 'longshan' ? '樂活七股龍山' : '樂活七股義合', 512, 80, 920);
    ctx.font = '900 82px "Microsoft JhengHei", "Noto Sans TC", sans-serif';
    ctx.fillText('日照中心', 512, 181, 880);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace; texture.anisotropy = 4;
  return texture;
}

export function QiguCenterBuilding({ id }: { id: QiguCenterId }) {
  const host = useRef<THREE.Group>(null);
  const building = buildings.find(item => item.id === id)!;
  useEffect(() => {
    const container = host.current!;
    const model = createQiguCenterModel(id, createSignTexture(id), id === 'longshan' ? createSignTexture(id, true) : undefined);
    container.add(model);
    return () => { container.remove(model); disposeModels([model]); };
  }, [id]);
  return <group ref={host} name={`${id}-center-building`} position={[building.x, 0, building.z]} rotation={[0, building.rotation ?? 0, 0]} />;
}
