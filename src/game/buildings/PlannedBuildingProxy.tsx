import { useState } from 'react';
import * as THREE from 'three';
import type { FacilityType, PlannedBuilding } from '../../data/planning/cityTypes';

const materials: Record<FacilityType | 'highlight', THREE.MeshStandardMaterial> = {
  headquarters: new THREE.MeshStandardMaterial({ color: '#e8eee8', roughness: 0.8 }),
  fountain: new THREE.MeshStandardMaterial({ color: '#9fcbd7', roughness: 0.6 }),
  plaza: new THREE.MeshStandardMaterial({ color: '#d8d2c2', roughness: 1 }),
  'residential-care': new THREE.MeshStandardMaterial({ color: '#dbbda7', roughness: 0.9 }),
  'nursing-home': new THREE.MeshStandardMaterial({ color: '#d2c0ab', roughness: 0.9 }),
  'day-center': new THREE.MeshStandardMaterial({ color: '#d5a866', roughness: 0.8 }),
  clinic: new THREE.MeshStandardMaterial({ color: '#b8cbd0', roughness: 0.8 }),
  'home-nursing': new THREE.MeshStandardMaterial({ color: '#bfd1c0', roughness: 0.9 }),
  'care-management': new THREE.MeshStandardMaterial({ color: '#abc8b1', roughness: 0.9 }),
  'home-care': new THREE.MeshStandardMaterial({ color: '#b7c9a9', roughness: 0.9 }),
  foundation: new THREE.MeshStandardMaterial({ color: '#d4c495', roughness: 0.9 }),
  'day-work': new THREE.MeshStandardMaterial({ color: '#c4b8d3', roughness: 0.9 }),
  'disability-service': new THREE.MeshStandardMaterial({ color: '#b9b1ce', roughness: 0.9 }),
  'accessible-transport': new THREE.MeshStandardMaterial({ color: '#8eb8a1', roughness: 0.8 }),
  'transport-base': new THREE.MeshStandardMaterial({ color: '#8eb8a1', roughness: 0.8 }),
  'meal-factory': new THREE.MeshStandardMaterial({ color: '#d5a866', roughness: 0.8 }),
  training: new THREE.MeshStandardMaterial({ color: '#b8c3d0', roughness: 0.9 }),
  'partner-hospital': new THREE.MeshStandardMaterial({ color: '#a9bdca', roughness: 0.8 }),
  'logistics-warehouse': new THREE.MeshStandardMaterial({ color: '#bcae91', roughness: 0.9 }),
  'other-service': new THREE.MeshStandardMaterial({ color: '#c5c6b3', roughness: 0.9 }),
  housing: new THREE.MeshStandardMaterial({ color: '#d9c4b2', roughness: 0.9 }),
  commerce: new THREE.MeshStandardMaterial({ color: '#d6b79c', roughness: 0.9 }),
  park: new THREE.MeshStandardMaterial({ color: '#94b58a', roughness: 1 }),
  parking: new THREE.MeshStandardMaterial({ color: '#b3b8ad', roughness: 1 }),
  school: new THREE.MeshStandardMaterial({ color: '#d8c98e', roughness: 0.9 }),
  'public-utility': new THREE.MeshStandardMaterial({ color: '#adbab1', roughness: 0.9 }),
  highlight: new THREE.MeshStandardMaterial({ color: '#f5cc72', emissive: '#8b6420', emissiveIntensity: 0.18, roughness: 0.75 }),
};

type Props = {
  building: PlannedBuilding;
  onSelect?: (building: PlannedBuilding) => void;
};

export function PlannedBuildingProxy({ building, onSelect }: Props) {
  const [hovered, setHovered] = useState(false);
  const segments = building.floors?.length
    ? building.floors.map(floor => ({ id: floor.id, height: floor.height }))
    : [{ id: 'mass', height: building.dimensions.height }];
  let base = 0;

  return (
    <group
      name={`planned-building-${building.id}`}
      position={building.position}
      userData={{ landmarkId: building.id, collision: building.collision }}
      onPointerOver={event => {
        event.stopPropagation();
        setHovered(true);
        document.body.style.cursor = 'pointer';
      }}
      onPointerOut={event => {
        event.stopPropagation();
        setHovered(false);
        document.body.style.cursor = '';
      }}
      onClick={event => {
        event.stopPropagation();
        onSelect?.(building);
      }}
    >
      {segments.map(segment => {
        const y = base + segment.height / 2;
        base += segment.height;
        return (
          <mesh key={segment.id} position={[0, y, 0]} castShadow receiveShadow userData={{ floorId: segment.id }}>
            <boxGeometry args={[building.dimensions.width, segment.height, building.dimensions.depth]} />
            <primitive object={hovered ? materials.highlight : materials[building.type]} attach="material" />
          </mesh>
        );
      })}
    </group>
  );
}
