import { useEffect, useRef, useState } from 'react';
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
  const outside=useGame(s=>s.transferPhase==='outside');
  const resetKey = useGame(s => s.resetKey);
  const [pressed, setPressed] = useState<Record<number, TouchAction>>({});
  const [joystick, setJoystick] = useState<{ pointerId: number; x: number } | null>(null);
  const joystickRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    const clear = () => { touchController.clear(); setPressed({}); setJoystick(null); };
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
  }, [resetKey,outside]);

  const release = (pointerId: number) => {
    touchController.release(pointerId);
    setPressed(previous => {
      const next = { ...previous }; delete next[pointerId]; return next;
    });
    setJoystick(current => current?.pointerId === pointerId ? null : current);
  };
  const steerJoystick = (pointerId: number, clientX: number) => {
    const bounds = joystickRef.current?.getBoundingClientRect();
    if (!bounds) return;
    const radius = bounds.width / 2 - 20;
    const offset = Math.max(-radius, Math.min(radius, clientX - (bounds.left + bounds.width / 2)));
    const value = offset / radius;
    touchController.setSteering(pointerId, Math.abs(value) < 0.12 ? 0 : value);
    setJoystick({ pointerId, x: offset });
  };
  return <section className="touch-controls" aria-label={outside ? '輪椅操作' : '觸控駕駛'}>
    <p>{outside ? '奶奶輪椅：前進／後退・左右轉向・停下' : '按住油門前進・倒車後退・左右轉向'}</p>
    <div className="touch-buttons">
      <button ref={joystickRef} type="button" className="touch-joystick" aria-label="虛擬搖桿：拖曳控制方向" aria-pressed={joystick !== null}
        onContextMenu={event => event.preventDefault()}
        onPointerDown={event => {
          if (event.button !== 0) return;
          event.preventDefault();
          event.currentTarget.setPointerCapture(event.pointerId);
          steerJoystick(event.pointerId, event.clientX);
        }}
        onPointerMove={event => { if (joystick?.pointerId === event.pointerId) steerJoystick(event.pointerId, event.clientX); }}
        onPointerUp={event => release(event.pointerId)}
        onPointerCancel={event => release(event.pointerId)}
        onLostPointerCapture={event => release(event.pointerId)}
        onKeyDown={event => {
          if (event.code !== 'ArrowLeft' && event.code !== 'ArrowRight') return;
          event.preventDefault();
          touchController.setSteering(-100, event.code === 'ArrowLeft' ? -1 : 1);
        }}
        onKeyUp={event => {
          if (event.code === 'ArrowLeft' || event.code === 'ArrowRight') { event.preventDefault(); touchController.release(-100); }
        }}
        onBlur={() => touchController.release(-100)}
      ><span className="joystick-thumb" style={{ transform: `translateX(${joystick?.x ?? 0}px)` }} /><span className="sr-only">方向搖桿</span></button>
      {controls.map(({ action, label, symbol }, index) =>
      <button key={action} type="button" className={`touch-button touch-${action}`}
        aria-label={outside ? action==='gas' ? '前進' : action==='reverse' ? '後退' : action==='brake' ? '停下' : label : label} aria-pressed={Object.values(pressed).includes(action)}
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
      ><span aria-hidden="true">{outside ? action==='gas' ? '前進' : action==='reverse' ? '後退' : action==='brake' ? '停下' : symbol : symbol}</span>{index < 2 && <small>{label}</small>}</button>
    )}
    </div>
  </section>;
}
