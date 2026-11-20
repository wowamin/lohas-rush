import { useEffect, useRef, useState } from 'react';

const query = '(any-pointer: coarse) and (orientation: portrait)';
export function useOrientationAdvice() {
  const [portrait, setPortrait] = useState(() => window.matchMedia(query).matches);
  const [dismissed, setDismissed] = useState(false);
  useEffect(() => {
    const media = window.matchMedia(query);
    const update = () => { setPortrait(media.matches); if (!media.matches) setDismissed(false); };
    update(); media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);
  return { recommended: portrait && !dismissed, dismiss: () => setDismissed(true) };
}

export function OrientationNotice({ onContinue }: { onContinue: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    window.dispatchEvent(new Event('blur'));
    const modal = dialog.current; modal?.showModal();
    return () => modal?.close();
  }, []);
  return <dialog ref={dialog} className="orientation-notice" aria-labelledby="orientation-title" aria-describedby="orientation-description"
    onCancel={event => { event.preventDefault(); onContinue(); }}>
    <div className="rotate-phone" aria-hidden="true"><span /><b>↻</b></div>
    <h2 id="orientation-title">請旋轉手機</h2>
    <p id="orientation-description">建議橫向遊玩，視野更寬、駕駛更舒適。<br/>左側轉向，右側油門、煞車與倒車。</p>
    <p>轉成橫向後，介面會自動重新排版，也會收起這則提示。</p>
    <button type="button" onClick={onContinue} autoFocus>繼續直向遊玩</button>
    <small>也可以保持直向；操作說明可隨時重看。</small>
  </dialog>;
}
