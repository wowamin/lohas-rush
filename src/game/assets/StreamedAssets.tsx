import { useEffect, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Group } from 'three';
import { buildings } from '../../data/city';
import { useGame } from '../../stores/game';
import { GameAssets } from './GameAssets';
import { TrackManager, type StreetPlacement } from './TrackManager';

const placements: StreetPlacement[] = [
  { id: 'meal-van', asset: 'blueTruck', x: 43, z: 28 },
  // Parked props are deterministic; their collision bounds remain loaded globally.
  { id: 'parked-scooter', asset: 'scooter', x: 48, z: 28 },
  { id: 'roadside-cone', asset: 'trafficCone', x: 39, z: 28 },
  ...buildings.filter(b => b.shop).map(b => ({ id: b.id, shopId: b.id, asset: 'shophouse' as const,
    x: b.x, z: b.z, y: .3, rotation: b.rotation,
    size: { width: b.halfX * 2, height: b.height, depth: b.halfZ * 2 } })),
];

export function StreamedAssets({ onShopsChanged }: { onShopsChanged: (ids: ReadonlySet<string>) => void }) {
  const root = useRef<Group>(null), manager = useRef<TrackManager>();
  useEffect(() => {
    if (!root.current) return;
    const assets = new GameAssets({ base: import.meta.env.BASE_URL });
    const track = new TrackManager(root.current, assets, placements, onShopsChanged);
    manager.current = track;
    const state = useGame.getState(); track.init(state.x, state.z);
    let alive = true;
    void assets.loadGameAssets().then(() => { if (alive) track.refreshAssets(); });
    return () => { alive = false; manager.current = undefined; track.dispose(); assets.dispose(); };
  }, [onShopsChanged]);
  useFrame(() => { const { x, z } = useGame.getState(); manager.current?.update(x, z); });
  return <group ref={root} />;
}
