import { create } from 'zustand';

type InstallPrompt = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }> };
type PwaState = {
  status: 'preparing' | 'ready' | 'unavailable' | 'development';
  online: boolean; installed: boolean; installPrompt: InstallPrompt | null; updateWaiting: boolean;
};
export const usePwa = create<PwaState>(() => ({
  status: import.meta.env.PROD ? 'preparing' : 'development', online: navigator.onLine,
  installed: matchMedia('(display-mode: standalone), (display-mode: fullscreen)').matches,
  installPrompt: null, updateWaiting: false,
}));

export function registerPwa() {
  window.addEventListener('online', () => usePwa.setState({ online: true }));
  window.addEventListener('offline', () => usePwa.setState({ online: false }));
  window.addEventListener('beforeinstallprompt', event => {
    event.preventDefault(); usePwa.setState({ installPrompt: event as InstallPrompt });
  });
  window.addEventListener('appinstalled', () => usePwa.setState({ installed: true, installPrompt: null }));
  if (!import.meta.env.PROD) return;
  if (!('serviceWorker' in navigator) || !window.isSecureContext) {
    usePwa.setState({ status: 'unavailable' }); return;
  }
  const base = new URL(import.meta.env.BASE_URL, document.baseURI);
  void navigator.serviceWorker.register(new URL('sw.js', base), { scope: base.pathname, updateViaCache: 'none' }).then(registration => {
    const observe = () => {
      if (registration.active) usePwa.setState({ status: 'ready' });
      if (registration.waiting) usePwa.setState({ updateWaiting: true });
      const worker = registration.installing;
      worker?.addEventListener('statechange', () => {
        if (worker.state === 'activated') usePwa.setState({ status: 'ready' });
        if (worker.state === 'installed' && registration.active) usePwa.setState({ updateWaiting: true });
        if (worker.state === 'redundant' && !registration.active) usePwa.setState({ status: 'unavailable' });
      });
    };
    observe(); registration.addEventListener('updatefound', observe);
  }).catch(() => usePwa.setState({ status: 'unavailable' }));
}
