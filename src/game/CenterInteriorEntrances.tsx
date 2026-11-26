import { Html } from '@react-three/drei';
import { locations } from '../data/locations';
import { CENTER_INTERIORS, interiorHref, type CenterInterior } from '../features/dahe/centers';
import { useGame } from '../stores/game';
import { useVisual } from '../stores/visual';

function Entrance({ center }: { center: CenterInterior }) {
  const location = locations.find(item => item.id === center.id)!;
  const nearby = useGame(state => Math.hypot(state.x - location.position[0], state.z - location.position[2]) <= 60);
  const inCity = useVisual(state => state.viewMode === 'game');
  if (!nearby || !inCity) return null;
  return <group position={location.position} rotation={[0, location.rotation, 0]}>
    <Html position={[...center.entrance]} center zIndexRange={[14, 0]} style={{ pointerEvents: 'auto' }}>
      <a className="interior-entrance" href={interiorHref(center, import.meta.env.BASE_URL)} aria-label={`進入${center.name}室內`} onPointerDown={event => event.stopPropagation()} onClick={() => useGame.getState().flushProgress()}>
        <strong>進入室內 <span aria-hidden="true">→</span></strong>
        <small>{center.name}・奶奶的室內散策</small>
      </a>
    </Html>
  </group>;
}

export function CenterInteriorEntrances() {
  return <>{CENTER_INTERIORS.map(center => <Entrance key={center.id} center={center} />)}</>;
}
