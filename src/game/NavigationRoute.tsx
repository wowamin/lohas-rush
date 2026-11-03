import { useMemo } from 'react';
import { Line } from '@react-three/drei';
import { useGame } from '../stores/game';
import { locations } from '../data/locations';
import { findRoadRoute, nearestRoadNode } from '../data/roadNetwork';

export function NavigationRoute() {
  const node = useGame(s => nearestRoadNode(s.x, s.z));
  const mission = useGame(s => s.missionIndex);
  const completed = useGame(s => s.completed);
  const points = useMemo(() => findRoadRoute(node, locations[mission].roadNode).map(([x, z]) => [x, 0.18, z] as [number, number, number]), [node, mission]);
  return !completed && points.length > 1 ? <Line points={points} color="#ffdb83" lineWidth={4} /> : null;
}
