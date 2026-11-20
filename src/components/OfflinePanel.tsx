import { useEffect, useRef, useState } from 'react';
import { usePwa } from '../pwa/register';
import { useGame } from '../stores/game';

const offlineLabels = {
  preparing: '正在下載離線遊戲，請先保持連線…',
  ready: '離線已就緒，可在沒有網路時重新開啟遊戲。',
  unavailable: '離線準備未完成，請連線後重新開啟。此功能需要 HTTPS 或 localhost，以及可用的瀏覽器儲存空間。',
  development: '目前為開發預覽；離線與安裝功能在正式建置中啟用。',
};

export function OfflinePanel({ onClose }: { onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const pwa = usePwa();
  const notice = useGame(s => s.saveNotice), savedAt = useGame(s => s.lastSavedAt);
  const [message, setMessage] = useState('');
  const [installing, setInstalling] = useState(false);
  useEffect(() => {
    window.dispatchEvent(new Event('blur'));
    useGame.getState().flushProgress();
    const modal = dialog.current;
    modal?.showModal();
    return () => modal?.close();
  }, []);
  const install = async () => {
    if (!pwa.installPrompt || installing) return;
    setInstalling(true);
    try {
      await pwa.installPrompt.prompt();
      const choice = await pwa.installPrompt.userChoice;
      setMessage(choice.outcome === 'accepted' ? '已送出安裝要求，請依瀏覽器提示完成。' : '已取消安裝，仍可在瀏覽器繼續玩。');
    } catch { setMessage('暫時無法開啟安裝提示，請使用瀏覽器選單加入主畫面。'); }
    finally { usePwa.setState({ installPrompt: null }); setInstalling(false); }
  };
  const fullscreen = async () => {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await document.documentElement.requestFullscreen();
    } catch { setMessage('瀏覽器未能開啟全螢幕，可改由主畫面圖示啟動遊戲。'); }
  };
  return <dialog className="offline-panel" ref={dialog} aria-labelledby="offline-title" onCancel={event => { event.preventDefault(); onClose(); }}>
    <div className="offline-heading"><h2 id="offline-title">安裝與離線遊玩</h2><button type="button" onClick={onClose} aria-label="關閉安裝與離線">關閉</button></div>
    <section aria-labelledby="offline-availability"><h3 id="offline-availability">{pwa.online ? '目前已連線' : '目前離線'}</h3>
      <p role="status" data-pwa-status={pwa.status}>{offlineLabels[pwa.status]}</p>
      {pwa.updateWaiting && <p>新版已下載。結束遊玩並關閉所有遊戲視窗後，下次開啟會套用更新。</p>}
    </section>
    <section><h3>加到主畫面</h3>
      {pwa.installed ? <p>目前已在應用程式模式中遊玩。</p> : <>
        {pwa.installPrompt && <button type="button" className="offline-primary" disabled={installing} onClick={() => void install()}>{installing ? '正在開啟安裝提示…' : '安裝樂活狂飆'}</button>}
        <p>iPhone／iPad：在 Safari 按「分享」，選「加入主畫面」。<br/>Android／桌機：在瀏覽器選單選「安裝應用程式」或「加入主畫面」（依瀏覽器支援而定）。</p>
        <p>從主畫面啟動時會優先使用全螢幕；部分裝置以獨立視窗顯示。</p>
      </>}
      {document.fullscreenEnabled && <button type="button" onClick={() => void fullscreen()}>切換全螢幕</button>}
    </section>
    <section><h3>進度保存在這台裝置</h3>
      <p data-save-status={notice ? 'notice' : savedAt === null ? 'pending' : 'saved'} role="status">{notice || (savedAt === null ? '開始遊玩後會自動儲存旅程。' : `旅程已儲存 · ${new Date(savedAt).toLocaleTimeString('zh-TW')}`)}</p>
      <p>免登入，自動保存五站進度、車輛位置、探索日記與畫質。重新開啟時，車輛會停穩，乘客與平台會收妥。</p>
      <p>「重新開始旅程」會重置五站進度與車輛，保留探索日記。資料僅保存在目前瀏覽器，不會跨裝置同步；清除網站資料或使用私密瀏覽可能使進度消失。</p>
    </section>
    {message && <p role="status">{message}</p>}
  </dialog>;
}
