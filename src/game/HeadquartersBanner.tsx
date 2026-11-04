import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { buildings } from '../data/city';
import { disposeModels } from './assets/GameAssets';

const headquarters = buildings.find(building => building.id === 'headquarters')!;
const greeting = '祝院長生日快樂！';

export function HeadquartersBanner() {
  const host = useRef<THREE.Group>(null);
  useEffect(() => {
    const container = host.current!, group = new THREE.Group();
    const canvas = document.createElement('canvas'); canvas.width = 2048; canvas.height = 272;
    const context = canvas.getContext('2d')!;
    const red = context.createLinearGradient(0, 0, 0, canvas.height);
    red.addColorStop(0, '#b71929'); red.addColorStop(.25, '#dc2936');
    red.addColorStop(.7, '#c82130'); red.addColorStop(1, '#a71626');
    context.fillStyle = red; context.fillRect(0, 0, canvas.width, canvas.height);
    // Sewn gold edging and subtle folds make this read as a hung fabric banner.
    context.strokeStyle = '#efbf72'; context.lineWidth = 4;
    context.strokeRect(18, 17, canvas.width - 36, canvas.height - 34);
    context.setLineDash([9, 7]); context.lineWidth = 1; context.strokeStyle = '#f0a988';
    context.strokeRect(29, 28, canvas.width - 58, canvas.height - 56); context.setLineDash([]);
    context.textAlign = 'center'; context.textBaseline = 'middle';
    context.font = '900 180px "Microsoft JhengHei", "Noto Sans TC", sans-serif';
    context.shadowColor = '#7e1120'; context.shadowBlur = 2; context.shadowOffsetY = 5;
    context.fillStyle = '#fff3d4'; context.fillText(greeting, canvas.width / 2, canvas.height / 2 + 5, canvas.width - 180);
    const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = 4;
    const geometry = new THREE.PlaneGeometry(8.4, 1.1, 64, 8);
    const vertices = geometry.getAttribute('position');
    for (let i = 0; i < vertices.count; i++) {
      const x = vertices.getX(i), sag = .09 * (1 - (x / 4.2) ** 2);
      vertices.setY(i, vertices.getY(i) - sag);
      vertices.setZ(i, Math.sin(x * 5) * .012);
    }
    geometry.computeVertexNormals();
    const banner = new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({ map: texture, roughness: .95, side: THREE.DoubleSide }));
    banner.name = 'birthday-banner-cloth'; banner.receiveShadow = true; group.add(banner);
    const ropeMaterial = new THREE.MeshStandardMaterial({ color: '#e4c89f', roughness: .9 });
    const eyeletMaterial = new THREE.MeshStandardMaterial({ color: '#d7af60', roughness: .4, metalness: .5 });
    for (const side of [-1, 1]) for (const y of [-.47, .47]) {
      const eyelet = new THREE.Mesh(new THREE.TorusGeometry(.025, .007, 6, 12), eyeletMaterial);
      eyelet.position.set(side * 4.13, y, .025); group.add(eyelet);
      const rope = new THREE.Mesh(new THREE.CylinderGeometry(.012, .012, .32, 6), ropeMaterial);
      rope.rotation.z = side * Math.PI / 2; rope.position.set(side * 4.3, y, 0); group.add(rope);
    }
    container.add(group);
    return () => { container.remove(group); disposeModels([group]); };
  }, []);
  return <group ref={host} name="headquarters-birthday-banner" position={[headquarters.x, 4.55, headquarters.z + headquarters.halfZ + .18]}
    userData={{ text: greeting }} />;
}
