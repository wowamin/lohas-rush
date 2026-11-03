import { useGame } from '../stores/game';
import { transferLabels } from './vehicle/passengerTransfer';
import { BOARDING_RADIUS } from './vehicle/wheelchairController';

export function PassengerControls() {
  const phase = useGame(s => s.transferPhase), error = useGame(s => s.transferError);
  const speed = useGame(s => s.speed), request = useGame(s => s.requestTransfer);
  const distance=useGame(s=>s.boardingDistance);
  const ready = phase === 'stowed' || phase === 'outside';
  return <section className="passenger-panel" aria-label="乘客接送">
    <div className="passenger-status" role="status"><strong>{transferLabels[phase]}</strong><small>{error || (phase === 'outside' ? `WASD／方向鍵移動・Space 停下・上車點 ${distance.toFixed(1)} m` : phase === 'stowed' ? '停妥後可按 E 或下車按鈕' : '接送視角・車輛已停駐')}</small></div>
    <button type="button" className="transfer-button" disabled={!ready || speed !== 0 || (phase==='outside' && distance>BOARDING_RADIUS)} onClick={event => { request(); event.currentTarget.blur(); }}>{phase === 'outside' ? '奶奶上車' : ready ? '奶奶下車' : '接送中…'}</button>
  </section>;
}
