import { useEffect, useRef } from 'react';
import { useGame } from '../../stores/game';
const controlled = ['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space', 'KeyR', 'KeyC'];
export function useDrivingInput(resetKey: number) {
  const keys = useRef(new Set<string>());
  useEffect(() => { keys.current.clear(); }, [resetKey]);
  useEffect(() => {
    const clear = () => keys.current.clear();
    const down = (event: KeyboardEvent) => {
      if (event.target instanceof HTMLElement) {
        if (event.target.closest('input, textarea, select, [contenteditable="true"]')) return;
        // Preserve Space activation for focused buttons; driving keys still work after restart.
        if (event.code === 'Space' && event.target.closest('button')) return;
      }
      if (controlled.includes(event.code)) event.preventDefault();
      keys.current.add(event.code);
      if (event.code === 'KeyR' && !event.repeat) { clear(); useGame.getState().reset(); }
      if (event.code === 'KeyC' && !event.repeat) useGame.getState().cycleCamera();
    };
    const up = (event: KeyboardEvent) => { keys.current.delete(event.code); };
    const visibility = () => { if (document.hidden) clear(); };
    window.addEventListener('keydown', down); window.addEventListener('keyup', up);
    window.addEventListener('blur', clear); document.addEventListener('visibilitychange', visibility);
    return () => {
      clear(); window.removeEventListener('keydown', down); window.removeEventListener('keyup', up);
      window.removeEventListener('blur', clear); document.removeEventListener('visibilitychange', visibility);
    };
  }, []);
  return keys;
}
