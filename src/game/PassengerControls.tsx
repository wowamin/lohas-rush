import { useGame } from '../stores/game';
import { transferLabels } from './vehicle/passengerTransfer';
import { BOARDING_RADIUS } from './vehicle/wheelchairController';

export function PassengerControls() {
  const phase = useGame(s => s.transferPhase), error = useGame(s => s.transferError);
  const speed = useGame(s => s.speed), request = useGame(s => s.requestTransfer);
  const distance=useGame(s=>s.boardingDistance);
  const ready = phase === 'stowed' || phase === 'outside';
  return <section className="passenger-panel" aria-label="乘客接送">
    <div className="passenger-status" role="status"><strong>{transferLabels[phase]}</strong><small>{error || (phase === 'outside' ? distance > BOARDING_RADIUS ? `請回到車尾上車標記・距離 ${distance.toFixed(1)} m` : speed !== 0 ? '請先停下輪椅，再按「奶奶上車」或 E' : '已到上車點，按「奶奶上車」或 E' : phase === 'stowed' ? speed !== 0 ? '請先完全停車，再按「奶奶下車」或 E' : '已停妥，按「奶奶下車」或 E 開始體驗' : '接送進行中，請等候平台與司機完成動作')}</small></div>
    <button type="button" className="transfer-button" disabled={!ready || speed !== 0 || (phase==='outside' && distance>BOARDING_RADIUS)} onClick={event => { request(); event.currentTarget.blur(); }}>{phase === 'outside' ? '奶奶上車' : ready ? '奶奶下車' : '接送中…'}</button>
  </section>;
}
