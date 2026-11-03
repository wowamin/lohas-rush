import { useEffect, useState } from 'react';
import { useGame } from '../stores/game';
import { touchController, type TouchAction } from './vehicle/touchController';

const controls: { action: TouchAction; label: string; symbol: string }[] = [
  { action: 'left', label: '左轉', symbol: '◀' },
  { action: 'right', label: '右轉', symbol: '▶' },
  { action: 'reverse', label: '倒車', symbol: '倒車' },
  { action: 'brake', label: '煞車', symbol: '煞車' },
  { action: 'gas', label: '油門', symbol: '油門' },
];

export function TouchControls() {
  const resetKey = useGame(s => s.resetKey);
  const [pressed, setPressed] = useState<Record<number, TouchAction>>({});
  useEffect(() => {
    const clear = () => { touchController.clear(); setPressed({}); };
    const visibility = () => { if (document.hidden) clear(); };
    const query = window.matchMedia('(any-pointer: coarse), (max-width: 850px)');
    const modeChanged = () => { if (!query.matches) clear(); };
    window.addEventListener('blur', clear);
    document.addEventListener('visibilitychange', visibility);
    query.addEventListener('change', modeChanged);
    clear();
    return () => {
      touchController.clear();
      window.removeEventListener('blur', clear);
      document.removeEventListener('visibilitychange', visibility);
      query.removeEventListener('change', modeChanged);
    };
  }, [resetKey]);

  const release = (pointerId: number) => {
    touchController.release(pointerId);
    setPressed(previous => {
      const next = { ...previous }; delete next[pointerId]; return next;
    });
  };
  return <section className="touch-controls" aria-label="觸控駕駛">
    <p>按住油門前進・倒車後退・左右轉向</p>
    <div className="touch-buttons">{controls.map(({ action, label, symbol }, index) =>
      <button key={action} type="button" className={`touch-button touch-${action}`}
        aria-label={label} aria-pressed={Object.values(pressed).includes(action)}
        onContextMenu={event => event.preventDefault()}
        onPointerDown={event => {
          if (event.button !== 0) return;
          event.preventDefault();
          event.currentTarget.setPointerCapture(event.pointerId);
          touchController.press(event.pointerId, action);
          setPressed(previous => ({ ...previous, [event.pointerId]: action }));
        }}
        onPointerUp={event => release(event.pointerId)}
        onPointerCancel={event => release(event.pointerId)}
        onLostPointerCapture={event => release(event.pointerId)}
        onKeyDown={event => {
          if (event.code !== 'Space' && event.code !== 'Enter') return;
          event.preventDefault();
          const id = -index - 1;
          touchController.press(id, action);
          setPressed(previous => ({ ...previous, [id]: action }));
        }}
        onKeyUp={event => {
          if (event.code === 'Space' || event.code === 'Enter') { event.preventDefault(); release(-index - 1); }
        }}
        onBlur={() => release(-index - 1)}
      ><span aria-hidden="true">{symbol}</span>{index < 2 && <small>{label}</small>}</button>
    )}</div>
  </section>;
}
