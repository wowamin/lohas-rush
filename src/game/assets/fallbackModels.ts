import * as THREE from 'three';
import type { AssetKey } from './modelManifest.ts';

export function createFallbackModel(key: AssetKey) {
  const group = new THREE.Group(); group.name = `fallback-${key}`;
  const box = (size: [number, number, number], position: [number, number, number], color: string) => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), new THREE.MeshStandardMaterial({ color }));
    mesh.position.set(...position); group.add(mesh);
  };
  if (key === 'trafficCone') {
    box([0.7, 0.1, 0.7], [0, 0.05, 0], '#343f41');
    const cone = new THREE.Mesh(new THREE.ConeGeometry(0.27, 0.8, 8), new THREE.MeshStandardMaterial({ color: '#e7a16e' }));
    cone.position.y = 0.5; group.add(cone);
    const stripe = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.16, 0.18, 8), new THREE.MeshStandardMaterial({ color: '#fff4de' }));
    stripe.position.y = 0.55; group.add(stripe);
  } else if (key === 'scooter') {
    box([0.5, 0.65, 1.35], [0, 0.75, 0], '#c2d4c8'); box([0.5, 0.12, 0.7], [0, 1.14, 0.2], '#465451');
    box([0.14, 0.65, 0.15], [0, 1.05, -0.55], '#789495'); box([0.8, 0.08, 0.1], [0, 1.4, -0.55], '#465451');
    for (const z of [-0.6, 0.6]) {
      const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.26, 0.16, 10), new THREE.MeshStandardMaterial({ color: '#34434a' }));
      wheel.rotation.z = Math.PI / 2; wheel.position.set(0, 0.26, z); group.add(wheel);
    }
  } else if (key === 'blueTruck') {
    box([2.6, 1.4, 3], [0, 1.15, 0.9], '#6d9fb4'); box([2.4, 1.8, 1.8], [0, 1.35, -1.5], '#88b9cb');
    box([2.1, 0.6, 0.04], [0, 1.7, -2.42], '#c5e0df');
    for (const x of [-1.1, 1.1]) for (const z of [-1.6, 1.6]) box([0.35, 0.65, 0.65], [x, 0.35, z], '#34434a');
  } else {
    box([9, 6, 9], [0, 3, 0], '#e4d2b6'); box([9.4, 0.3, 9.4], [0, 6.15, 0], '#fff3df');
    box([9.4, 0.25, 1.6], [0, 2.7, 4.8], '#b4c9b1');
    for (const x of [-2.7, 0, 2.7]) box([1.6, 1.5, 0.08], [x, 4.4, 4.54], '#86a4a9');
  }
  return group;
}
