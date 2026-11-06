import { useEffect, useRef } from 'react';
import { useGame } from '../../stores/game';
import { touchController } from './touchController';
const drivingCodes=['KeyW','KeyA','KeyS','KeyD','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'];
const controlled = [...drivingCodes, 'Space', 'KeyR', 'KeyC', 'KeyE'];
export function useDrivingInput() {
  const keys = useRef(new Set<string>());
  useEffect(() => {
    const clear = () => keys.current.clear();
    clear();
    // Clear at the reset action itself. A later effect/frame must not erase
    // fresh input that arrived after R but before the next simulation step.
    const unsubscribe = useGame.subscribe((state, previous) => {
      if (state.resetKey !== previous.resetKey || (state.controlsPaused && !previous.controlsPaused)) { clear(); touchController.clear(); }
    });
    const down = (event: KeyboardEvent) => {
      if (useGame.getState().controlsPaused) return;
      if (event.target instanceof HTMLElement) {
        if (event.target.closest('input, textarea, select, [contenteditable="true"]')) return;
        // Starting to drive leaves toolbar focus behind, so the next Space
        // brakes instead of activating the journal/help/reset button.
        if(drivingCodes.includes(event.code))event.target.closest('button')?.blur();
        // Preserve Space activation for focused buttons; driving keys still work after restart.
        if (event.code === 'Space' && event.target.closest('button')) return;
      }
      if (controlled.includes(event.code)) event.preventDefault();
      keys.current.add(event.code);
      if (event.code === 'KeyR' && !event.repeat) { clear(); useGame.getState().reset(); }
      if (event.code === 'KeyC' && !event.repeat && useGame.getState().transferPhase === 'stowed') useGame.getState().cycleCamera();
      if (event.code === 'KeyE' && !event.repeat) useGame.getState().requestTransfer();
    };
    const up = (event: KeyboardEvent) => { keys.current.delete(event.code); };
    const visibility = () => { if (document.hidden) clear(); };
    window.addEventListener('keydown', down); window.addEventListener('keyup', up);
    window.addEventListener('blur', clear); document.addEventListener('visibilitychange', visibility);
    return () => {
      unsubscribe(); clear(); window.removeEventListener('keydown', down); window.removeEventListener('keyup', up);
      window.removeEventListener('blur', clear); document.removeEventListener('visibilitychange', visibility);
    };
  }, []);
  return keys;
}
